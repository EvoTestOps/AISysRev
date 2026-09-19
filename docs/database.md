# Database

PostgreSQL, accessed with SQLAlchemy (async) and migrated with Alembic. The tables are defined in [server/src/db/models/](../server/src/db/models/) and the migrations are in [server/migrations/versions/](../server/migrations/versions/).

```mermaid
classDiagram
    User "0..1" *-- "*" Project
    User "1" *-- "*" Setting
    Project "1" *-- "*" File
    Project "1" *-- "*" Paper
    Project "1" *-- "*" Job
    File "0..1" *-- "*" Paper
    File "1" *-- "*" PdfChunkEmbedding
    Job "1" *-- "*" JobTask
    Paper "1" *-- "*" JobTask
    File "0..1" o-- "*" JobTask

    class User {
        int id PK
        uuid uuid UK
        string sub UK
        string email
        string terms_version_accepted
        timestamp terms_accepted_at
        string privacy_policy_version_accepted
        timestamp privacy_policy_accepted_at
        bool consent_anonymized_research_usage
        timestamp consent_anonymized_research_usage_updated_at
    }

    class Setting {
        int id PK
        uuid uuid UK
        uuid owner_uuid FK
        string name
        string value
        bool secret
    }

    class Project {
        int id PK
        uuid uuid UK
        uuid owner_uuid FK
        string name
        jsonb criteria
        jsonb preferences
        jsonb inclusion_criteria_embedding
        jsonb exclusion_criteria_embedding
        string screening_target
    }

    class File {
        int id PK
        uuid uuid UK
        uuid project_uuid FK
        string filename
        string mime_type
        string storage_path
    }

    class Paper {
        int id PK
        uuid uuid UK
        int paper_id
        uuid project_uuid FK
        uuid file_uuid FK
        uuid pdf_file_uuid FK
        text doi
        text title
        text abstract
        enum human_result
    }

    class PdfChunkEmbedding {
        int id PK
        uuid uuid UK
        uuid pdf_file_uuid FK
        int chunk_index
        text chunk_text
        jsonb embedding
    }

    class Job {
        int id PK
        uuid uuid UK
        uuid celery_task_id
        int project_id FK
        jsonb llm_config
        jsonb prompting_config
        enum screening_mode
    }

    class JobTask {
        int id PK
        uuid uuid UK
        int job_id FK
        uuid paper_uuid FK
        uuid pdf_file_uuid FK
        text doi
        text title
        text abstract
        jsonb result
        enum human_result
        enum status
        jsonb status_metadata
        text error
    }
```

Relationship symbols: a filled diamond (`*`) means the parent owns the child and deleting the parent deletes the children (`ON DELETE CASCADE`). The hollow diamond (`o`) means the child is only linked and its reference is cleared when the parent is deleted (`ON DELETE SET NULL`). The numbers are the multiplicities: `1` exactly one, `0..1` optional, `*` many.

## Notes

- Enum values: `screening_target` is `PAPER` or `GITHUB_REPOSITORY`. `human_result` (on `paper` and `jobtask`) is `INCLUDE`, `EXCLUDE` or `UNSURE`. `job.screening_mode` is `TEXT`, `PDF` or `AUTOMATIC`. `jobtask.status` is `NOT_STARTED`, `PENDING`, `RUNNING`, `DONE`, `ERROR` or `CANCELLED`.
- Unique constraints besides the `uuid` columns: `sub` on `user`, (`owner_uuid`, `name`) on `setting`, (`project_uuid`, `paper_id`) on `paper` and (`pdf_file_uuid`, `chunk_index`) on `pdf_chunk_embedding`.
- `paper.file_uuid` is the imported CSV file and `paper.pdf_file_uuid` is the attached full-text PDF. Both reference `file`.
- `jobtask.result` holds the LLM result.
- Every table also has `created_at` and `updated_at` (timestamp with time zone).
- Each table has an integer `id` primary key and a separate `uuid` column. Some foreign keys reference the integer `id` (`job.project_id`, `jobtask.job_id`) and others the `uuid` (everything else), so check the model when writing a join.
- All foreign keys use `ON DELETE CASCADE`, except `jobtask.pdf_file_uuid`, which is set to `NULL`. Deleting a project removes its files, papers and jobs, and deleting a user removes their projects and settings.
- A paper must have a source file: the check constraint `ck_paper_has_source_file` requires `file_uuid` or `pdf_file_uuid` to be set.
- `jobtask` copies `doi`, `title` and `abstract` from the paper when the job is created, so that a task keeps the text that was screened.
- Embeddings (`pdf_chunk_embedding.embedding` and the project's criteria embeddings) are stored as JSONB arrays of floats and compared in Python. A migration enables the PostgreSQL `vector` extension, which is why the database runs the `pgvector` image, but no column uses the `vector` type yet.
- The diagram is drawn from the SQLAlchemy models. To check it against a running database, use Adminer (see [architecture.md](architecture.md)).
