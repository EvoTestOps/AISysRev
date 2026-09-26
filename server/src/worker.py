from celery import Celery, signals
from src.core.config import settings

broker_url = settings.CELERY_BROKER_URL

celery_app = Celery("worker", broker=broker_url, backend=broker_url)


# Print only when a worker starts, not whenever the module is imported (e.g. by the API)
@signals.worker_init.connect
def announce_worker_start(**kwargs):
    print(f"Starting Celery worker, version {settings.APP_VERSION}")


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
