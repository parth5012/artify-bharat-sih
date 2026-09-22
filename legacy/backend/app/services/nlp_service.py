import base64
import json
import re
from typing import Dict, Any, Tuple
import httpx
from app.config import get_settings
from app.core.anti_generative import non_generative

settings = get_settings()

DIALECT_LANGUAGE_CODES = {
    "bhojpuri": "hi",
    "maithili": "mai",
    "kashmiri": "ks",
    "gujarati": "gu",
    "telugu": "te",
    "hindi": "hi",
}

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
    "thirty": 30,
}


class MultilingualNLPService:
    """
    Implements Page 4 Voice Auto-Cataloger:
    1. Speech-to-Text / Whisper regional dialect transcription
    2. IndicTrans2 translation from regional dialect to English
    3. Mistral-7B LLM structured extraction (title, description, heritage story, SEO tags)
    """

    @non_generative
    async def transcribe_audio(self, audio_bytes: bytes, language: str = "hi") -> str:
        """
        Transcribes audio stream using Whisper / Google Speech-to-Text.
        """
        if settings.USE_MOCK_AI:
            # Deterministic simulation matching real artisan speech sample from Playbook
            return (
                "ई हमार हाथ से बुनायल बनारसी सिल्क साड़ी हवे, जेहमे शुद्ध जरी के काम कइल गइल बा। "
                "एके बनावे मे हमके पूरा पंद्रह दिन लागल बा।"
            )

        regional_text, _ = await self._run_bhashini_pipeline(audio_bytes, language)
        return regional_text

    @non_generative
    async def translate_to_english(self, regional_text: str, source_lang: str = "bhojpuri") -> str:
        """
        Translates regional dialect into English via IndicTrans2.
        """
        if settings.USE_MOCK_AI:
            return (
                "This is our handwoven Banarasi pure silk saree with authentic gold zari border. "
                "It took fifteen full days of handloom labor to craft this traditional piece."
            )

        raise RuntimeError("Translation must be obtained together with the Bhashini voice pipeline")

    async def _run_bhashini_pipeline(self, audio_bytes: bytes, language: str) -> Tuple[str, str]:
        inference_key = settings.BHASHINI_API_KEY or settings.Inference
        ulca_key = settings.BHASHINI_ULCA_API_KEY or settings.Udyat
        if not inference_key or not settings.BHASHINI_USER_ID:
            raise RuntimeError("Bhashini credentials are not configured")
        if not settings.BHASHINI_ASR_MODEL_ID or not settings.BHASHINI_TRANSLATION_MODEL_ID:
            raise RuntimeError("Bhashini ASR and translation model IDs are not configured")

        source_language = DIALECT_LANGUAGE_CODES.get(language.lower(), language.lower())
        inference_headers = {
            "Authorization": inference_key,
            "Content-Type": "application/json",
        }
        tasks = [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_language},
                    "serviceId": settings.BHASHINI_ASR_MODEL_ID,
                },
            },
            {
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source_language, "targetLanguage": "en"},
                    "serviceId": settings.BHASHINI_TRANSLATION_MODEL_ID,
                },
            },
        ]

        if not ulca_key:
            raise RuntimeError("Bhashini UDYAT key is not configured")

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                inference_response = await client.post(
                    settings.BHASHINI_INFERENCE_URL,
                    headers=inference_headers,
                    json={
                        "pipelineTasks": tasks,
                        "inputData": {
                            "audio": [{
                                "audioContent": base64.b64encode(audio_bytes).decode("ascii"),
                            }]
                        },
                    },
                )
                inference_response.raise_for_status()
            except httpx.HTTPStatusError as error:
                detail = error.response.text[:200].replace("\n", " ")
                raise RuntimeError(
                    f"Bhashini inference failed (HTTP {error.response.status_code}): {detail}"
                ) from error
            responses = inference_response.json().get("pipelineResponse", [])

        regional_text = ""
        english_text = ""
        for response in responses:
            task_type = response.get("taskType")
            output = response.get("output", [{}])[0]
            if task_type == "asr":
                regional_text = output.get("source", output.get("text", ""))
            elif task_type == "translation":
                english_text = output.get("target", output.get("text", ""))

        if not regional_text:
            raise RuntimeError("Bhashini returned no speech transcript")
        return regional_text, english_text or regional_text

    @non_generative
    async def generate_catalog_metadata(
        self, english_transcript: str, regional_transcript: str = ""
    ) -> Dict[str, Any]:
        """
        Invokes Mistral-7B LLM to parse unstructured English voice transcript
        into a standardized, high-converting e-commerce catalog specification.
        """
        fallback = self._fallback_catalog_metadata(english_transcript, regional_transcript)
        if not settings.USE_MOCK_AI:
            try:
                return await self._extract_metadata_with_ollama(
                    english_transcript, regional_transcript, fallback
                )
            except (httpx.HTTPError, RuntimeError, json.JSONDecodeError, KeyError, TypeError, ValueError):
                pass
        return fallback

    async def _extract_metadata_with_ollama(
        self, english_transcript: str, regional_transcript: str, fallback: Dict[str, Any]
    ) -> Dict[str, Any]:
        prompt = f"""Extract an artisan profile and product catalog from these voice transcripts.
Return ONLY valid JSON. Never invent missing values. Use null for unknown name or phone.
Required keys: artisan_name, artisan_phone, artisan_dialect, title, description, craft_category, material,
estimated_days, seo_tags. The description must only restate information present in the transcripts.

English translation:
{english_transcript}

Regional transcript:
{regional_transcript}
"""
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                settings.MISTRAL_LLM_ENDPOINT,
                json={
                    "model": settings.MISTRAL_MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0},
                },
            )
            response.raise_for_status()
        extracted = json.loads(response.json().get("response", ""))
        return {
            **fallback,
            "artisan_name": extracted.get("artisan_name") or None,
            "artisan_phone": extracted.get("artisan_phone") or None,
            "artisan_dialect": extracted.get("artisan_dialect") or None,
            "title": extracted.get("title") or fallback["title"],
            "description": extracted.get("description") or fallback["description"],
            "craft_category": extracted.get("craft_category") or fallback["craft_category"],
            "material": extracted.get("material") or fallback["material"],
            "estimated_days": float(extracted["estimated_days"]) if extracted.get("estimated_days") is not None else fallback["estimated_days"],
            "seo_tags": extracted.get("seo_tags") or fallback["seo_tags"],
        }

    def _fallback_catalog_metadata(
        self, english_transcript: str, regional_transcript: str
    ) -> Dict[str, Any]:
        # Parse duration from either translated or regional speech. Hindi/Bhojpuri
        # recordings commonly use "din", while translations use "days".
        source_text = f"{english_transcript} {regional_transcript}"
        days_match = re.search(
            r"(?:\b|\D)(\d+(?:\.\d+)?)\s+(?:\w+\s+)?(?:days?|दिन|din|dino?n?)\b",
            source_text,
            re.IGNORECASE,
        )
        if days_match:
            estimated_days = float(days_match.group(1))
        else:
            word_pattern = "|".join(NUMBER_WORDS)
            word_days_match = re.search(
                rf"\b({word_pattern})\s+(?:\w+\s+)?(?:days?|din|dino?n?)\b",
                source_text,
                re.IGNORECASE,
            )
            estimated_days = float(NUMBER_WORDS[word_days_match.group(1).lower()]) if word_days_match else 0.0

        normalized_text = source_text.lower()
        if any(term in normalized_text for term in ("banarasi", "सिल्क", "silk", "saree", "saari")):
            title = "Handwoven Banarasi Silk Saree with Pure Zari Work"
            craft_category = "Banarasi Brocade & Zari Weaving"
        elif any(term in normalized_text for term in ("pashmina", "wool", "stole")):
            title = "Handcrafted Pashmina Textile"
            craft_category = "Pashmina Weaving"
        elif any(term in normalized_text for term in ("painting", "canvas", "चित्र", "मधुबनी")):
            title = "Hand-painted Heritage Artwork"
            craft_category = "Traditional Painting"
        else:
            title = ""
            craft_category = ""
        gi_tag_status = "Banarasi Brocade & Saree (GI Tagged)" if "banarasi" in normalized_text else ""
        # Keep the catalog description grounded in what the artisan actually said.
        description = english_transcript.strip()

        seo_tags = [
            "Banarasi Silk",
            "GI Tagged Handloom",
            "Varanasi Weavers",
            "Pure Zari Saree",
            "Sustainable Fashion",
            "Vocal For Local",
            "GeM Certified Handcraft"
        ]

        return {
            "title": title,
            "description": description,
            "craft_category": craft_category,
            "artisan_name": None,
            "artisan_phone": None,
            "artisan_dialect": None,
            "material": "",
            "gi_tag_status": gi_tag_status,
            "weave_technique": "",
            "estimated_days": estimated_days,
            "seo_tags": seo_tags
        }

    @non_generative
    async def process_voice_catalog(self, audio_bytes: bytes, dialect: str = "bhojpuri") -> Tuple[str, str, Dict[str, Any]]:
        """
        End-to-end cataloging pipeline: Audio -> Regional -> English -> Structured Catalog.
        """
        if settings.USE_MOCK_AI:
            regional_transcript = await self.transcribe_audio(audio_bytes, dialect)
            english_transcript = await self.translate_to_english(regional_transcript, dialect)
        else:
            regional_transcript, english_transcript = await self._run_bhashini_pipeline(audio_bytes, dialect)
        metadata = await self.generate_catalog_metadata(english_transcript, regional_transcript)
        return regional_transcript, english_transcript, metadata


nlp_service = MultilingualNLPService()
