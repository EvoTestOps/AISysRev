import pytest

from src.tools.boolean_parser import (
    build_criteria_tree_with_expressions,
    compute_overall,
    extract_leaf_criteria,
    fuzzy_eval,
    parse_expression,
)

pytestmark = pytest.mark.unit

IDS = ["IC1", "IC2", "IC3", "EC1"]


# --- parse_expression -------------------------------------------------------


def test_single_criterion():
    assert parse_expression("IC1", IDS) == {"id": "IC1"}


def test_and_expression():
    assert parse_expression("IC1 AND IC2", IDS) == {
        "operator": "AND",
        "criteria": [{"id": "IC1"}, {"id": "IC2"}],
    }


def test_or_expression():
    assert parse_expression("IC1 OR IC2", IDS) == {
        "operator": "OR",
        "criteria": [{"id": "IC1"}, {"id": "IC2"}],
    }


def test_chained_operators_are_flattened_into_one_node():
    tree = parse_expression("IC1 AND IC2 AND IC3", IDS)

    assert tree["operator"] == "AND"
    assert [c["id"] for c in tree["criteria"]] == ["IC1", "IC2", "IC3"]


def test_and_binds_tighter_than_or():
    tree = parse_expression("IC1 OR IC2 AND IC3", IDS)

    assert tree == {
        "operator": "OR",
        "criteria": [
            {"id": "IC1"},
            {"operator": "AND", "criteria": [{"id": "IC2"}, {"id": "IC3"}]},
        ],
    }


def test_parentheses_override_precedence():
    tree = parse_expression("(IC1 OR IC2) AND IC3", IDS)

    assert tree == {
        "operator": "AND",
        "criteria": [
            {"operator": "OR", "criteria": [{"id": "IC1"}, {"id": "IC2"}]},
            {"id": "IC3"},
        ],
    }


def test_redundant_parentheses_are_dropped():
    assert parse_expression("((IC1))", IDS) == {"id": "IC1"}


def test_not_marks_a_single_criterion_as_negated():
    assert parse_expression("NOT EC1", IDS) == {"id": "EC1", "negate": True}


def test_not_can_be_combined_with_other_criteria():
    tree = parse_expression("IC1 AND NOT EC1", IDS)

    assert tree == {
        "operator": "AND",
        "criteria": [{"id": "IC1"}, {"id": "EC1", "negate": True}],
    }


def test_operators_and_ids_are_case_insensitive():
    assert parse_expression("ic1 and not ec1", IDS) == parse_expression(
        "IC1 AND NOT EC1", IDS
    )


def test_valid_ids_are_case_insensitive():
    assert parse_expression("IC1", ["ic1"]) == {"id": "IC1"}


def test_extra_whitespace_is_ignored():
    assert parse_expression("  IC1   AND\tIC2 ", IDS) == parse_expression(
        "IC1 AND IC2", IDS
    )


def test_not_applied_to_a_group_is_rejected_with_a_hint():
    with pytest.raises(ValueError, match="De Morgan"):
        parse_expression("NOT (IC1 OR IC2)", IDS)


@pytest.mark.parametrize("expr", ["", "   ", "\t\n"])
def test_empty_expression_is_rejected(expr: str):
    with pytest.raises(ValueError, match="Empty expression"):
        parse_expression(expr, IDS)


def test_unknown_criterion_is_rejected_and_valid_ids_are_listed():
    with pytest.raises(ValueError, match="Unknown criterion ID 'IC9'") as info:
        parse_expression("IC1 AND IC9", IDS)

    assert "EC1" in str(info.value)


def test_two_criteria_without_an_operator_are_rejected():
    with pytest.raises(ValueError, match="Unexpected token 'IC2'"):
        parse_expression("IC1 IC2", IDS)


def test_dangling_operator_is_rejected():
    with pytest.raises(ValueError, match="Unexpected end of expression"):
        parse_expression("IC1 AND", IDS)


def test_unmatched_closing_parenthesis_is_rejected():
    with pytest.raises(ValueError, match="Unexpected token '\\)'"):
        parse_expression("IC1)", IDS)


def test_a_group_that_is_not_closed_where_expected_is_rejected():
    with pytest.raises(ValueError, match="Expected '\\)', got 'IC2'"):
        parse_expression("(IC1 IC2)", IDS)


def test_operator_without_left_operand_is_rejected():
    with pytest.raises(ValueError, match="Unknown criterion ID 'AND'"):
        parse_expression("AND IC1", IDS)


@pytest.mark.xfail(
    strict=True,
    raises=IndexError,
    reason="An unclosed parenthesis raises IndexError instead of ValueError, so "
    "Criteria validation (which only catches ValueError) fails with a 500.",
)
def test_unclosed_parenthesis_is_rejected_with_a_value_error():
    with pytest.raises(ValueError):
        parse_expression("(IC1", IDS)


# --- build_criteria_tree_with_expressions -----------------------------------


def test_default_tree_requires_all_inclusion_and_any_exclusion():
    tree = build_criteria_tree_with_expressions(["a", "b"], ["c", "d"], None, None)

    assert tree["inclusion"] == {
        "operator": "AND",
        "criteria": [
            {"id": "IC1", "description": "a"},
            {"id": "IC2", "description": "b"},
        ],
    }
    assert tree["exclusion"] == {
        "operator": "OR",
        "criteria": [
            {"id": "EC1", "description": "c"},
            {"id": "EC2", "description": "d"},
        ],
    }


def test_tree_has_a_leaf_map_with_every_criterion():
    tree = build_criteria_tree_with_expressions(["a", "b"], ["c"], None, None)

    assert tree["_leaf_map"] == {"IC1": "a", "IC2": "b", "EC1": "c"}


def test_tree_without_exclusion_criteria_has_no_exclusion_branch():
    tree = build_criteria_tree_with_expressions(["a"], [], None, None)

    assert "inclusion" in tree
    assert "exclusion" not in tree


def test_tree_without_inclusion_criteria_has_no_inclusion_branch():
    tree = build_criteria_tree_with_expressions([], ["c"], None, None)

    assert "inclusion" not in tree
    assert "exclusion" in tree


def test_expression_replaces_the_default_operator_and_gets_descriptions():
    tree = build_criteria_tree_with_expressions(
        ["a", "b", "c"], ["d"], "IC1 AND (IC2 OR IC3)", None
    )

    assert tree["inclusion"] == {
        "operator": "AND",
        "criteria": [
            {"id": "IC1", "description": "a"},
            {
                "operator": "OR",
                "criteria": [
                    {"id": "IC2", "description": "b"},
                    {"id": "IC3", "description": "c"},
                ],
            },
        ],
    }
    # The exclusion side keeps its default
    assert tree["exclusion"]["operator"] == "OR"


def test_negated_leaves_keep_their_flag_and_get_a_description():
    tree = build_criteria_tree_with_expressions(["a"], ["d"], None, "NOT EC1")

    assert tree["exclusion"] == {"id": "EC1", "negate": True, "description": "d"}


def test_expression_may_refer_to_criteria_of_the_other_side():
    tree = build_criteria_tree_with_expressions(["a"], ["d"], "IC1 AND NOT EC1", None)

    leaves = extract_leaf_criteria(tree["inclusion"])
    assert [(leaf["id"], leaf["description"]) for leaf in leaves] == [
        ("IC1", "a"),
        ("EC1", "d"),
    ]


def test_invalid_expression_raises_a_value_error():
    with pytest.raises(ValueError, match="Unknown criterion ID 'IC7'"):
        build_criteria_tree_with_expressions(["a"], [], "IC7", None)


# --- extract_leaf_criteria --------------------------------------------------


def test_extract_leaf_criteria_from_a_single_leaf():
    assert extract_leaf_criteria({"id": "IC1"}) == [{"id": "IC1"}]


def test_extract_leaf_criteria_flattens_nested_groups_in_order():
    tree = parse_expression("IC1 AND (IC2 OR NOT IC3)", IDS)

    assert [leaf["id"] for leaf in extract_leaf_criteria(tree)] == [
        "IC1",
        "IC2",
        "IC3",
    ]


def test_extract_leaf_criteria_from_an_empty_node():
    assert extract_leaf_criteria({}) == []


# --- fuzzy_eval -------------------------------------------------------------


def test_a_leaf_evaluates_to_its_probability():
    assert fuzzy_eval({"id": "IC1"}, {"IC1": 0.73}) == 0.73


def test_a_negated_leaf_evaluates_to_the_complement():
    assert fuzzy_eval({"id": "IC1", "negate": True}, {"IC1": 0.3}) == 0.7


def test_a_leaf_without_a_probability_is_unknown():
    assert fuzzy_eval({"id": "IC1"}, {}) is None
    assert fuzzy_eval({"id": "IC1"}, {"IC1": None}) is None


def test_and_takes_the_minimum_and_or_takes_the_maximum():
    probs = {"IC1": 0.9, "IC2": 0.4}

    assert fuzzy_eval(parse_expression("IC1 AND IC2", IDS), probs) == 0.4
    assert fuzzy_eval(parse_expression("IC1 OR IC2", IDS), probs) == 0.9


def test_unknown_children_are_skipped():
    tree = parse_expression("IC1 AND IC2", IDS)

    assert fuzzy_eval(tree, {"IC1": 0.6, "IC2": None}) == 0.6


def test_a_group_of_only_unknown_children_is_unknown():
    tree = parse_expression("IC1 OR IC2", IDS)

    assert fuzzy_eval(tree, {"IC1": None}) is None


def test_nested_groups_are_evaluated_recursively():
    tree = parse_expression("IC1 AND (IC2 OR NOT IC3)", IDS)
    probs = {"IC1": 0.8, "IC2": 0.2, "IC3": 0.1}

    # OR(0.2, 1 - 0.1) = 0.9, AND(0.8, 0.9) = 0.8
    assert fuzzy_eval(tree, probs) == 0.8


def test_results_are_rounded_to_four_decimals():
    assert fuzzy_eval({"id": "IC1"}, {"IC1": 0.123456}) == 0.1235


def test_operator_defaults_to_and_and_is_case_insensitive():
    children = [{"id": "IC1"}, {"id": "IC2"}]
    probs = {"IC1": 0.9, "IC2": 0.4}

    assert fuzzy_eval({"criteria": children}, probs) == 0.4
    assert fuzzy_eval({"operator": "or", "criteria": children}, probs) == 0.9


# --- compute_overall --------------------------------------------------------


def _tree(inclusion=True, exclusion=True) -> dict:
    tree: dict = {}
    if inclusion:
        tree["inclusion"] = {"id": "IC1"}
    if exclusion:
        tree["exclusion"] = {"id": "EC1"}
    return tree


def test_overall_combines_inclusion_and_the_complement_of_exclusion():
    incl, excl, overall, binary = compute_overall(_tree(), {"IC1": 0.9, "EC1": 0.2})

    assert (incl, excl) == (0.9, 0.2)
    assert overall == 0.8  # min(0.9, 1 - 0.2)
    assert binary is True


def test_a_strong_exclusion_pulls_the_overall_probability_down():
    _, _, overall, binary = compute_overall(_tree(), {"IC1": 0.95, "EC1": 0.9})

    assert overall == 0.1
    assert binary is False


def test_overall_with_only_inclusion_criteria():
    incl, excl, overall, binary = compute_overall(_tree(exclusion=False), {"IC1": 0.7})

    assert (incl, excl, overall, binary) == (0.7, None, 0.7, True)


def test_overall_with_only_exclusion_criteria_is_the_complement():
    incl, excl, overall, binary = compute_overall(_tree(inclusion=False), {"EC1": 0.7})

    assert incl is None
    assert excl == 0.7
    assert overall == 0.3
    assert binary is False


def test_overall_uses_the_side_that_is_known_when_the_other_is_unknown():
    incl, excl, overall, _ = compute_overall(_tree(), {"IC1": 0.8})

    assert (incl, excl, overall) == (0.8, None, 0.8)


def test_overall_is_unknown_when_nothing_is_known():
    assert compute_overall(_tree(), {}) == (None, None, None, None)
    assert compute_overall({}, {"IC1": 0.9}) == (None, None, None, None)


@pytest.mark.parametrize(
    "inclusion_probability, expected", [(0.5, True), (0.4999, False), (0.51, True)]
)
def test_binary_decision_threshold_is_inclusive_at_one_half(
    inclusion_probability: float, expected: bool
):
    *_, binary = compute_overall(_tree(exclusion=False), {"IC1": inclusion_probability})

    assert binary is expected
