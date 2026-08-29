import pytest

from src.crud.file_crud import FileCrud
from src.schemas.file import FileCreate
from src.services.file_service import create_file_service


@pytest.mark.asyncio
async def test_create_and_fetch_file_record(db_ctx, test_project_uuid, test_user_uuid):
    crud = db_ctx.crud(FileCrud)

    file_data = FileCreate(
        project_uuid=test_project_uuid, filename="test_file.txt", mime_type="text/plain"
    )
    new_file = await crud.create_file_record(file_data)

    assert new_file is not None
    assert new_file.filename == file_data.filename
    assert new_file.mime_type == file_data.mime_type

    fetched_files = await crud.fetch_files(test_project_uuid, test_user_uuid)
    assert len(fetched_files) == 1
    assert fetched_files[0].filename == file_data.filename
    assert fetched_files[0].mime_type == file_data.mime_type


@pytest.mark.asyncio
async def test_file_service(
    db_ctx, test_project_uuid, test_files_working, test_user_uuid
):
    service = create_file_service(db_ctx)

    result = await service.process_files(
        test_project_uuid, [test_files_working[0]], test_user_uuid
    )
    assert len(result.valid_filenames) == 1

    files = await service.fetch_all(test_project_uuid, test_user_uuid)
    assert len(files) == 1
    assert files[0].filename in result.valid_filenames

    papers = await service.fetch_all(test_project_uuid, test_user_uuid)
    assert len(papers) == 1


@pytest.mark.asyncio
async def test_files_service_invalid_data(
    db_ctx, test_project_uuid, test_files_invalid, test_user_uuid
):
    service = create_file_service(db_ctx)

    errors_msgs = [
        "Missing required columns: title",
    ]
    result = await service.process_files(
        test_project_uuid, [test_files_invalid[0]], test_user_uuid
    )

    assert len(result.errors) == 1
    assert result.errors[0].message in errors_msgs
