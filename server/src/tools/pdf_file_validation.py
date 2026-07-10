from typing import List

from src.schemas.file_service import FileError

PDF_MAGIC_BYTES = b"%PDF-"


def validate_pdf(content: bytes, filename: str, max_size_bytes: int) -> List[FileError]:
    errors: List[FileError] = []

    if not content.startswith(PDF_MAGIC_BYTES):
        errors.append(
            FileError(
                file=filename,
                row="file",
                message="File is not a valid PDF",
            )
        )

    if len(content) > max_size_bytes:
        errors.append(
            FileError(
                file=filename,
                row="file",
                message=f"PDF exceeds maximum allowed size of {max_size_bytes // (1024 * 1024)} MB",
            )
        )

    return errors
