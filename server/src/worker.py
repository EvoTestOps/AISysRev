import logging

from celery import Celery, signals
from src.core.config import settings

logger = logging.getLogger(__name__)

broker_url = settings.CELERY_BROKER_URL

celery_app = Celery("worker", broker=broker_url, backend=broker_url)


# Log only when a worker starts, not whenever the module is imported (e.g. by the API).
# celeryd_after_setup is the first worker signal sent after Celery has set up logging.
@signals.celeryd_after_setup.connect
def announce_worker_start(**kwargs):
    logger.info("Starting Celery worker, version %s", settings.APP_VERSION)


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
