from src.schemas.paper import PaperRead


def build_ris_file(papers: list[PaperRead]) -> str:
    entries = []
    for paper in papers:
        lines = ["TY  - JOUR", f"TI  - {paper.title}"]
        if paper.abstract and paper.abstract != "NO_ABSTRACT":
            lines.append(f"AB  - {paper.abstract}")
        if paper.doi:
            lines.append(f"DO  - {paper.doi}")
        lines.append("ER  - ")
        entries.append("\n".join(lines))
    return "\n\n".join(entries) + "\n"
