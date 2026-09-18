"""#104: end-to-end Digital Heritage Passport flow.

Artisan issues a passport (with #99 print assets) -> buyer verifies via
lowercase/no-hyphen shortcode (#101 normalization) and via hash -> buyer
reports fake (#100 persisted jury) -> jury status tracks the ticket.

Playwright browser E2E is out of scope in this environment (no browsers /
e2e harness in frontend_artifact/); this API-level flow exercises the same
user journey contract the buyer portal drives.
"""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_passport_issue_verify_reportfake_jury_flow(client: AsyncClient):
    # --- Artisan: register -> enhance -> pricing -> issue ---
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "E2E Flow Artisan",
            "phone": "9845098411",
            "pin": "9900",
            "trifed_id": "TRIFED-BH-104",
        },
    )
    assert reg.status_code in (200, 201), reg.text
    artisan_id = reg.json()["artisan_id"]
    access_token = reg.json()["access_token"]

    from tests.test_cv_enhancement import create_dummy_image_bytes

    enhance_res = await client.post(
        "/api/v1/studio/enhance",
        data={"artisan_id": artisan_id, "product_title": "E2E Flow Dupatta"},
        files={
            "image": (
                "craft.jpg",
                io.BytesIO(create_dummy_image_bytes()),
                "image/jpeg",
            )
        },
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert enhance_res.status_code in (200, 201), enhance_res.text
    product_id = enhance_res.json()["product_id"]

    pricing_res = await client.post(
        "/api/v1/pricing/calculate",
        json={"product_id": product_id, "raw_material_cost": 400.0, "labor_days": 8.0},
    )
    assert pricing_res.status_code in (200, 201), pricing_res.text

    issue = await client.post("/api/v1/passport/issue", json={"product_id": product_id})
    assert issue.status_code in (200, 201), issue.text
    passport = issue.json()
    shortcode = passport["shortcode"]
    assert shortcode and len(shortcode) == 7 and shortcode[3] == "-"
    # #99 print assets ride along so the artisan UI prints without a 2nd fetch.
    assert passport["qr_svg_data_uri"].startswith("data:image/svg+xml;base64,")
    assert passport["escpos_b64"]
    assert passport["verification_url"].endswith(shortcode)

    # --- Buyer: verify via lowercase/no-hyphen shortcode (#101) ---
    typed = shortcode.replace("-", "").lower()
    by_code = await client.get(f"/api/v1/passport/code/{typed}")
    assert by_code.status_code == 200, by_code.text
    assert by_code.json()["shortcode"] == shortcode
    assert by_code.json()["is_authentic"] is True

    # --- Buyer: verify via full SHA-256 hash (incl. pre-4.2 hash QR fallback) ---
    by_hash = await client.get(f"/api/v1/passport/verify/{passport['passport_hash']}")
    assert by_hash.status_code == 200, by_hash.text
    assert by_hash.json()["passport_hash"] == passport["passport_hash"]

    # --- Buyer: Report Fake -> persisted anti-fraud report (#100) ---
    report = await client.post(
        "/api/v1/verify/report-fake",
        json={
            "shortcode": shortcode,
            "reason": "Suspected machine-made copy of listed handloom",
            "reporter_phone": "+919876543211",
        },
    )
    assert report.status_code in (200, 201), report.text
    report_data = report.json()
    report_id = report_data.get("ticketId") or report_data.get("report_id")
    assert report_id, report_data
    assert report_data["flagged_hash"] == shortcode
    assert "Escalated" in (report_data.get("action_taken") or "")

    # --- Peer jury: assign quorum for the flagged product -> poll status ---
    assign = await client.post(
        "/api/v1/verify/jury/assign",
        json={
            "product_id": product_id,
            "cluster_id": "Varanasi Handloom Cluster",
            "craft_type": "Handloom Silk Weaving",
        },
    )
    assert assign.status_code in (200, 201), assign.text
    jury_ticket_id = assign.json()["jury_ticket_id"]

    status_res = await client.get(f"/api/v1/verify/jury/status/{jury_ticket_id}")
    assert status_res.status_code == 200, status_res.text
    status_data = status_res.json()
    assert status_data["jury_ticket_id"] == jury_ticket_id
    assert status_data["product_id"] == product_id
