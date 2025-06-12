from fastapi import APIRouter, UploadFile, File
from typing import List
from minio.error import S3Error
from services.csv_file_validation import validate_csv
from services.minio_file_uploader import minio_file_uploader

router = APIRouter()

@router.post("/api/process-csv")
async def process_csv(files: List[UploadFile] = File(...)):
    errors = []
    valid_filenames = []

    for f in files:
        validation_errors = validate_csv(f.file, f.filename)
        if validation_errors:
            errors.extend(validation_errors)
        else:
            try:
                minio_file_uploader(f.file, f.filename)
            except S3Error as e:
                print("error occurred.", e)
            valid_filenames.append(f.filename)

    return {
        "status": "error" if errors else "received",
        "errors": errors,
        "valid_filenames": valid_filenames
    }