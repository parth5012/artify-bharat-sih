"""
backend/tests/test_zero_trust_jury.py
Covers 2/3 quorum consensus, Redis velocity anomaly guard, anti-collusion
guard, buyer anti-fraud report escalation, and stale-juror reassignment.
Shared with Yash per the spec (Task 3.9).
"""
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import update

from app.models.artisan import Artisan
from app.models.jury import JuryTicket
from app.models.product import Product

pytestmark = pytest.mark.asyncio


async def _make_verified_artisan(db_session, suffix: str, cluster="Varanasi Handloom Cluster"):
    artisan = Artisan(
        name=f"Juror {suffix}",
        phone=f"+9198765{suffix}",
        pin_hash="x",
        primary_dialect="bhojpuri",
        cluster_name=cluster,
        is_verified=True,
    )
    db_session.add(artisan)
    await db_session.commit()
    await db_session.refresh(artisan)
    return artisan


async def _make_product(db_session, artisan_id: str):
    product = Product(artisan_id=artisan_id, title="Handloom Saree")
    db_session.add(product)
    await db_session.commit()
    await db_session.refresh(product)
    return product


async def _setup_cluster(db_session, n_jurors=4):
    owner = await _make_verified_artisan(db_session, "00001")
    product = await _make_product(db_session, owner.id)
    jurors = [
        await _make_verified_artisan(db_session, f"0{i:04d}") for i in range(2, 2 + n_jurors)
    ]
    return owner, product, jurors


async def test_jury_assign_picks_3_jurors_excluding_owner(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session)

    resp = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["assigned_juror_ids"]) == 3
    assert owner.id not in body["assigned_juror_ids"]


async def test_jury_assign_fails_with_insufficient_pool(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session, n_jurors=1)
    resp = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    assert resp.status_code == 409


async def test_quorum_2_of_3_genuine_resolves_ticket(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session)
    assign = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    ticket_id = assign.json()["jury_ticket_id"]
    juror_ids = assign.json()["assigned_juror_ids"]

    for i in range(2):  # 2/3 is enough for quorum
        resp = await client.post(
            "/api/v1/verify/jury/vote",
            json={
                "jury_ticket_id": ticket_id,
                "juror_id": juror_ids[i],
                "vote": "GENUINE_HANDMADE",
                "craft_score": 5,
                "digital_signature": f"sig_{i}",
            },
        )
        assert resp.status_code == 200

    status_resp = await client.get(f"/api/v1/verify/jury/status/{ticket_id}")
    body = status_resp.json()
    assert body["status"] == "QUORUM_GENUINE"
    assert body["quorum_verdict"] == "GENUINE_HANDMADE"


async def test_juror_cannot_vote_twice(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session)
    assign = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    ticket_id = assign.json()["jury_ticket_id"]
    juror_id = assign.json()["assigned_juror_ids"][0]

    vote_payload = {
        "jury_ticket_id": ticket_id,
        "juror_id": juror_id,
        "vote": "GENUINE_HANDMADE",
        "craft_score": 4,
        "digital_signature": "sig_a",
    }
    first = await client.post("/api/v1/verify/jury/vote", json=vote_payload)
    assert first.status_code == 200
    second = await client.post("/api/v1/verify/jury/vote", json=vote_payload)
    assert second.status_code == 409  # anti-collusion: no double voting


async def test_unassigned_juror_cannot_vote(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session)
    assign = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    ticket_id = assign.json()["jury_ticket_id"]

    outsider = await _make_verified_artisan(db_session, "09999")
    resp = await client.post(
        "/api/v1/verify/jury/vote",
        json={
            "jury_ticket_id": ticket_id,
            "juror_id": outsider.id,
            "vote": "GENUINE_HANDMADE",
            "craft_score": 5,
            "digital_signature": "sig_outsider",
        },
    )
    assert resp.status_code == 403


async def test_velocity_anomaly_flags_after_threshold(client, db_session):
    """Redis velocity guard: >20 approvals/hour for a single juror trips
    FLAGGED_VELOCITY_ANOMALY, regardless of quorum math."""
    owner, product, jurors = await _setup_cluster(db_session, n_jurors=25)
    hot_juror = jurors[0]

    last_ticket_id = None
    for i in range(21):
        p = await _make_product(db_session, owner.id)
        # Force-assign hot_juror by monkey-patching pool via direct ticket insert
        ticket = JuryTicket(
            product_id=p.id,
            status="IN_PROGRESS",
            assigned_juror_ids=f"{hot_juror.id},{jurors[1].id},{jurors[2].id}",
        )
        db_session.add(ticket)
        await db_session.commit()
        await db_session.refresh(ticket)
        last_ticket_id = ticket.id

        resp = await client.post(
            "/api/v1/verify/jury/vote",
            json={
                "jury_ticket_id": ticket.id,
                "juror_id": hot_juror.id,
                "vote": "GENUINE_HANDMADE",
                "craft_score": 5,
                "digital_signature": f"sig_{i}",
            },
        )
        assert resp.status_code == 200

    status_resp = await client.get(f"/api/v1/verify/jury/status/{last_ticket_id}")
    assert status_resp.json()["status"] == "FLAGGED_VELOCITY_ANOMALY"


async def test_report_fake_escalates_to_dm_queue(client, db_session):
    owner, product, jurors = await _setup_cluster(db_session)
    resp = await client.post(
        "/api/v1/verify/report-fake",
        json={"product_id": product.id, "reason": "Looks factory-stamped, not handmade"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "ESCALATED_TO_DM"
    assert "MoSJE" in body["escalated_to"]


async def test_stale_juror_reassignment(client, db_session):
    from app.services.verify_jury_service import reassign_stale_jurors

    owner, product, jurors = await _setup_cluster(db_session, n_jurors=5)
    assign = await client.post("/api/v1/verify/jury/assign", json={"product_id": product.id})
    ticket_id = assign.json()["jury_ticket_id"]

    # Simulate the ticket having been created >24h ago
    await db_session.execute(
        update(JuryTicket)
        .where(JuryTicket.id == ticket_id)
        .values(created_at=datetime.now(timezone.utc) - timedelta(hours=25))
    )
    await db_session.commit()

    updated = await reassign_stale_jurors(db_session, ticket_id)
    assert updated.reassigned_from is not None
    assert len(updated.assigned_juror_ids.split(",")) == 3
