def normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    normalized_doi = doi.strip().lower()
    normalized_doi = (
        normalized_doi.removeprefix("https://doi.org/")
        .removeprefix("http://doi.org/")
        .removeprefix("doi:")
    )
    return normalized_doi or None
