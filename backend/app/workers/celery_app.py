from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "artify_bharat_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks_cv",
        "app.workers.tasks_nlp",
        "app.workers.tasks_scraper",
        "app.workers.tasks_marketplace",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    beat_schedule={
        "daily-handicraft-market-price-scrape": {
            "task": "app.workers.tasks_scraper.scrape_handicraft_benchmarks",
            "schedule": 86400.0,  # Run daily
        },
        "hourly-marketplace-hold-expiry": {
            "task": "app.workers.tasks_marketplace.release_expired_reservations",
            "schedule": 3600.0,  # Release 7-day holds past expires_at
        },
    },
)
