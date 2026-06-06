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
