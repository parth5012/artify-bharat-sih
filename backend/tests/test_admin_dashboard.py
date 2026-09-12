import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.artisan import Artisan
from app.models.product import Product
from app.models.payout import PayoutTransaction

@pytest.mark.asyncio
async def test_district_heatmap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/district-heatmap")
        assert res.status_code == 200
        data = res.json()
        assert data["total_districts_monitored"] >= 5
        assert data["total_wages_disbursed_inr"] > 0
        assert data["average_middleman_savings_percent"] > 30.0

@pytest.mark.asyncio
async def test_admin_audit_logs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/audit-logs")
        assert res.status_code == 200
        data = res.json()
        assert data["total_logs"] >= 3

@pytest.mark.asyncio
async def test_admin_pmdaksh_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/pmdaksh-metrics")
        assert res.status_code == 200
        data = res.json()
        assert data["total_enrolled"] > 0
        assert data["average_wage_increase_percent"] > 40.0

@pytest.mark.asyncio
async def test_admin_demand_forecast():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/admin/demand-forecast?cluster=Varanasi%20Handloom%20Cluster")
        assert res.status_code == 200
        data = res.json()
        assert len(data["forecast_items"]) >= 3
        assert data["confidence_score"] >= 0.9


@pytest.mark.asyncio
async def test_district_heatmap_db_aggregation(client: AsyncClient, db_session: AsyncSession):
    artisan1 = Artisan(
        id="art_vns_01",
        name="Kabir Weaver",
        phone="+919876500001",
        pin_hash="hash",
        district="Varanasi",
        state="Uttar Pradesh",
        cluster_name="Varanasi Handloom Cluster",
        geo_lat=25.3176,
        geo_lng=82.9739,
    )
    artisan2 = Artisan(
        id="art_vns_02",
        name="Ramesh Ansari",
        phone="+919876500002",
        pin_hash="hash",
        district="Varanasi",
        state="Uttar Pradesh",
        cluster_name="Varanasi Handloom Cluster",
        geo_lat=25.3180,
        geo_lng=82.9745,
    )
    artisan3 = Artisan(
        id="art_ktc_01",
        name="Devi Ben",
        phone="+919876500003",
        pin_hash="hash",
        district="Kutch",
        state="Gujarat",
        cluster_name="Kutch Embroidery Cluster",
        geo_lat=23.7337,
        geo_lng=69.8597,
    )
    db_session.add_all([artisan1, artisan2, artisan3])
    await db_session.flush()

    payout1 = PayoutTransaction(
        id="pay_01",
        artisan_id=artisan1.id,
        amount=30000.0,
        utr_number="UTR00001",
        status="SETTLED",
    )
    payout2 = PayoutTransaction(
        id="pay_02",
        artisan_id=artisan2.id,
        amount=20000.0,
        utr_number="UTR00002",
        status="SETTLED",
    )
    payout3 = PayoutTransaction(
        id="pay_03",
        artisan_id=artisan3.id,
        amount=35000.0,
        utr_number="UTR00003",
        status="SETTLED",
    )
    db_session.add_all([payout1, payout2, payout3])

    prod1 = Product(
        id="prod_01",
        artisan_id=artisan1.id,
        title="Banarasi Brocade Saree",
        gi_tag_status="Banarasi Brocade & Saree (GI Tagged)",
        status="published",
    )
    db_session.add(prod1)
    await db_session.commit()

    res = await client.get("/api/v1/admin/district-heatmap")
    assert res.status_code == 200
    data = res.json()
    assert data["total_districts_monitored"] == 2
    assert data["total_artisans_registered"] == 3
    assert data["total_wages_disbursed_inr"] == 85000.0
    assert data.get("is_fallback") is False
    districts = {d["district_name"]: d for d in data["districts"]}
    assert "Varanasi" in districts
    assert "Kutch" in districts
    assert districts["Varanasi"]["active_artisans_count"] == 2
    assert districts["Varanasi"]["direct_income_disbursed_inr"] == 50000.0
    assert districts["Kutch"]["active_artisans_count"] == 1
    assert districts["Kutch"]["direct_income_disbursed_inr"] == 35000.0


@pytest.mark.asyncio
async def test_district_heatmap_fallback_empty_db(client: AsyncClient, db_session: AsyncSession):
    res = await client.get("/api/v1/admin/district-heatmap")
    assert res.status_code == 200
    data = res.json()
    assert data["total_districts_monitored"] == 5
    assert data["total_wages_disbursed_inr"] > 0
    assert data.get("is_fallback") is True


@pytest.mark.asyncio
async def test_admin_audit_logs_db_feed(client: AsyncClient, db_session: AsyncSession):
    from app.models.jury import JuryTicket, AntiFraudReport

    artisan = Artisan(
        id="art_audit_01",
        name="Govind Silk",
        phone="+919876543201",
        pin_hash="hash",
        district="Varanasi",
        state="Uttar Pradesh",
        cluster_name="Varanasi Handloom Cluster",
    )
    product = Product(
        id="prod_audit_01",
        artisan_id=artisan.id,
        title="Pure Katan Silk",
        status="published",
    )
    db_session.add_all([artisan, product])
    await db_session.flush()

    jury_ticket = JuryTicket(
        id="jury_ticket_db_99",
        product_id=product.id,
        status="QUORUM_GENUINE",
        assigned_juror_ids="juror_1,juror_2,juror_3",
        quorum_verdict="authentic",
        average_craft_score=0.96,
        anomaly_score=0.02,
    )
    fraud_report = AntiFraudReport(
        id="rep_fraud_db_99",
        product_id=product.id,
        jury_ticket_id=jury_ticket.id,
        reason="Counterfeit synthetic polyester detected",
        status="FLAGGED_AUDIT",
    )
    db_session.add_all([jury_ticket, fraud_report])
    await db_session.commit()

    res = await client.get("/api/v1/admin/audit-logs")
    assert res.status_code == 200
    data = res.json()
    assert data["total_logs"] >= 2
    log_ids = [entry["log_id"] for entry in data["logs"]]
    assert "jury_ticket_db_99" in log_ids
    assert "rep_fraud_db_99" in log_ids

    jury_entry = next(entry for entry in data["logs"] if entry["log_id"] == "jury_ticket_db_99")
    assert jury_entry["event_type"] == "PEER_JURY_CONSENSUS_VERIFIED"
    assert jury_entry["product_or_passport_id"] == "prod_audit_01"
    assert jury_entry["cluster"] == "Varanasi Handloom Cluster"
    assert jury_entry["status"] in ["APPROVED", "QUORUM_GENUINE"]

    fraud_entry = next(entry for entry in data["logs"] if entry["log_id"] == "rep_fraud_db_99")
    assert fraud_entry["event_type"] in ["COUNTERFEIT_REPORT_FILED", "COUNTERFEIT_FLAG_TRIGGERED"]
    assert fraud_entry["status"] == "FLAGGED_AUDIT"
    assert "synthetic" in fraud_entry["details"]
