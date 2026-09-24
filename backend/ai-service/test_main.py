"""Tests for the FastAPI AI service.

Run with:  ./venv/bin/python -m pytest
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert "running" in res.json()["message"].lower()


def test_analyze_returns_expected_shape():
    res = client.post(
        "/analyze",
        json={
            "resume": "Experienced Python developer skilled in SQL, React and machine learning.",
            "job": "",
        },
    )
    assert res.status_code == 200
    data = res.json()

    for key in [
        "match_percentage",
        "resume_score",
        "ml_predicted_career",
        "extracted_skills",
        "missing_skills",
        "recommended_jobs",
    ]:
        assert key in data

    # Skills present in the text should be extracted.
    assert "python" in [s.lower() for s in data["extracted_skills"]]


def test_analyze_match_percentage_zero_without_job():
    res = client.post("/analyze", json={"resume": "Python developer", "job": ""})
    assert res.json()["match_percentage"] == 0


def test_analyze_tolerates_null_job():
    # An empty form field arrives as null; it must not 422.
    res = client.post("/analyze", json={"resume": "Python developer", "job": None})
    assert res.status_code == 200
    assert res.json()["match_percentage"] == 0


def test_analyze_match_percentage_positive_with_relevant_job():
    res = client.post(
        "/analyze",
        json={
            "resume": "Python developer with SQL and machine learning experience.",
            "job": "Hiring a Python developer with SQL and machine learning skills.",
        },
    )
    assert res.json()["match_percentage"] > 0


def test_analyze_empty_resume_returns_valid_response():
    """Empty PDF extraction produces an empty string; service must not crash."""
    res = client.post("/analyze", json={"resume": "", "job": ""})
    assert res.status_code == 200
    data = res.json()
    assert data["extracted_skills"] == []
    assert data["match_percentage"] == 0
    assert data["resume_score"] == 0


def test_analyze_whitespace_only_resume():
    """Whitespace-only text (blank pages) must also be handled gracefully."""
    res = client.post("/analyze", json={"resume": "   \n\t  ", "job": ""})
    assert res.status_code == 200
    assert res.json()["extracted_skills"] == []


def test_extracts_skills_with_symbols_and_aliases():
    res = client.post(
        "/analyze",
        json={"resume": "Firmware in C++ and C#, APIs in NodeJS, deployed on K8s with CI/CD.", "job": ""},
    )
    skills = res.json()["extracted_skills"]
    for skill in ["c++", "c#", "node.js", "kubernetes", "ci/cd"]:
        assert skill in skills


def test_analyze_returns_ranked_careers_with_confidence():
    res = client.post(
        "/analyze",
        json={"resume": "Backend developer building REST APIs with PHP, Laravel, MySQL and Git.", "job": ""},
    )
    data = res.json()
    assert data["ml_predicted_career"] == "Backend Developer"
    assert len(data["top_careers"]) == 3
    assert data["top_careers"][0]["career"] == data["ml_predicted_career"]
    assert data["career_confidence"] == data["top_careers"][0]["confidence"]
    confidences = [c["confidence"] for c in data["top_careers"]]
    assert confidences == sorted(confidences, reverse=True)


def test_every_career_has_courses_and_questions():
    from main import model
    from courses_db import COURSES
    from interview_questions import QUESTIONS
    from skills_db import CAREER_MAPPING

    for career in model.classes_:
        assert career in CAREER_MAPPING
        assert COURSES.get(career)
        assert QUESTIONS.get(career)


def test_match_combines_skill_overlap_and_text_similarity():
    res = client.post(
        "/match",
        json={
            "applicant_skills": ["php", "laravel", "sql"],
            "required_skills": ["php", "laravel", "sql", "docker"],
            "applicant_text": "php laravel sql developer",
            "job_text": "laravel php developer with sql and docker",
        },
    )
    data = res.json()
    assert data["matched_skills"] == ["php", "laravel", "sql"]
    assert data["missing_skills"] == ["docker"]
    assert data["skill_ratio"] == 75.0
    expected = round((0.75 * 0.70 + data["text_similarity"] / 100 * 0.30) * 100, 2)
    assert abs(data["score"] - expected) < 0.05


def test_match_without_required_skills_uses_text_only():
    res = client.post(
        "/match",
        json={"applicant_text": "python developer", "job_text": "python developer"},
    )
    data = res.json()
    assert data["skill_ratio"] == 0
    assert data["score"] == data["text_similarity"]


def test_stop_word_only_text_does_not_crash():
    res = client.post("/analyze", json={"resume": "the and of", "job": "the and of"})
    assert res.status_code == 200
    assert res.json()["match_percentage"] == 0

    res = client.post("/match", json={"applicant_text": "!!!", "job_text": "???"})
    assert res.status_code == 200
    assert res.json()["score"] == 0


def test_very_large_resume_is_truncated_not_rejected():
    res = client.post("/analyze", json={"resume": "python developer " * 150_000, "job": ""})
    assert res.status_code == 200
    assert "python" in res.json()["extracted_skills"]


def test_too_little_text_is_flagged_instead_of_guessing():
    res = client.post("/analyze", json={"resume": "hello there", "job": ""})
    data = res.json()
    assert data["insufficient_text"] is True
    assert data["ml_predicted_career"] is None
    assert data["top_careers"] == []
    assert data["resume_score"] == 0


def test_score_and_gaps_follow_the_predicted_career():
    res = client.post(
        "/analyze",
        json={"resume": "Frontend developer building React and TypeScript interfaces with HTML, CSS and Git.", "job": ""},
    )
    data = res.json()
    assert data["ml_predicted_career"] == "Frontend Developer"
    assert set(data["missing_skills"]).isdisjoint(data["extracted_skills"])
    assert data["resume_score"] > 50


def test_common_words_are_not_mistaken_for_skills():
    res = client.post(
        "/analyze",
        json={"resume": "I react quickly, express ideas clearly and joined in spring. Worked in R&D.", "job": ""},
    )
    skills = res.json()["extracted_skills"]
    for word in ["express", "spring", "r"]:
        assert word not in skills

    res = client.post("/analyze", json={"resume": "Built APIs with Express.js and Spring Boot, analysed data in R.", "job": ""})
    skills = res.json()["extracted_skills"]
    for word in ["express", "spring", "r"]:
        assert word in skills


def test_match_normalises_skill_names():
    res = client.post(
        "/match",
        json={
            "applicant_skills": ["python", "React.js", "python"],
            "required_skills": ["Python ", "react", ""],
        },
    )
    data = res.json()
    assert data["matched_skills"] == ["python", "react"]
    assert data["missing_skills"] == []
    assert data["skill_ratio"] == 100.0


def test_feed_survives_a_failing_source(monkeypatch):
    import job_sources
    import requests

    def broken(keyword, limit=50):
        raise requests.ConnectionError("down")

    def working(keyword, limit=50):
        return [{"source": "wwr", "external_id": "wwr-1", "title": "Machine Learning Engineer"}]

    monkeypatch.setattr(job_sources, "SOURCES", {"wwr": working, "remoteok": broken, "adzuna": broken})
    res = client.get("/jobs/feed", params={"keyword": "machine learning", "limit": 5})
    assert res.status_code == 200
    assert [j["external_id"] for j in res.json()["jobs"]] == ["wwr-1"]


def test_feed_dates_are_normalised_to_utc():
    from job_sources import _iso_utc

    assert _iso_utc("Thu, 24 Sep 2026 20:30:00 +0545") == "2026-09-24 14:45:00"
    assert _iso_utc("2026-09-24T10:00:00Z") == "2026-09-24 10:00:00"
    assert _iso_utc("not a date") is None
