import asyncio
from app.workers.celery_app import celery_app
from app.services.nlp_service import nlp_service


@celery_app.task(bind=True, name="app.workers.tasks_nlp.process_voice_cataloging")
def process_voice_cataloging(self, product_id: str, audio_file_path: str, dialect: str = "bhojpuri"):
    """
    Celery background worker executing Whisper -> IndicTrans2 -> Mistral-7B LLM.
    """
    with open(audio_file_path, "rb") as f:
        audio_bytes = f.read()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    regional_tx, english_tx, metadata = loop.run_until_complete(
        nlp_service.process_voice_catalog(audio_bytes, dialect)
    )
    loop.close()

    return {
        "product_id": product_id,
        "transcript_regional": regional_tx,
        "transcript_english": english_tx,
        "metadata": metadata,
        "status": "completed",
    }
