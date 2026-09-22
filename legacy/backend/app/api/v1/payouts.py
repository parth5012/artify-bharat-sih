"""
/api/v1/payouts — Direct Jan Dhan escrow disbursement, 0% middleman fee
(Task 5.6).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services import payout_service as payouts
from app.schemas.payout import (
    DirectTransferRequest,
    DirectTransferResponse,
    PayoutHistoryItem,
    PayoutHistoryResponse,
)

router = APIRouter(prefix="/payouts", tags=["payouts"])


@router.post("/direct-transfer", response_model=DirectTransferResponse, status_code=201)
async def direct_transfer(req: DirectTransferRequest, db: AsyncSession = Depends(get_db)):
    payout = await payouts.direct_transfer(
        db,
        artisan_id=req.artisan_id,
        order_id=req.order_id,
        product_id=req.product_id,
        amount=req.amount,
        channel=req.channel,
    )
    net_amount = float(payout.amount) * (1 - float(payout.platform_fee_pct) / 100)
    return DirectTransferResponse(
        payout_id=payout.id,
        utr_number=payout.utr_number,
        amount=float(payout.amount),
        platform_fee_pct=float(payout.platform_fee_pct),
        net_amount=net_amount,
        status=payout.status,
    )


@router.get("/history/{artisan_id}", response_model=PayoutHistoryResponse)
async def history(artisan_id: str, db: AsyncSession = Depends(get_db)):
    transactions = await payouts.get_payout_history(db, artisan_id)
    total = sum(float(t.amount) for t in transactions)
    return PayoutHistoryResponse(
        artisan_id=artisan_id,
        total_disbursed=total,
        transactions=[
            PayoutHistoryItem(
                payout_id=t.id,
                order_id=t.order_id,
                amount=float(t.amount),
                utr_number=t.utr_number,
                status=t.status,
                created_at=t.created_at.isoformat(),
            )
            for t in transactions
        ],
    )
