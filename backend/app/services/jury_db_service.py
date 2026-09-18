"""DB-backed Zero-Trust Peer Jury service (Wayfinder #100).

Canonical persistence source for /api/v1/verify/*.
Replaces the in-memory VerifyJuryService singleton (kept only for legacy
unit tests) so jury tickets, votes, and Report Fake incidents survive
process restarts.

Tables: JuryTicket / JuryVote / AntiFraudReport (app.models.jury).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artisan import Artisan
from app.models.jury import AntiFraudReport, JuryTicket, JuryVote
from app.models.passport import HeritagePassport
from app.models.product import Product


class JuryError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


# Juror pool per craft cluster (mirrors legacy in-memory pool; juror ids are
# provisioned as stub Artisan rows on demand so the JuryVote FK holds).
CLUSTER_JUROR_POOL: dict[str, list[dict[str, str]]] = {
    "Varanasi Handloom Cluster": [
        {"id": "juror_vns_01", "shg_id": "shg_vns_01"},
        {"id": "juror_vns_02", "shg_id": "shg_vns_02"},
        {"id": "juror_vns_03", "shg_id": "shg_vns_03"},
        {"id": "juror_vns_04", "shg_id": "shg_vns_04"},
        {"id": "juror_vns_05", "shg_id": "shg_vns_05"},
    ],
    "Madhubani Art Cluster": [
        {"id": "juror_mdb_01", "shg_id": "shg_mdb_01"},
        {"id": "juror_mdb_02", "shg_id": "shg_mdb_02"},
        {"id": "juror_mdb_03", "shg_id": "shg_mdb_03"},
    ],
    "Kashmir Pashmina Cluster": [
        {"id": "juror_ksh_01", "shg_id": "shg_ksh_01"},
        {"id": "juror_ksh_02", "shg_id": "shg_ksh_02"},
        {"id": "juror_ksh_03", "shg_id": "shg_ksh_03"},
    ],
    "Kutch Embroidery Cluster": [
        {"id": "juror_ktc_01", "shg_id": "shg_ktc_01"},
        {"id": "juror_ktc_02", "shg_id": "shg_ktc_02"},
        {"id": "juror_ktc_03", "shg_id": "shg_ktc_03"},
    ],
}

_FALLBACK_JURORS = ["juror_master_01", "juror_master_02", "juror_master_03"]
_QUORUM_THRESHOLD = 2
_VELOCITY_LIMIT_PER_HOUR = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _ensure_artisan(db: AsyncSession, artisan_id: str) -> Artisan:
    artisan = await db.get(Artisan, artisan_id)
    if artisan is None:
        artisan = Artisan(
            id=artisan_id,
            name=artisan_id,
            phone=f"+91000000{abs(hash(artisan_id)) % 10_000_000:07d}",
            pin_hash="stub",
        )
        db.add(artisan)
        await db.flush()
    return artisan


async def _ensure_product(
    db: AsyncSession, product_id: str, artisan_id: Optional[str] = None
) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        owner_id = artisan_id or "artisan_system_stub"
        await _ensure_artisan(db, owner_id)
        product = Product(
            id=product_id,
            artisan_id=owner_id,
            title=product_id,
            status="cataloged",
        )
        db.add(product)
        await db.flush()
    return product


async def resolve_product_id(
    db: AsyncSession,
    shortcode_or_hash: Optional[str] = None,
    product_id: Optional[str] = None,
) -> Optional[str]:
    """Resolve a shortcode / SHA-256 hash / product id to a products.id."""
    if shortcode_or_hash:
        key = shortcode_or_hash.strip()
        passport = (
            await db.execute(
                select(HeritagePassport).where(
                    (HeritagePassport.shortcode == key)
                    | (HeritagePassport.passport_hash == key)
                )
            )
        ).scalar_one_or_none()
        if passport is not None:
            return passport.product_id
    if product_id:
        product = await db.get(Product, product_id)
        if product is not None:
            return product.id
        # product_id may itself be a shortcode/hash the caller passed directly
        passport = (
            await db.execute(
                select(HeritagePassport).where(
                    (HeritagePassport.shortcode == product_id)
                    | (HeritagePassport.passport_hash == product_id)
                )
            )
        ).scalar_one_or_none()
        if passport is not None:
            return passport.product_id
    return None


def _pick_jurors(
    cluster_id: str,
    artisan_id: Optional[str] = None,
    shg_id: Optional[str] = None,
) -> list[str]:
    pool = CLUSTER_JUROR_POOL.get(cluster_id or "", [])
    eligible = [
        j
        for j in pool
        if j["id"] != artisan_id and (not shg_id or j.get("shg_id") != shg_id)
    ]
    if len(eligible) >= 3:
        return [j["id"] for j in secrets.SystemRandom().sample(eligible, 3)]
    if len(pool) >= 3:
        return [j["id"] for j in pool[:3]]
    return list(_FALLBACK_JURORS)


async def _velocity_count(
    db: AsyncSession, redis: Any, juror_id: str
) -> tuple[int, bool]:
    """Votes cast by juror in the last hour. Returns (count, velocity_flag)."""
    if redis is not None:
        try:
            key = f"jury:velocity:{juror_id}"
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, 3600)
            ttl = await redis.ttl(key)
            if ttl is not None and ttl < 0:
                await redis.expire(key, 3600)
            return int(count), int(count) > _VELOCITY_LIMIT_PER_HOUR
        except Exception:
            pass  # fall through to DB counting
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    count = (
        await db.execute(
            select(func.count(JuryVote.id)).where(
                JuryVote.juror_id == juror_id,
                JuryVote.created_at >= cutoff,
            )
        )
    ).scalar_one()
    return int(count or 0) + 1, int(count or 0) + 1 > _VELOCITY_LIMIT_PER_HOUR


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def assign_jury(
    db: AsyncSession,
    product_id: str,
    cluster_id: str = "Varanasi Handloom Cluster",
    craft_type: str = "Handloom Weaving",  # noqa: ARG001 (kept for contract parity)
    artisan_id: Optional[str] = None,
    shg_id: Optional[str] = None,
) -> JuryTicket:
    product = await _ensure_product(db, product_id, artisan_id)
    owner_id = artisan_id or product.artisan_id
    owner_shg: Optional[str] = shg_id
    if owner_shg is None and owner_id:
        owner = await db.get(Artisan, owner_id)
        owner_shg = owner.shg_group_name if owner else None

    juror_ids = _pick_jurors(
        cluster_id or "Varanasi Handloom Cluster", owner_id, owner_shg
    )
    for juror_id in juror_ids:
        await _ensure_artisan(db, juror_id)

    ticket = JuryTicket(
        product_id=product.id,
        status="IN_PROGRESS",
        assigned_juror_ids=",".join(juror_ids),
        anomaly_score=0.02,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def submit_vote(
    db: AsyncSession,
    redis: Any,
    jury_ticket_id: str,
    juror_id: str,
    vote: str,
    craft_score: int,
    digital_signature: str,
) -> JuryTicket:
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError(404, f"Jury ticket {jury_ticket_id} not found.")

    product = await db.get(Product, ticket.product_id)
    if product is not None and juror_id == product.artisan_id:
        raise JuryError(
            403,
            "Conflict of Interest: Artisans are strictly prohibited from "
            "evaluating their own crafts.",
        )

    await _ensure_artisan(db, juror_id)

    existing = (
        await db.execute(
            select(JuryVote).where(
                JuryVote.jury_ticket_id == ticket.id,
                JuryVote.juror_id == juror_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.vote = vote
        existing.craft_score = int(craft_score)
        existing.digital_signature = digital_signature
    else:
        db.add(
            JuryVote(
                jury_ticket_id=ticket.id,
                juror_id=juror_id,
                vote=vote,
                craft_score=int(craft_score),
                digital_signature=digital_signature,
            )
        )
    await db.flush()

    _, velocity_flag = await _velocity_count(db, redis, juror_id)

    votes = (
        (await db.execute(select(JuryVote).where(JuryVote.jury_ticket_id == ticket.id)))
        .scalars()
        .all()
    )
    votes_count = len(votes)
    avg_score = sum(v.craft_score for v in votes) / votes_count if votes_count else None
    genuine_count = sum(1 for v in votes if v.vote == "GENUINE_HANDMADE")

    ticket.average_craft_score = avg_score
    if velocity_flag:
        ticket.anomaly_score = 0.96
        ticket.status = "FLAGGED_VELOCITY_ANOMALY"
        ticket.quorum_verdict = "FLAGGED_VELOCITY_ANOMALY"
    elif votes_count >= _QUORUM_THRESHOLD:
        if genuine_count >= _QUORUM_THRESHOLD:
            ticket.status = "QUORUM_GENUINE"
            ticket.quorum_verdict = "VERIFIED_AUTHENTIC"
        else:
            ticket.status = "QUORUM_SUSPECTED"
            ticket.quorum_verdict = "REJECTED_COUNTERFEIT"
    else:
        ticket.status = "IN_PROGRESS"

    await db.commit()
    await db.refresh(ticket)
    return ticket


async def get_jury_status(
    db: AsyncSession, jury_ticket_id: str
) -> tuple[JuryTicket, int]:
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError(404, f"Jury ticket {jury_ticket_id} not found.")
    votes_count = (
        await db.execute(
            select(func.count(JuryVote.id)).where(JuryVote.jury_ticket_id == ticket.id)
        )
    ).scalar_one()
    return ticket, int(votes_count or 0)


async def report_fake(
    db: AsyncSession,
    product_id: Optional[str] = None,
    shortcode_or_hash: Optional[str] = None,
    reason: str = "Suspected counterfeit",
    reporter_phone: Optional[
        str
    ] = None,  # noqa: ARG001 (stored implicitly in reason thread)
    evidence_photo_ref: Optional[str] = None,
) -> AntiFraudReport:
    resolved = await resolve_product_id(db, shortcode_or_hash, product_id)
    if resolved is None:
        # Persist anyway: stub a product so the FK holds and the DM queue
        # entry is never lost (buyer may report a shortcode with no local row).
        fallback_id = (
            product_id
            or f"prod_report_{(shortcode_or_hash or 'unknown').replace('-', '').lower()[:12]}"
        )
        await _ensure_product(db, fallback_id)
        resolved = fallback_id

    report = AntiFraudReport(
        product_id=resolved,
        reason=reason[:200],
        evidence_photo_ref=evidence_photo_ref,
        status="ESCALATED_TO_DM",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def reassign_stale_juror(
    db: AsyncSession,
    jury_ticket_id: str,
    inactive_juror_id: str,
    cluster_id: str = "Varanasi Handloom Cluster",
) -> JuryTicket:
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError(404, f"Jury ticket {jury_ticket_id} not found.")

    already_voted = (
        await db.execute(
            select(func.count(JuryVote.id)).where(
                JuryVote.jury_ticket_id == ticket.id,
                JuryVote.juror_id == inactive_juror_id,
            )
        )
    ).scalar_one()
    if already_voted:
        return ticket

    assigned = [j for j in ticket.assigned_juror_ids.split(",") if j]
    pool = [j["id"] for j in CLUSTER_JUROR_POOL.get(cluster_id, [])]
    candidates = [j for j in pool if j not in assigned]
    swap_note = ticket.reassigned_from or ""
    if candidates:
        new_juror = secrets.SystemRandom().choice(candidates)
        await _ensure_artisan(db, new_juror)
        if inactive_juror_id in assigned:
            assigned[assigned.index(inactive_juror_id)] = new_juror
        else:
            assigned.append(new_juror)
        ticket.assigned_juror_ids = ",".join(assigned)
        ticket.reassigned_from = f"{swap_note};{inactive_juror_id}->{new_juror}".strip(
            ";"
        )
        await db.commit()
        await db.refresh(ticket)
    return ticket
