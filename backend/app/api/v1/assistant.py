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
