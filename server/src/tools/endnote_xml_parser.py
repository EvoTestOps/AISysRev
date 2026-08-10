import xml.etree.ElementTree as ET

from src.schemas.file_service import EndNoteRecord


def parse_endnote_xml(xml_bytes: bytes) -> list[EndNoteRecord]:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        raise ValueError(f"Invalid EndNote XML file: {e}")
    records = []
    for record_el in root.findall(".//record"):
        doi = record_el.findtext("electronic-resource-num")
        pdf_url = record_el.findtext("urls/pdf-urls/url")
        doi = doi.strip() if doi else None
        pdf_url = pdf_url.strip() if pdf_url else None
        pdf_relative_path = pdf_url.removeprefix("internal-pdf://") if pdf_url else None
        records.append(EndNoteRecord(doi=doi, pdf_relative_path=pdf_relative_path))
    return records


def path_suffix(path: str) -> str:
    parts = path.replace("\\", "/").split("/")
    return "/".join(parts[-2:]) if len(parts) >= 2 else parts[-1]