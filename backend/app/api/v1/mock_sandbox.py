from fastapi import APIRouter, status
from app.schemas.mock_sandbox import (
    EShramKYCRequest,
    EShramKYCResponse,
    MockLogisticsPinRequest,
    MockLogisticsPinResponse,
)
from app.services.mock_sandbox_service import mock_sandbox_service

router = APIRouter(prefix="/mock", tags=["Government & Logistics Sandbox Verification"])


@router.post("/auth/eshram-kyc", response_model=EShramKYCResponse, status_code=status.HTTP_200_OK)
async def verify_eshram_kyc_mock(payload: EShramKYCRequest):
    """
    Mock Government e-Shram & MoSJE Sandbox Verification:
    Simulates e-Shram / MoSJE database lookups and returns verification status
    and active welfare scheme eligibility (PM-DAKSH, PM-SURAJ, PMSYM Pension, Pehchan).
    """
    res = mock_sandbox_service.verify_eshram_kyc(
        uan_number=payload.uan_number,
        aadhaar_last_four=payload.aadhaar_last_four,
        artisan_name=payload.artisan_name,
        state=payload.state,
    )
    return EShramKYCResponse(**res)


@router.post("/logistics/generate-pin", response_model=MockLogisticsPinResponse, status_code=status.HTTP_200_OK)
async def generate_logistics_pin_mock(payload: MockLogisticsPinRequest):
    """
    Mock Logistics & India Post First-Mile Sandbox:
    Simulates India Post / CSC first-mile drop-off integration and returns
    a 6-digit drop-off tracking PIN, nearest CSC center ID, address, and Speed Post AWB.
    """
    res = mock_sandbox_service.generate_logistics_dropoff_pin(
        order_id=payload.order_id,
        artisan_id=payload.artisan_id,
        origin_pincode=payload.origin_pincode,
        destination_pincode=payload.destination_pincode or "110001",
        weight_grams=payload.weight_grams or 850,
    )
    return MockLogisticsPinResponse(**res)
