import asyncio
from uuid import UUID

from httpx import AsyncClient

from src.core.llm.providers.provider import LLMProvider
from src.crud.file_crud import FileCrud
from src.crud.pdf_chunk_embedding_crud import PdfChunkEmbeddingCrud
from src.crud.project_crud import ProjectCrud
from src.db.db_context import DBContext
from src.schemas.llm import ProviderRuntimeParameters
from src.schemas.pdf_chunk_embedding import PdfChunkEmbeddingCreate
from src.services.llm_service import LLMService, create_llm_service
from src.tools.pdf_chunk_extraction import (
    chunk_text,
    extract_pdf_text,
    merge_and_dedupe_chunks,
    top_k_chunks_by_similarity,
)
from src.tools.pdf_storage import read_pdf_bytes


class PdfScreeningService:
    def __init__(
        self,
        project_crud: ProjectCrud,
        pdf_chunk_embedding_crud: PdfChunkEmbeddingCrud,
        file_crud: FileCrud,
        llm_service: LLMService,
    ):
        self.project_crud = project_crud
        self.pdf_chunk_embedding_crud = pdf_chunk_embedding_crud
        self.file_crud = file_crud
        self.llm_service = llm_service
    
    async def get_pdf_chunks_for_screening(
        self,
        llm: type[LLMProvider],
        provider_parameters: dict,
        runtime_parameters: ProviderRuntimeParameters,
        client: AsyncClient,
        project_uuid: UUID,
        owner_uuid: UUID,
        pdf_file_uuid: UUID,
        inclusion_criteria: list[str],
        exclusion_criteria: list[str],
    ) -> str:
        inclusion_embeddings, exclusion_embeddings = await self.get_criteria_embeddings(
            llm,
            provider_parameters,
            runtime_parameters,
            client,
            project_uuid,
            owner_uuid,
            inclusion_criteria,
            exclusion_criteria,
        )
        chunk_texts, chunk_embeddings = await self.get_chunks_with_embeddings(
            llm,
            provider_parameters,
            runtime_parameters,
            client,
            pdf_file_uuid,
            owner_uuid,
        )

        chunk_lists = [
            top_k_chunks_by_similarity(chunk_texts, chunk_embeddings, criteria_embedding, k=1)
            for criteria_embedding in inclusion_embeddings + exclusion_embeddings
        ]
        return "\n\n".join(merge_and_dedupe_chunks(chunk_lists))
    
    async def get_criteria_embeddings(
        self,
        llm: type[LLMProvider],
        provider_parameters: dict,
        runtime_parameters: ProviderRuntimeParameters,
        client: AsyncClient,
        project_uuid: UUID,
        owner_uuid: UUID,
        inclusion_criteria: list[str],
        exclusion_criteria: list[str],
    ) -> tuple[list[list[float]], list[list[float]]]:
        project = await self.project_crud.fetch_project_by_uuid(project_uuid, owner_uuid)
        if (
            project
            and (project.inclusion_criteria_embedding or not inclusion_criteria)
            and (project.exclusion_criteria_embedding or not exclusion_criteria)
        ):
            return project.inclusion_criteria_embedding or [], project.exclusion_criteria_embedding or []

        texts = inclusion_criteria + exclusion_criteria
        embeddings = await self.llm_service.embed(
            llm,
            provider_parameters,
            runtime_parameters,
            texts=texts,
            client=client,
        ) if texts else []
        inclusion_embeddings = embeddings[:len(inclusion_criteria)]
        exclusion_embeddings = embeddings[len(inclusion_criteria):]

        await self.project_crud.set_criteria_embeddings(
            project_uuid,
            owner_uuid,
            inclusion_embeddings or None,
            exclusion_embeddings or None,
        )
        return inclusion_embeddings, exclusion_embeddings
    
    async def get_chunks_with_embeddings(
        self,
        llm: type[LLMProvider],
        provider_parameters: dict,
        runtime_parameters: ProviderRuntimeParameters,
        client: AsyncClient,
        pdf_file_uuid: UUID,
        owner_uuid: UUID,
    ) -> tuple[list[str], list[list[float]]]:
        cached_chunks = await self.pdf_chunk_embedding_crud.fetch_chunks_by_pdf_file_uuid(
            pdf_file_uuid,
            owner_uuid,
        )
        if cached_chunks:
            return [c.chunk_text for c in cached_chunks], [c.embedding for c in cached_chunks]
        
        file_record = await self.file_crud.fetch_file_by_uuid(pdf_file_uuid, owner_uuid)
        if file_record is None or file_record.storage_path is None:
            raise ValueError("PDF file not found")
        
        pdf_bytes = await asyncio.to_thread(read_pdf_bytes, file_record.storage_path)
        pdf_text = await asyncio.to_thread(extract_pdf_text, pdf_bytes)
        chunks = await asyncio.to_thread(chunk_text, pdf_text, chunk_size=1500, chunk_overlap=200)
        if not chunks:
            raise ValueError("PDF has no extractable text")
        
        embeddings = await self.llm_service.embed(
            llm,
            provider_parameters,
            runtime_parameters,
            texts=chunks,
            client=client,
        )

        chunk_records = [
            PdfChunkEmbeddingCreate(
                pdf_file_uuid=pdf_file_uuid,
                chunk_index=i,
                chunk_text=chunk,
                embedding=embedding,
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        await self.pdf_chunk_embedding_crud.bulk_create_chunks(chunk_records, owner_uuid)

        return chunks, embeddings
        

def create_pdf_screening_service(db_ctx: DBContext) -> PdfScreeningService:
    return PdfScreeningService(
        db_ctx.crud(ProjectCrud),
        db_ctx.crud(PdfChunkEmbeddingCrud),
        db_ctx.crud(FileCrud),
        create_llm_service(db_ctx),
    )