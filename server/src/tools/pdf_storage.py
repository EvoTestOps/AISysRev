from pathlib import Path
from uuid import UUID

from src.core.config import settings


def build_storage_path(project_uuid: UUID, file_uuid: UUID) -> str:
    return f"{settings.PDF_STORAGE_PATH}/{project_uuid}/{file_uuid}.pdf"


def write_pdf_bytes(storage_path: str, content: bytes) -> None:
    path = Path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
