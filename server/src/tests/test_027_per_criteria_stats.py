import pytest

from src.tools.per_criteria_stats import compute_criterion_irr

# gwet_ac1 warns about divisions by zero on small or degenerate data sets
pytestmark = [pytest.mark.unit, pytest.mark.filterwarnings("ignore::RuntimeWarning")]

NO_AGREEMENT_DATA = {
    "krippendorff_alpha": None,
    "percent_agreement": None,
    "gwet_ac1": None,
    "n_papers": 0,
}


def test_no_raters_gives_no_statistics():
    assert compute_criterion_irr({}) == NO_AGREEMENT_DATA


def test_a_single_rater_gives_no_statistics():
    assert compute_criterion_irr({"a": {"p1": 0.9, "p2": 0.1}}) == NO_AGREEMENT_DATA


def test_raters_that_agree_get_high_agreement():
    result = compute_criterion_irr(
        {
            "a": {"p1": 0.9, "p2": 0.1, "p3": 0.8},
            "b": {"p1": 0.8, "p2": 0.2, "p3": 0.9},
        }
    )

    assert result["n_papers"] == 3
    assert result["percent_agreement"] == 1.0
    assert result["gwet_ac1"] == 1.0
    assert result["krippendorff_alpha"] == pytest.approx(0.9626, abs=1e-4)


def test_raters_that_disagree_get_negative_agreement():
    result = compute_criterion_irr(
        {"a": {"p1": 0.9, "p2": 0.1}, "b": {"p1": 0.1, "p2": 0.9}}
    )

    assert result["n_papers"] == 2
    assert result["percent_agreement"] == 0.0
    assert result["gwet_ac1"] == -1.0
    assert result["krippendorff_alpha"] == pytest.approx(-0.5, abs=1e-4)


def test_percent_agreement_is_the_share_of_papers_with_the_same_binary_decision():
    result = compute_criterion_irr(
        {
            "a": {"p1": 0.9, "p2": 0.9, "p3": 0.1, "p4": 0.1},
            "b": {"p1": 0.8, "p2": 0.2, "p3": 0.3, "p4": 0.7},
        }
    )

    # p1 and p3 agree, p2 and p4 do not
    assert result["percent_agreement"] == 0.5


def test_a_probability_of_exactly_one_half_counts_as_include():
    result = compute_criterion_irr(
        {"a": {"p1": 0.5, "p2": 0.4}, "b": {"p1": 0.6, "p2": 0.3}}
    )

    assert result["percent_agreement"] == 1.0


def test_constant_ratings_agree_but_have_no_defined_krippendorff_alpha():
    result = compute_criterion_irr(
        {"a": {"p1": 0.9, "p2": 0.9}, "b": {"p1": 0.9, "p2": 0.9}}
    )

    assert result["krippendorff_alpha"] is None
    assert result["percent_agreement"] == 1.0
    assert result["gwet_ac1"] == 1.0
    assert result["n_papers"] == 2


def test_only_papers_rated_by_at_least_two_raters_count():
    result = compute_criterion_irr(
        {
            "a": {"p1": 0.9, "p2": 0.1, "only_a": 0.9},
            "b": {"p1": 0.8, "p2": 0.2, "only_b": 0.1},
        }
    )

    assert result["n_papers"] == 2
    assert result["percent_agreement"] == 1.0


def test_missing_ratings_are_ignored():
    result = compute_criterion_irr(
        {
            "a": {"p1": 0.9, "p2": None, "p3": 0.1},
            "b": {"p1": 0.8, "p2": 0.9, "p3": 0.2},
        }
    )

    assert result["n_papers"] == 2
    assert result["percent_agreement"] == 1.0


def test_raters_without_any_shared_paper_give_no_statistics():
    result = compute_criterion_irr(
        {"a": {"p1": None, "p2": 0.9}, "b": {"p1": 0.9, "p2": None}}
    )

    assert result == NO_AGREEMENT_DATA


def test_three_raters_are_supported():
    result = compute_criterion_irr(
        {
            "a": {"p1": 0.9, "p2": 0.1},
            "b": {"p1": 0.8, "p2": 0.2},
            "c": {"p1": 0.7, "p2": 0.3},
        }
    )

    assert result["n_papers"] == 2
    assert result["percent_agreement"] == 1.0


def test_the_result_does_not_depend_on_rater_order():
    ratings = {
        "a": {"p1": 0.9, "p2": 0.1, "p3": 0.6},
        "b": {"p1": 0.8, "p2": 0.4, "p3": 0.2},
    }
    reversed_ratings = dict(reversed(list(ratings.items())))

    assert compute_criterion_irr(ratings) == compute_criterion_irr(reversed_ratings)
