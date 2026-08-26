import os
import logging
from logging.handlers import RotatingFileHandler
from celery import Celery
from celery.signals import after_setup_logger, after_setup_task_logger
from src.core.config import settings

broker_url = settings.CELERY_BROKER_URL

celery_app = Celery("worker", broker=broker_url, backend=broker_url)


@after_setup_logger.connect
@after_setup_task_logger.connect
def add_celery_file_handler(logger, **kwargs):
    log_dir = os.getenv("LOG_DIR", "/app/logs")
    os.makedirs(log_dir, exist_ok=True)
    handler = RotatingFileHandler(
        os.path.join(log_dir, "celery.log"), maxBytes=10 * 1024 * 1024, backupCount=5
    )
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")
    )
    logger.addHandler(handler)

# AsyncResult.get()/.result do NOT delete the stored result from the backend
# (Redis) despite what the Celery docstring implies — they only clear
# client-side pending-result bookkeeping. Actual cleanup happens via
# ignore_result=True (see tasks.process_job), result_expires (TTL), or an
# explicit .forget() call. Set a bounded default here instead of relying on
# Celery's implicit 1-day default.
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
)

celery_app.autodiscover_tasks(["src.celery.tasks"], force=True)


def get_celery():
    return celery_app
