"""
verify_jury_service.py — Zero-Trust Peer Review Jury (Tasks 3.5-3.8).

Implements the 4 anti-corruption pillars:
  1. Randomized Peer Jury      — 3 anonymized district SHG leaders, 2/3 quorum
  2. Anomaly Velocity Check    — Redis counter flags rubber-stamping (>20/hr)
  3. Skin-in-the-Game Log      — juror signature permanently linked to e-KYC
  4. Post-Market Audit         — buyer "Report Fake" triggers DM physical audit
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models._shared import new_id
from app.models.artisan import Artisan
from app.models.jury import AntiFraudReport, JuryTicket, JuryVote
from app.models.product import Product


class JuryError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


# ---- 3.5 Randomized juror assignment ----------------------------------------

async def assign_jury(db: AsyncSession, product_id: str) -> JuryTicket:
    product = await db.get(Product, product_id)
    if product is None:
        raise JuryError("Product not found", 404)

    artisan = await db.get(Artisan, product.artisan_id)
    if artisan is None:
        raise JuryError("Owning artisan not found", 404)

    pool = await _eligible_juror_pool(db, exclude_artisan_id=artisan.id, cluster=artisan.cluster_name)
    if len(pool) < settings.JURY_QUORUM_SIZE:
        raise JuryError(
            f"Not enough eligible jurors in cluster pool "
            f"(need {settings.JURY_QUORUM_SIZE}, have {len(pool)})",
            409,
        )

    jurors = random.sample(pool, settings.JURY_QUORUM_SIZE)
    ticket = JuryTicket(
        id=new_id("jury"),
        product_id=product_id,
        status="IN_PROGRESS",
        assigned_juror_ids=",".join(j.id for j in jurors),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def _eligible_juror_pool(
    db: AsyncSession, exclude_artisan_id: str, cluster: str | None
) -> list[Artisan]:
    """Anti-Collusion Guard: self-review forbidden; jurors drawn from adjacent
    villages in the same cluster where possible, otherwise the wider verified pool."""
    stmt = select(Artisan).where(
        Artisan.is_verified.is_(True),
        Artisan.id != exclude_artisan_id,
        Artisan.welfare_access_frozen.is_(False),
    )
    if cluster:
        stmt = stmt.where(Artisan.cluster_name == cluster)
    result = await db.execute(stmt)
    pool = list(result.scalars().all())
    if len(pool) < settings.JURY_QUORUM_SIZE:
        # widen to all verified, non-frozen artisans outside the exact cluster
        result = await db.execute(
            select(Artisan).where(
                Artisan.is_verified.is_(True),
                Artisan.id != exclude_artisan_id,
                Artisan.welfare_access_frozen.is_(False),
            )
        )
        pool = list(result.scalars().all())
    return pool


# ---- 3.7 Redis velocity anti-bribery guard ----------------------------------

async def check_and_bump_velocity(redis: Redis, juror_id: str) -> tuple[int, bool]:
    """Increments the juror's rolling 1-hour approval counter and returns
    (current_count, is_anomalous). Anomalous if > JURY_VELOCITY_LIMIT_PER_HOUR."""
    key = f"jury:velocity:{juror_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 3600)
    return count, count > settings.JURY_VELOCITY_LIMIT_PER_HOUR


# ---- 3.6 Vote submission + 2/3 quorum consensus -----------------------------

async def submit_vote(
    db: AsyncSession,
    redis: Redis,
    jury_ticket_id: str,
    juror_id: str,
    vote: str,
    craft_score: int,
    digital_signature: str,
) -> JuryTicket:
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError("Jury ticket not found", 404)
    if ticket.status not in ("PENDING", "IN_PROGRESS"):
        raise JuryError(f"Jury ticket already resolved with status {ticket.status}", 409)

    assigned = ticket.assigned_juror_ids.split(",")
    if juror_id not in assigned:
        raise JuryError("Juror is not assigned to this ticket (anti-collusion guard)", 403)

    existing = await db.execute(
        select(JuryVote).where(
            JuryVote.jury_ticket_id == jury_ticket_id, JuryVote.juror_id == juror_id
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise JuryError("Juror has already voted on this ticket", 409)

    # Skin-in-the-Game: signature permanently linked to e-KYC identity via juror_id FK
    db.add(
        JuryVote(
            jury_ticket_id=jury_ticket_id,
            juror_id=juror_id,
            vote=vote,
            craft_score=craft_score,
            digital_signature=digital_signature,
        )
    )
    await db.commit()

    # Anomaly Velocity Check — evaluated per vote, independent of quorum outcome
    _, is_anomalous = await check_and_bump_velocity(redis, juror_id)
    if is_anomalous:
        ticket.status = "FLAGGED_VELOCITY_ANOMALY"
        ticket.anomaly_score = 1.0
        await db.commit()
        await db.refresh(ticket)
        return ticket

    votes_result = await db.execute(
        select(JuryVote).where(JuryVote.jury_ticket_id == jury_ticket_id)
    )
    votes = list(votes_result.scalars().all())

    genuine_votes = sum(1 for v in votes if v.vote == "GENUINE_HANDMADE")
    suspected_votes = sum(1 for v in votes if v.vote == "SUSPECTED_MACHINE_MADE")

    if genuine_votes >= settings.JURY_QUORUM_THRESHOLD:
        ticket.status = "QUORUM_GENUINE"
        ticket.quorum_verdict = "GENUINE_HANDMADE"
    elif suspected_votes >= settings.JURY_QUORUM_THRESHOLD:
        ticket.status = "QUORUM_SUSPECTED"
        ticket.quorum_verdict = "SUSPECTED_MACHINE_MADE"
    else:
        ticket.status = "IN_PROGRESS"

    if votes:
        ticket.average_craft_score = sum(v.craft_score for v in votes) / len(votes)
        ticket.anomaly_score = round(min(len(votes), 3) / max(settings.JURY_VELOCITY_LIMIT_PER_HOUR, 1), 4)

    if ticket.status in ("QUORUM_GENUINE", "QUORUM_SUSPECTED"):
        product = await db.get(Product, ticket.product_id)
        if product is not None:
            product.verification_status = ticket.status

    await db.commit()
    await db.refresh(ticket)
    return ticket


async def get_jury_status(db: AsyncSession, jury_ticket_id: str) -> tuple[JuryTicket, int]:
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError("Jury ticket not found", 404)
    votes_result = await db.execute(
        select(JuryVote).where(JuryVote.jury_ticket_id == jury_ticket_id)
    )
    votes_count = len(list(votes_result.scalars().all()))
    return ticket, votes_count


# ---- Fault tolerance: stale-juror auto-reassignment -------------------------

async def reassign_stale_jurors(db: AsyncSession, jury_ticket_id: str) -> JuryTicket:
    """Auto-Reassignment Engine: replaces jurors inactive >24h with an active
    alternate from the cluster pool (Section 4.5)."""
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError("Jury ticket not found", 404)
    if ticket.status not in ("PENDING", "IN_PROGRESS"):
        return ticket

    stale_cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.JURY_STALE_HOURS)
    if ticket.created_at.replace(tzinfo=timezone.utc) > stale_cutoff:
        return ticket  # not stale yet

    votes_result = await db.execute(
        select(JuryVote.juror_id).where(JuryVote.jury_ticket_id == jury_ticket_id)
    )
    voted_ids = {row[0] for row in votes_result.all()}
    assigned = ticket.assigned_juror_ids.split(",")
    stalled = [j for j in assigned if j not in voted_ids]
    if not stalled:
        return ticket

    product = await db.get(Product, ticket.product_id)
    artisan = await db.get(Artisan, product.artisan_id) if product else None
    pool = await _eligible_juror_pool(
        db, exclude_artisan_id=artisan.id if artisan else "", cluster=artisan.cluster_name if artisan else None
    )
    candidates = [a for a in pool if a.id not in assigned]
    replaced_log = []
    new_assigned = list(assigned)
    for stalled_juror_id in stalled:
        if not candidates:
            break
        replacement = candidates.pop(random.randrange(len(candidates)))
        new_assigned[new_assigned.index(stalled_juror_id)] = replacement.id
        replaced_log.append(f"{stalled_juror_id}->{replacement.id}")

    ticket.assigned_juror_ids = ",".join(new_assigned)
    prior = f"{ticket.reassigned_from},{';'.join(replaced_log)}" if ticket.reassigned_from else ";".join(replaced_log)
    ticket.reassigned_from = prior
    await db.commit()
    await db.refresh(ticket)
    return ticket


# ---- 3.8 / 4.4 Buyer anti-fraud report ---------------------------------------

async def report_fake(
    db: AsyncSession, product_id: str, reason: str, evidence_photo_ref: str | None
) -> AntiFraudReport:
    product = await db.get(Product, product_id)
    if product is None:
        raise JuryError("Product not found", 404)

    latest_ticket_result = await db.execute(
        select(JuryTicket)
        .where(JuryTicket.product_id == product_id)
        .order_by(JuryTicket.created_at.desc())
        .limit(1)
    )
    latest_ticket = latest_ticket_result.scalar_one_or_none()

    report = AntiFraudReport(
        product_id=product_id,
        jury_ticket_id=latest_ticket.id if latest_ticket else None,
        reason=reason,
        evidence_photo_ref=evidence_photo_ref,
        status="ESCALATED_TO_DM",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def apply_collusion_penalty(db: AsyncSession, jury_ticket_id: str) -> None:
    """If a DM physical audit confirms collusion: slash Trust Score and freeze
    welfare access for every juror who approved the reported item (Section 4.4)."""
    ticket = await db.get(JuryTicket, jury_ticket_id)
    if ticket is None:
        raise JuryError("Jury ticket not found", 404)
    votes_result = await db.execute(
        select(JuryVote).where(
            JuryVote.jury_ticket_id == jury_ticket_id,
            JuryVote.vote == "GENUINE_HANDMADE",
        )
    )
    for vote in votes_result.scalars().all():
        juror = await db.get(Artisan, vote.juror_id)
        if juror:
            juror.trust_score = max(0.0, juror.trust_score - 0.5)
            juror.welfare_access_frozen = True
    await db.commit()
