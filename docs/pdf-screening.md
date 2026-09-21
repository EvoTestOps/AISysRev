# PDF Screening

AISysRev can screen papers using the full-text PDF instead of the title and abstract. Instead of sending the whole PDF to the LLM, the application retrieves the passages of the PDF that are most relevant to each inclusion and exclusion criterion and sends only those passages (retrieval-augmented screening). This keeps the prompt small and the cost per paper close to that of abstract screening.

This document covers the whole flow: attaching PDFs, choosing a screening mode, how the excerpts are selected, and the current limitations.

## Contents

- [Attaching PDFs to papers](#attaching-pdfs-to-papers)
- [Screening modes](#screening-modes)
- [PDF screening pipeline](#pdf-screening-pipeline)
- [Caching](#caching)
- [Configuration](#configuration)
- [Errors and limitations](#errors-and-limitations)

## Attaching PDFs to papers

A PDF is stored as a `file` record and linked to a paper through `paper.pdf_file_uuid`. PDFs can be attached in three ways. All of them validate the upload: the content must start with the `%PDF-` magic bytes and be at most `MAX_PDF_UPLOAD_MB` in size (see [Configuration](#configuration)).

| Method | Where | How the PDF is matched to a paper |
| --- | --- | --- |
| Upload to a paper | **Upload full text** / **Replace full text** on a paper card (`POST /files/{paper_uuid}/attach-pdf`) | Directly to the paper you clicked. Replacing removes the previous PDF, and its stored file if no other file record uses it. |
| Zotero / EndNote XML import | **Import full text (Zotero Export Folder)** on the project page (`POST /files/import-fulltext`) | By DOI. See below. |
| Upload PDFs as papers | `POST /files/upload-pdfs` | A new paper is created per PDF with the file name (without extension) as the title, `NO_ABSTRACT` as the abstract and `NO_DOI` as the DOI. There is no button for this in the UI. |

### Bulk import with Zotero / EndNote XML

1. **Download papers missing full text** (`GET /paper/{project_uuid}/missing_fulltext_ris`) exports a RIS file of all papers in the project that have no PDF attached.
2. Import the RIS file into [Zotero](https://www.zotero.org/) and use *Find Full Text* to retrieve the PDFs.
3. Export the collection in EndNote XML format with *Export notes* and *Export files* checked.
4. Select the exported folder in **Import full text (Zotero Export Folder)**.

The importer reads the DOI (`electronic-resource-num`) and the PDF path (`urls/pdf-urls/url`) of each record in the XML. A PDF is matched to a paper when the normalized DOIs are equal. Normalization lowercases the DOI and strips a `https://doi.org/`, `http://doi.org/` or `doi:` prefix.

A PDF is skipped and reported as unmatched, together with the reason, when:

- the EndNote XML has no DOI for the file,
- no paper in the project has that DOI,
- more than one paper without a PDF has that DOI,
- the paper with that DOI already has a PDF (the import never overwrites), or
- the file is not a valid PDF or is too large.

The result message shows how many PDFs were matched and lists the unmatched ones.

## Screening modes

The screening mode is chosen per screening task (job) and decides which papers are screened and what the LLM sees.

| Mode | Papers included in the task | Content given to the LLM |
| --- | --- | --- |
| **Abstract** | Papers imported from a CSV | Title and abstract |
| **PDF** | Papers that have a PDF attached | Title and excerpts from the PDF |
| **Automatic** | Papers imported from a CSV or that have a PDF attached | Excerpts if the paper has a PDF, otherwise the abstract |

In PDF and Automatic mode the excerpts replace the abstract in the prompt and are labelled *Excerpts from the paper* instead of *Abstract*. Creating a task fails with an error if no paper in the project matches the selected mode.

## PDF screening pipeline

![PDF screening pipeline](images/pdf-screening.svg)

For each paper screened in PDF mode:

1. **Extract text.** The PDF is read from storage and its text is extracted page by page with [pypdf](https://pypdf.readthedocs.io/). Null characters are removed.
2. **Chunk.** The text is split with LangChain's `RecursiveCharacterTextSplitter` into chunks of 500 characters with an overlap of 100 characters.
3. **Embed the chunks.** Every chunk is embedded with OpenAI's `text-embedding-3-small` model. The chunks and their embeddings are stored in the `pdf_chunk_embedding` table.
4. **Embed the criteria.** Every inclusion and exclusion criterion is embedded with the same model. The embeddings are stored on the project.
5. **Retrieve.** For each criterion, the chunk with the highest cosine similarity to the criterion embedding is selected (top-1). With 6 criteria, at most 6 chunks are selected.
6. **Merge.** Identical chunks selected for several criteria are included only once, so the number of excerpts is at most the number of criteria. The excerpts are joined with blank lines.
7. **Screen.** The excerpts are put in the prompt in place of the abstract, and the LLM returns its decision in the same format as in abstract screening (binary, ordinal or probability).

The embeddings are always computed with `text-embedding-3-small`, regardless of which LLM is used for the screening decision. The embedding call is made through the same provider as the screening task (OpenAI directly or OpenRouter) and uses that provider's API key.

Before the individual papers are screened, the criteria embeddings are computed once when the job starts, so that the parallel paper tasks do not each request them.

### More detailed look

![PDF screening pipeline, detailed](images/pdf-screening-detailed.svg)

## Caching

Embeddings are only computed once and reused by later screening tasks:

- **Chunk embeddings** are cached per PDF in `pdf_chunk_embedding`, unique on (`pdf_file_uuid`, `chunk_index`). If cached chunks exist for a PDF, the PDF is not read, extracted or embedded again. Replacing a paper's PDF creates a new file record, so it is chunked and embedded again.
- **Criteria embeddings** are cached on the project (`inclusion_criteria_embedding` and `exclusion_criteria_embedding`) and reused by all later jobs of that project.
- The chunks are stored in the database, so the full text of the PDFs is stored in two places: the PDF storage and the `pdf_chunk_embedding` table.
- The mock LLM provider used in tests returns random embeddings and never writes to these caches.

## Configuration

PDF handling is configured with environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `MAX_PDF_UPLOAD_MB` | `50` | Maximum size of an uploaded PDF |
| `STORAGE_BACKEND` | `local` | `local` stores PDFs on disk, `s3` stores them in an S3-compatible bucket |
| `PDF_STORAGE_PATH` | `/app/data/pdfs` | Directory for PDFs when `STORAGE_BACKEND=local` |
| `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | (empty) | Required when `STORAGE_BACKEND=s3` |
| `S3_REGION` | `us-east-1` | Region for the S3 client |

PDFs are stored as `<owner uuid>/<sha256 of the content>.pdf`, so identical PDFs uploaded by the same user share one stored file. The stored file is deleted only when no file record refers to it any more. Deleting a project also deletes its PDFs and chunk embeddings.

## Errors and limitations

- **Embeddings require OpenAI or OpenRouter.** The local provider (OpenAI SDK) has no embedding support, so PDF and Automatic mode cannot be used with local models for papers that have a PDF. Abstract mode works with all providers.
- **Scanned PDFs are not supported.** There is no OCR. A PDF without extractable text fails with *PDF has no extractable text*.
- **Per-criteria prompting is not supported with PDFs.** Creating a PDF or Automatic task with the per-criteria prompting mode is rejected. Use zero-shot or few-shot prompting.
- **Only the best chunk per criterion is used.** A criterion that is answered by several passages, or by a passage that is not the most similar to the criterion text, may not be covered by the excerpts. Excerpts are 500 characters long, so the LLM sees only a small part of the paper.
- **Failures are per paper.** If extraction, embedding or the LLM call fails for one paper, that paper's task is marked as *ERROR* with the message, and the rest of the task continues.
