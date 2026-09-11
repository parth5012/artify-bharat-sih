"""
Artify Bharat backend — FastAPI application entry point.
Owns: auth/e-KYC, Zero-Trust Peer Jury, Logistics & Direct Payouts, IVR notify.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

app = FastAPI(
    title="Artify Bharat — Backend Core & Business Logic",
    description=(
        "Digital Heritage Passport & Fair-Wage Rural Commerce Platform — "
        "SIH PS 26090. Auth/e-KYC, Zero-Trust Peer Jury, Logistics & Payouts, IVR."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production; Anshika's frontend origin only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
