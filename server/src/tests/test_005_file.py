import pytest
from src.crud.file_crud import FileCrud
from src.schemas.file import FileCreate, FileRead
from src.services.file_service import FileService, get_file_service

@pytest.mark.asyncio
async def test_create_and_fetch_file_record(db_session, test_project_uuid):
    crud = FileCrud(db_session)
    file_data = FileCreate(
        project_uuid=test_project_uuid,
        filename="test_file.txt",
        mime_type="text/plain"
    )
    new_file = await crud.create_file_record(file_data)
    assert new_file is not None
    assert new_file.filename == file_data.filename
    assert new_file.mime_type == file_data.mime_type

    fetched_files = await crud.fetch_files(test_project_uuid)
    assert len(fetched_files) == 1
    assert fetched_files[0].filename == file_data.filename
    assert fetched_files[0].mime_type == file_data.mime_type

@pytest.mark.asyncio
async def test_file_service(db_session, test_project_uuid, test_files_working):
    crud = FileCrud(db_session)
    service = FileService(db_session, crud)

    result = await service.process_files(test_project_uuid, test_files_working)
    assert "valid_filenames" in result
    assert len(result["valid_filenames"]) == 2

    files = await service.fetch_all(test_project_uuid)
    assert len(files) == 2
    assert files[0].filename in result["valid_filenames"]
    assert files[1].filename in result["valid_filenames"]

    papers = await service.fetch_papers(test_project_uuid)
    assert len(papers) == 2
    assert all("title" in paper and "abstract" in paper and "doi" in paper for paper in papers)

@pytest.mark.asyncio
async def test_files_service_invalid_data(db_session, test_project_uuid, test_files_invalid):
    crud = FileCrud(db_session)
    service = FileService(db_session, crud)
    errors_msgs = ['Missing required columns: title', 
                   'Missing required columns: abstract', 
                   'Missing required columns: doi']

    result = await service.process_files(test_project_uuid, test_files_invalid)
    assert "errors" in result
    assert len(result["errors"]) == 3
    for error in result["errors"]:
        assert error['message'] in errors_msgs

@pytest.mark.asyncio
async def test_get_file_service(db_session):
    service = get_file_service(db_session)
    assert service is not None
    assert isinstance(service, FileService)