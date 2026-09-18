from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DadiQueryRequest(BaseModel):
    query_text: str = Field(..., description="Voice transcript or text query from artisan in dialect or Hindi")
    dialect: Optional[str] = Field("bhojpuri", description="Artisan dialect (e.g. bhojpuri, maithili, hindi, english)")
    product_category: Optional[str] = Field("handloom", description="Craft category: handloom, handicraft, pottery, etc.")
    chat_history: Optional[List[Dict[str, str]]] = Field(
        None,
        description=(
            "Previous conversation turns for multi-turn chat, e.g. "
            '[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]. '
            "Roles: user | assistant. Newest last; keep the last ~10 messages."
        ),
    )

class DadiQueryResponse(BaseModel):
    answer_text: str = Field(..., description="Response text in the artisan's dialect")
    answer_english: str = Field(..., description="English translation of Dadi's guidance")
    dialect: str = Field(..., description="Dialect of the response")
    audio_response_url: Optional[str] = Field(None, description="URL or mock path to synthesized audio response")
    suggested_actions: List[str] = Field(default_factory=list, description="Actionable buttons for the artisan")
    dadi_tip: str = Field(..., description="Proverbial craft or business tip from Dadi")
