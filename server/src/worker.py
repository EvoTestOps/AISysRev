import os
from celery import Celery

broker_url = os.getenv("CELERY_BROKER_URL")

celery_app = Celery(
    "worker",
    broker=broker_url,
    backend=broker_url
)

celery_app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
)

def get_celery():
    return celery_app