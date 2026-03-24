from src.schemas.job import JobStatus


def resolve_job_status(total: int, success: int, failed: int, cancelled: int) -> JobStatus:
    if total == 0:
        return JobStatus.NOT_STARTED

    finished = success + failed

    if cancelled > 0:
        return JobStatus.CANCELLED

    if finished < total:
        return JobStatus.RUNNING

    if failed == 0:
        return JobStatus.SUCCESS

    if success == 0:
        return JobStatus.FAILED

    return JobStatus.PARTIAL_SUCCESS
