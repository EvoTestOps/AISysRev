import logging


def configure_logging() -> None:
    """Show the API's own INFO logs (from logging.getLogger(__name__) loggers).

    Uvicorn only configures its own loggers, so without this the root logger
    stays at WARNING and drops them. force=True replaces the bare
    logging.basicConfig() in src/db/engine.py. Celery workers set up the root
    logger themselves (--loglevel), so they don't call this.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        force=True,
    )


def get_logger(name: str):
    logger = logging.getLogger(name)
    console_handler = logging.StreamHandler()
    logger.addHandler(console_handler)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    console_handler.setFormatter(formatter)
    return logger
