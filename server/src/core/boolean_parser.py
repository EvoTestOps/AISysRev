import re
from typing import Optional


def _tokenize(expr: str) -> list[str]:
    return re.findall(r"\(|\)|[A-Za-z][A-Za-z0-9_]*", expr.upper())


class _Parser:
    def __init__(self, tokens: list[str], valid_ids: set[str]):
        self._tokens = tokens
        self._pos = 0
        self._valid_ids = valid_ids

    def _peek(self) -> Optional[str]:
        return self._tokens[self._pos] if self._pos < len(self._tokens) else None

    def _consume(self, expected: Optional[str] = None) -> str:
        tok = self._tokens[self._pos]
        if expected is not None and tok != expected:
            raise ValueError(f"Expected '{expected}', got '{tok}'")
        self._pos += 1
        return tok

    def parse(self) -> dict:
        node = self._or_expr()
        if self._pos < len(self._tokens):
            raise ValueError(
                f"Unexpected token '{self._tokens[self._pos]}' at position {self._pos}"
            )
        return node

    def _or_expr(self) -> dict:
        left = self._and_expr()
        if self._peek() != "OR":
            return left
        children = [left]
        while self._peek() == "OR":
            self._consume("OR")
            children.append(self._and_expr())
        return {"operator": "OR", "criteria": children}

    def _and_expr(self) -> dict:
        left = self._not_atom()
        if self._peek() != "AND":
            return left
        children = [left]
        while self._peek() == "AND":
            self._consume("AND")
            children.append(self._not_atom())
        return {"operator": "AND", "criteria": children}

    def _not_atom(self) -> dict:
        if self._peek() == "NOT":
            self._consume("NOT")
            node = self._atom()
            if "id" in node:
                return {**node, "negate": True}
            return {"operator": "AND", "criteria": [node], "negate": True}
        return self._atom()

    def _atom(self) -> dict:
        tok = self._peek()
        if tok == "(":
            self._consume("(")
            node = self._or_expr()
            self._consume(")")
            return node
        if tok is None:
            raise ValueError("Unexpected end of expression")
        self._consume()
        if tok not in self._valid_ids:
            raise ValueError(
                f"Unknown criterion ID '{tok}'. Valid IDs: {sorted(self._valid_ids)}"
            )
        return {"id": tok}


def parse_expression(expr: str, valid_ids: list[str]) -> dict:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, set(id.upper() for id in valid_ids))
    return parser.parse()


def extract_leaf_criteria(node: dict) -> list[dict]:
    if "id" in node:
        return [node]
    result = []
    for child in node.get("criteria", []):
        result.extend(extract_leaf_criteria(child))
    return result


def build_criteria_tree_with_expressions(
    inclusion_criteria: list[str],
    exclusion_criteria: list[str],
    inclusion_expression: Optional[str],
    exclusion_expression: Optional[str],
) -> dict:
    inc_ids = [f"IC{i + 1}" for i in range(len(inclusion_criteria))]
    exc_ids = [f"EC{i + 1}" for i in range(len(exclusion_criteria))]
    all_ids = inc_ids + exc_ids

    leaf_map = {
        **{cid: desc for cid, desc in zip(inc_ids, inclusion_criteria)},
        **{cid: desc for cid, desc in zip(exc_ids, exclusion_criteria)},
    }

    def make_tree(
        ids: list[str], descriptions: list[str], expression: Optional[str]
    ) -> dict:
        if expression:
            tree = parse_expression(expression, all_ids)
            _attach_descriptions(tree, leaf_map)
            return tree

        # Default: OR over all criteria in section
        return {
            "operator": "OR",
            "criteria": [
                {"id": cid, "description": desc} for cid, desc in zip(ids, descriptions)
            ],
        }

    result: dict = {}
    if inclusion_criteria:
        result["inclusion"] = make_tree(
            inc_ids, inclusion_criteria, inclusion_expression
        )
    if exclusion_criteria:
        result["exclusion"] = make_tree(
            exc_ids, exclusion_criteria, exclusion_expression
        )
    result["_leaf_map"] = leaf_map
    return result


def _attach_descriptions(node: dict, leaf_map: dict[str, str]) -> None:
    """Recursively attach 'description' to leaf nodes from leaf_map."""
    if "id" in node:
        node["description"] = leaf_map.get(node["id"], "")
        return
    for child in node.get("criteria", []):
        _attach_descriptions(child, leaf_map)


def fuzzy_eval(
    node: dict, criterion_probs: dict[str, Optional[float]]
) -> Optional[float]:
    if "id" in node:
        prob = criterion_probs.get(node["id"])
        if prob is None:
            return None
        return round(1.0 - prob, 4) if node.get("negate", False) else round(prob, 4)
    child_probs = [
        p
        for child in node.get("criteria", [])
        if (p := fuzzy_eval(child, criterion_probs)) is not None
    ]
    if not child_probs:
        return None
    op = node.get("operator", "AND").upper()
    return round(min(child_probs), 4) if op == "AND" else round(max(child_probs), 4)


def compute_overall(
    criteria_tree: dict,
    criterion_probs: dict[str, Optional[float]],
) -> tuple[Optional[float], Optional[float], Optional[float], Optional[bool]]:
    incl = (
        fuzzy_eval(criteria_tree["inclusion"], criterion_probs)
        if "inclusion" in criteria_tree
        else None
    )
    excl = (
        fuzzy_eval(criteria_tree["exclusion"], criterion_probs)
        if "exclusion" in criteria_tree
        else None
    )

    if incl is not None and excl is not None:
        overall = round(min(incl, 1.0 - excl), 4)
    elif incl is not None:
        overall = incl
    elif excl is not None:
        overall = round(1.0 - excl, 4)
    else:
        overall = None

    binary = (overall >= 0.5) if overall is not None else None
    return incl, excl, overall, binary
