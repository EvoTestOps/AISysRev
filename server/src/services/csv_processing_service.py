import uuid
from fastapi import UploadFile
from typing import List
from minio.error import S3Error
from services.csv_file_validation import validate_csv
from services.minio_file_uploader import minio_file_uploader
from crud.project_crud import create_project, fetch_project_id
from crud.file_crud import create_file_record

async def process_csv_files(files: List[UploadFile], db):
    errors = []
    valid_filenames = []

    for f in files:
        validation_errors = validate_csv(f.file, f.filename)
        if validation_errors:
            errors.extend(validation_errors)
        else:
            try:
                minio_file_uploader(f.file, f.filename)
                project_uuid = uuid.uuid4()
                project_metadata = {
                    "uuid": project_uuid,
                    "name": f.filename,
                    "criteria": "ADD CRITERIA"
                }

                await create_project(project_metadata, db)
                project_id = await fetch_project_id(project_uuid, db)

                file_metadata = {
                    "project_id": project_id,
                    "filename": f.filename,
                    "mime_type": f.content_type,
                }
                await create_file_record(file_metadata, db)

            except S3Error as e:
                print("error occurred.", e)
            
            valid_filenames.append(f.filename)

    return {
        "status": "error" if errors else "received",
        "errors": errors,
        "valid_filenames": valid_filenames
    }
