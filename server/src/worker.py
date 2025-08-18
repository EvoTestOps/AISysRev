from celery import Celery
from src.core.config import settings

broker_url = settings.CELERY_BROKER_URL

celery_app = Celery("worker", broker=broker_url, backend=broker_url)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

celery_app.autodiscover_tasks(["src.celery.tasks"], force=True)


def get_celery():
    return celery_app
