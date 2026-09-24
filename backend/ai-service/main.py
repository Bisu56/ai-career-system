from typing import Optional, List

from fastapi import FastAPI
from pydantic import BaseModel, field_validator
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import re

from skills_db import SKILLS_DATABASE, SKILL_ALIASES, CAREER_MAPPING, JOBS
from nlp_resume_parser import extract_entities
from resume_suggestions import generate_resume_suggestions
from interview_questions import get_interview_questions
from courses_db import COURSES
from job_sources import fetch_all, adzuna_enabled

app = FastAPI()

try:
    model = joblib.load("model.pkl")
    vectorizer = joblib.load("vectorizer.pkl")
except Exception as e:
    raise RuntimeError(
        f"Failed to load ML model files: {e}. "
        "Run 'python train_model.py' to regenerate them."
    ) from e

class ResumeRequest(BaseModel):
    resume: str
    # Optional: tolerate null/missing job so an empty field never 422s.
    job: Optional[str] = ""

    @field_validator("job", mode="before")
    @classmethod
    def _none_to_empty(cls, v):
        return v or ""


MAX_TEXT_CHARS = 200_000
MIN_WORDS = 25

CASE_SENSITIVE_SKILLS = {
    "r": re.compile(r'(?<![A-Za-z0-9])R(?![A-Za-z0-9&+#])'),
    "express": re.compile(r'(?<![A-Za-z0-9])(?:Express(?:\.?js)?|express\.?js)(?![A-Za-z0-9])'),
    "spring": re.compile(r'(?<![A-Za-z0-9])Spring(?: ?Boot| Framework| MVC)?(?![A-Za-z0-9])'),
}

SKILL_PATTERNS = {
    skill: re.compile(
        r'(?<![a-z0-9])(?:'
        + '|'.join(re.escape(term.lower()) for term in [skill] + SKILL_ALIASES.get(skill, []))
        + r')(?![a-z0-9])'
    )
    for skill in SKILLS_DATABASE
    if skill not in CASE_SENSITIVE_SKILLS
}

CANONICAL_SKILLS = {
    **{skill: skill for skill in SKILLS_DATABASE},
    **{alias: skill for skill, aliases in SKILL_ALIASES.items() for alias in aliases},
}


def canonical_skills(skills):
    result = []
    for skill in skills:
        name = CANONICAL_SKILLS.get(skill.strip().lower(), skill.strip().lower())
        if name and name not in result:
            result.append(name)
    return result


def extract_skills(text):
    text_lower = text.lower()
    return [
        skill for skill in SKILLS_DATABASE
        if (CASE_SENSITIVE_SKILLS[skill].search(text) if skill in CASE_SENSITIVE_SKILLS
            else SKILL_PATTERNS[skill].search(text_lower))
    ]


def text_similarity(first, second):
    if not first.strip() or not second.strip():
        return 0.0
    try:
        vectors = TfidfVectorizer(stop_words='english').fit_transform([first, second])
    except ValueError:
        return 0.0
    return float(cosine_similarity(vectors[0], vectors[1])[0][0])


def predict_career_rule_based(skills):
    best_match = None
    best_score = 0
    
    for career, required_skills in CAREER_MAPPING.items():
        match_count = len(set(skills) & set(required_skills))
        if match_count > best_score:
            best_score = match_count
            best_match = career
    
    return best_match


def rank_careers_ml(text, top=3):
    vector = vectorizer.transform([text])
    probabilities = model.predict_proba(vector)[0]
    ranked = sorted(zip(model.classes_, probabilities), key=lambda x: x[1], reverse=True)
    return [
        {"career": career, "confidence": round(float(p) * 100, 2)}
        for career, p in ranked[:top]
    ]


def calculate_resume_score(skills, career):
    if career in CAREER_MAPPING:
        required = CAREER_MAPPING[career]
        match_count = len(set(skills) & set(required))
        score = (match_count / len(required)) * 100
        return round(score, 2)
    return 0


def get_missing_skills(skills, career):
    if career in CAREER_MAPPING:
        required = CAREER_MAPPING[career]
        missing = set(required) - set(skills)
        return list(missing)
    return []


def recommend_jobs(user_skills):
    recommendations = []
    
    for job in JOBS:
        score = len(set(user_skills) & set(job["skills"]))
        if score > 0:
            recommendations.append({
                "title": job["title"],
                "score": score,
                "skills": job["skills"]
            })
    
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations


@app.post("/analyze")
def analyze(data: ResumeRequest):
    resume_text = data.resume[:MAX_TEXT_CHARS]
    job_text = data.job[:MAX_TEXT_CHARS]

    entities = extract_entities(resume_text)
    extracted_skills = extract_skills(resume_text)

    match_percentage = round(text_similarity(resume_text, job_text) * 100, 2) if job_text else 0

    rule_based_career = predict_career_rule_based(extracted_skills)
    insufficient_text = len(resume_text.split()) < MIN_WORDS and not extracted_skills

    if insufficient_text:
        top_careers = []
        ml_career = None
    else:
        top_careers = rank_careers_ml(" ".join([resume_text] + extracted_skills))
        ml_career = top_careers[0]["career"]

    resume_score = calculate_resume_score(extracted_skills, ml_career)
    missing_skills = get_missing_skills(extracted_skills, ml_career)
    recommended_jobs = recommend_jobs(extracted_skills)

    suggestions = generate_resume_suggestions(missing_skills, resume_score)
    courses = COURSES.get(ml_career, [])
    questions = get_interview_questions(ml_career)

    return {
        "match_percentage": match_percentage,
        "resume_score": resume_score,
        "rule_based_career": rule_based_career,
        "ml_predicted_career": ml_career,
        "career_confidence": top_careers[0]["confidence"] if top_careers else 0,
        "top_careers": top_careers,
        "insufficient_text": insufficient_text,
        "entities": entities,
        "extracted_skills": extracted_skills,
        "missing_skills": missing_skills,
        "recommended_jobs": recommended_jobs,
        "recommended_courses": courses,
        "interview_questions": questions,
        "resume_suggestions": suggestions
    }


@app.get("/")
async def root():
    return {"message": "AI Career Prediction Service is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/jobs/sources")
async def jobs_sources():
    return {"adzuna_enabled": adzuna_enabled()}


@app.get("/jobs/feed")
def jobs_feed(keyword: str = "python", limit: int = 50):
    """Fetch live job listings from free public sources."""
    jobs = fetch_all(keyword=keyword, limit=max(1, min(limit, 100)))
    return {"jobs": jobs}


# ──────────────────────────────────────────────────────────────────
# Employer / applicant matching endpoint
# ──────────────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    applicant_skills: List[str] = []
    required_skills: List[str] = []
    applicant_text: Optional[str] = ""
    job_text: Optional[str] = ""
    experience_level: Optional[str] = None
    education: Optional[str] = None

    @field_validator("applicant_text", "job_text", mode="before")
    @classmethod
    def _none_to_empty(cls, v):
        return v or ""


@app.post("/match")
def match_applicant(data: MatchRequest):
    """
    Compare an applicant's profile against job requirements and return an AI match score.

    Scoring strategy:
      - 70%  skill overlap  (structured: required_skills vs applicant_skills)
      - 30%  TF-IDF cosine similarity between applicant text and job text

    Returns a score 0-100 along with matched/missing skill lists.
    """
    req_skills  = canonical_skills(data.required_skills)
    appl_skills = canonical_skills(data.applicant_skills)

    # ── Skill component (70%) ──────────────────────────────────────
    if req_skills:
        matched = [s for s in req_skills if s in appl_skills]
        missing = [s for s in req_skills if s not in appl_skills]
        skill_ratio = len(matched) / len(req_skills)
    else:
        matched = []
        missing = []
        skill_ratio = 0.0

    # ── TF-IDF text similarity component (30%) ────────────────────
    similarity = text_similarity(data.applicant_text[:MAX_TEXT_CHARS], data.job_text[:MAX_TEXT_CHARS])

    # ── Combined score ─────────────────────────────────────────────
    if req_skills:
        score = (skill_ratio * 0.70 + similarity * 0.30) * 100
    else:
        # No required skills defined — rely entirely on text similarity
        score = similarity * 100

    return {
        "score": round(score, 2),
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_ratio": round(skill_ratio * 100, 2),
        "text_similarity": round(similarity * 100, 2),
    }
