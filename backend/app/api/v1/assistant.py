from fastapi import APIRouter, HTTPException, status
from app.schemas.assistant import DadiQueryRequest, DadiQueryResponse
from app.services.assistant_service import assistant_service

router = APIRouter(prefix="/assistant", tags=["Assistant - Ask Dadi (LangAI)"])

@router.post("/dadi", response_model=DadiQueryResponse, status_code=status.HTTP_200_OK)
async def ask_dadi_endpoint(payload: DadiQueryRequest):
    """
    Multilingual conversational AI voice assistant ('Ask Dadi' / 'दादी से पूछो').
    Accepts artisan queries in rural dialect or Hindi and returns empathetic, actionable craft advice.
    """
    if not payload.query_text.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")
    
    response = await assistant_service.get_dadi_advice(payload)
    return response


@router.get("/learn-and-earn")
async def get_learn_and_earn_reels(dialect: str = "bhojpuri"):
    """
    Gamified Upskilling / PM-DAKSH Integration (SIH PS 26090):
    Returns 30-second dialect video reels for photography, packaging, and fair pricing.
    """
    return assistant_service.get_learn_and_earn_reels(dialect=dialect)


@router.post("/learn-and-earn/complete")
async def complete_learn_and_earn_reel(artisan_id: str, reel_id: str):
    """
    Records reel completion, awards PM-DAKSH Certified badge, and boosts ONDC search rank.
    """
    return assistant_service.record_reel_completion(artisan_id=artisan_id, reel_id=reel_id)

