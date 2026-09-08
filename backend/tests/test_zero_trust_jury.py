import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_peer_jury_assignment_and_voting_quorum():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Assign Peer Jury
        assign_payload = {
            "product_id": "prod_banarasi_881",
            "cluster_id": "Varanasi Handloom Cluster",
            "craft_type": "Handloom Silk Weaving"
        }
        res_assign = await client.post("/api/v1/verify/jury/assign", json=assign_payload)
        assert res_assign.status_code == 200
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
            "comments": "Pure handloom silk weave confirmed"
        }
        res_vote1 = await client.post("/api/v1/verify/jury/vote", json=vote1_payload)
        assert res_vote1.status_code == 200
        data_vote1 = res_vote1.json()
        assert data_vote1["votes_received"] == 1
        assert data_vote1["quorum_reached"] is False
        
        # Step 3: Juror 2 votes Authentic (Reaching Quorum)
        vote2_payload = {
            "jury_ticket_id": ticket_id,
            "juror_id": data_assign["assigned_jurors"][1],
            "verdict": "authentic",
            "craft_authenticity_score": 0.98,
            "comments": "GI standards compliant."
        }
        res_vote2 = await client.post("/api/v1/verify/jury/vote", json=vote2_payload)
        assert res_vote2.status_code == 200
        data_vote2 = res_vote2.json()
        assert data_vote2["votes_received"] == 2
        assert data_vote2["quorum_reached"] is True
        assert data_vote2["final_verdict"] == "VERIFIED_AUTHENTIC"
        assert data_vote2["consensus_level"] == "HIGH_CONFIDENCE"

@pytest.mark.asyncio
async def test_report_counterfeit_feedback_loop():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        report_payload = {
            "shortcode_or_hash": "A7X-9B2",
            "reporter_phone": "+919876543210",
            "reason": "Machine-made fabric sold with fake GI tag"
        }
        res = await client.post("/api/v1/verify/report-fake", json=report_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "audit_triggered"
        assert data["flagged_hash"] == "A7X-9B2"
        assert "Escalated" in data["action_taken"]

@pytest.mark.asyncio
async def test_velocity_rubber_stamp_detection():
    from app.services.verify_jury_service import verify_jury_service
    juror_id_fast = "juror_fast_bot"
    
    # Pre-populate 20 votes across 20 different tickets for this fast juror
    for i in range(21):
        t = verify_jury_service.assign_jury(f"prod_fast_{i}", "Varanasi Handloom Cluster", "Silk Weaving")
        res_fast = verify_jury_service.cast_vote(t["jury_ticket_id"], juror_id_fast, "authentic", 0.99)
        
    assert res_fast["velocity_flag"] is True
    
    # Now when a second juror also votes on the 21st ticket reaching quorum, the velocity flag triggers audit escalation
    target_ticket = t["jury_ticket_id"]
    res_final = verify_jury_service.cast_vote(target_ticket, "juror_vns_02", "authentic", 0.95)
    
    assert res_final["quorum_reached"] is True
    assert res_final["final_verdict"] == "FLAGGED_VELOCITY_ANOMALY"
    assert res_final["consensus_level"] == "SUSPECTED_RUBBER_STAMP"

@pytest.mark.asyncio
async def test_reassign_stale_juror():
    from app.services.verify_jury_service import verify_jury_service
    ticket = verify_jury_service.assign_jury("prod_stale_1", "Varanasi Handloom Cluster", "Silk Weaving")
    tid = ticket["jury_ticket_id"]
    old_juror = ticket["assigned_jurors"][0]
    
    # Simulate auto-reassignment of inactive juror
    updated = verify_jury_service.reassign_stale_juror(tid, old_juror)
    assert old_juror not in updated["assigned_jurors"]
    assert len(updated["assigned_jurors"]) >= 3
    assert "last_reassigned_at" in updated



