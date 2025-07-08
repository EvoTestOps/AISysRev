from src.worker import celery_app
import time

@celery_app.task(name="tasks.test_task")
def test_task(name: str):
    print(f"Task started for {name}")
    time.sleep(3)
    print(f"Task done for {name}")
    return f"Hello, {name}!"
