import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app


@pytest.mark.asyncio
async def test_peer_jury_assignment_and_voting_quorum(client: AsyncClient):
    # Step 1: Assign Peer Jury (DB-backed via client fixture)
    assign_payload = {
        "product_id": "prod_banarasi_881",
        "cluster_id": "Varanasi Handloom Cluster",
        "craft_type": "Handloom Silk Weaving",
    }
    res_assign = await client.post("/api/v1/verify/jury/assign", json=assign_payload)
    assert res_assign.status_code in (200, 201), res_assign.text
    data_assign = res_assign.json()
    ticket_id = data_assign["jury_ticket_id"]
    assert len(data_assign["assigned_jurors"]) >= 3
    assert data_assign["quorum_required"] == 2

    # Step 2: Juror 1 votes Authentic
    vote1_payload = {
        "jury_ticket_id": ticket_id,
        "juror_id": data_assign["assigned_jurors"][0],
        "verdict": "authentic",
        "craft_authenticity_score": 0.95,
        "comments": "Pure handloom silk weave confirmed",
    }
    res_vote1 = await client.post("/api/v1/verify/jury/vote", json=vote1_payload)
    assert res_vote1.status_code == 200, res_vote1.text
    data_vote1 = res_vote1.json()
    assert data_vote1["votes_received"] == 1
    assert data_vote1["quorum_reached"] is False

    # Step 3: Juror 2 votes Authentic (Reaching Quorum)
    vote2_payload = {
        "jury_ticket_id": ticket_id,
        "juror_id": data_assign["assigned_jurors"][1],
        "verdict": "authentic",
        "craft_authenticity_score": 0.98,
        "comments": "GI standards compliant.",
    }
    res_vote2 = await client.post("/api/v1/verify/jury/vote", json=vote2_payload)
    assert res_vote2.status_code == 200, res_vote2.text
    data_vote2 = res_vote2.json()
    assert data_vote2["votes_received"] == 2
    assert data_vote2["quorum_reached"] is True
    assert data_vote2["final_verdict"] == "VERIFIED_AUTHENTIC"
    assert data_vote2["consensus_level"] == "HIGH_CONFIDENCE"


@pytest.mark.asyncio
async def test_report_counterfeit_feedback_loop(client: AsyncClient):
    report_payload = {
        "shortcode_or_hash": "A7X-9B2",
        "reporter_phone": "+919876543210",
        "reason": "Machine-made fabric sold with fake GI tag",
    }
    res = await client.post("/api/v1/verify/report-fake", json=report_payload)
    assert res.status_code in (200, 201), res.text
    data = res.json()
    assert data["status"].lower() in ("audit_triggered", "escalated_to_dm")
    assert data["flagged_hash"] == "A7X-9B2"
    assert "Escalated" in (data.get("action_taken") or "")


@pytest.mark.asyncio
async def test_velocity_rubber_stamp_detection():
    from app.services.verify_jury_service import verify_jury_service

    juror_id_fast = "juror_fast_bot"

    # Pre-populate 20 votes across 20 different tickets for this fast juror
    for i in range(21):
        t = verify_jury_service.assign_jury(
            f"prod_fast_{i}", "Varanasi Handloom Cluster", "Silk Weaving"
        )
        res_fast = verify_jury_service.cast_vote(
            t["jury_ticket_id"], juror_id_fast, "authentic", 0.99
        )

    assert res_fast["velocity_flag"] is True

    # Now when a second juror also votes on the 21st ticket reaching quorum, the velocity flag triggers audit escalation
    target_ticket = t["jury_ticket_id"]
    res_final = verify_jury_service.cast_vote(
        target_ticket, "juror_vns_02", "authentic", 0.95
    )

    assert res_final["quorum_reached"] is True
    assert res_final["final_verdict"] == "FLAGGED_VELOCITY_ANOMALY"
    assert res_final["consensus_level"] == "SUSPECTED_RUBBER_STAMP"


@pytest.mark.asyncio
async def test_reassign_stale_juror():
    from app.services.verify_jury_service import verify_jury_service

    ticket = verify_jury_service.assign_jury(
        "prod_stale_1", "Varanasi Handloom Cluster", "Silk Weaving"
    )
    tid = ticket["jury_ticket_id"]
    old_juror = ticket["assigned_jurors"][0]

    # Simulate auto-reassignment of inactive juror
    updated = verify_jury_service.reassign_stale_juror(tid, old_juror)
    assert old_juror not in updated["assigned_jurors"]
    assert len(updated["assigned_jurors"]) >= 3
    assert "last_reassigned_at" in updated


def test_anti_collusion_self_review_and_shg_exclusion():
    from app.services.verify_jury_service import verify_jury_service

    # 1. Anti-collusion assignment exclusion:
    # Varanasi jurors: juror_vns_01 (shg_vns_01), juror_vns_02 (shg_vns_02), juror_vns_03 (shg_vns_03), juror_vns_04 (shg_vns_04), juror_vns_05 (shg_vns_05)
    ticket = verify_jury_service.assign_jury(
        product_id="prod_anti_collusion_01",
        cluster_id="Varanasi Handloom Cluster",
        craft_type="Silk Weaving",
        artisan_id="juror_vns_01",
        shg_id="shg_vns_02",
    )
    # Neither artisan juror_vns_01 nor same-SHG juror_vns_02 should be assigned
    for j_id in ticket["assigned_jurors"]:
        assert j_id != "juror_vns_01", "Artisan must not be assigned to their own jury"
        assert (
            j_id != "juror_vns_02"
        ), "Same-SHG peer must not be assigned to jury (collusion risk)"

    # 2. Self-review prohibition on vote casting
    with pytest.raises(ValueError, match="Conflict of Interest"):
        verify_jury_service.cast_vote(
            jury_ticket_id=ticket["jury_ticket_id"],
            juror_id="juror_vns_01",
            verdict="authentic",
            craft_authenticity_score=0.99,
        )


@pytest.mark.asyncio
async def test_report_fake_persists_across_restart(
    client: AsyncClient, db_session: AsyncSession
):
    """Wayfinder #100: Report Fake must persist in DB, not in-memory.

    Simulates a process restart by wiping the in-memory singleton, then
    asserts the report + jury ticket are still retrievable (DB source).
    Uses the frontend ReportFake contract (shortcode/reason/description/
    reporterContact) and asserts ticketId maps to report_id.
    """
    from sqlalchemy import select
    from app.models.jury import AntiFraudReport, JuryTicket
    from app.services.verify_jury_service import verify_jury_service

    # Frontend-style payload (verifyApi.ts contract)
    report_payload = {
        "shortcode": "A7X-9B2",
        "reason": "Machine-made",
        "description": "Powerloom repetition + synthetic sheen observed",
        "reporterContact": "+919876543210",
    }
    res = await client.post("/api/v1/verify/report-fake", json=report_payload)
    assert res.status_code in (200, 201), res.text
    data = res.json()
    # ticketId (frontend) maps to report_id (backend)
    ticket_id = data.get("ticketId") or data.get("report_id")
    assert ticket_id, data
    assert (data.get("report_id") or data.get("ticketId")) == ticket_id

    # Jury flow persists too
    assign_res = await client.post(
        "/api/v1/verify/jury/assign",
        json={
            "product_id": "prod_persist_001",
            "cluster_id": "Varanasi Handloom Cluster",
            "craft_type": "Handloom Silk Weaving",
        },
    )
    assert assign_res.status_code in (200, 201), assign_res.text
    jury_ticket_id = assign_res.json()["jury_ticket_id"]

    # --- simulate process restart: wipe all in-memory state ---
    verify_jury_service._jury_tickets.clear()
    verify_jury_service._counterfeit_reports.clear()
    verify_jury_service._juror_vote_timestamps.clear()

    # Report must still exist in DB
    row = (
        await db_session.execute(
            select(AntiFraudReport).where(AntiFraudReport.id == ticket_id)
        )
    ).scalar_one_or_none()
    assert row is not None, "AntiFraudReport lost after restart (in-memory loss)"
    assert row.status in ("ESCALATED_TO_DM", "AUDIT_TRIGGERED", "FLAGGED_AUDIT")

    # Jury ticket must still be pollable via status endpoint (DB source)
    status_res = await client.get(f"/api/v1/verify/jury/status/{jury_ticket_id}")
    assert status_res.status_code == 200, status_res.text
    assert status_res.json()["jury_ticket_id"] == jury_ticket_id

    # And directly in DB
    trow = (
        await db_session.execute(
            select(JuryTicket).where(JuryTicket.id == jury_ticket_id)
        )
    ).scalar_one_or_none()
    assert trow is not None, "JuryTicket lost after restart (in-memory loss)"
