from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, field_validator
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import re

from skills_db import SKILLS_DATABASE, CAREER_MAPPING, JOBS
from nlp_resume_parser import extract_entities
from resume_suggestions import generate_resume_suggestions
from interview_questions import get_interview_questions
from courses_db import COURSES
from job_sources import load_jobs, match_jobs, score_skill_match, tag_skills

app = FastAPI()

model = joblib.load("model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

class JobSearchRequest(BaseModel):
    skills: list[str] = []
    career: Optional[str] = ""
    search: Optional[str] = ""
    location: Optional[str] = ""
    home_location: Optional[str] = ""
    remote_only: bool = False
    min_match: float = 0
    limit: int = 30
    refresh: bool = False

    @field_validator("career", "search", "location", "home_location", mode="before")
    @classmethod
    def _null_to_empty(cls, v):
        return v or ""


class JobPostRequest(BaseModel):
    """A job description to pull required skills out of."""
    title: Optional[str] = ""
    description: Optional[str] = ""
    skills: list[str] = []

    @field_validator("title", "description", mode="before")
    @classmethod
    def _null_to_empty(cls, v):
        return v or ""


class Applicant(BaseModel):
    id: int
    skills: list[str] = []
    career: Optional[str] = ""
    resume_text: Optional[str] = ""

    @field_validator("career", "resume_text", mode="before")
    @classmethod
    def _null_to_empty(cls, v):
        return v or ""


class MatchRequest(BaseModel):
    job: JobPostRequest
    applicants: list[Applicant] = []


class ResumeRequest(BaseModel):
    resume: str
    # Optional: tolerate null/missing job so an empty field never 422s.
    job: Optional[str] = ""

    @field_validator("job", mode="before")
    @classmethod
    def _none_to_empty(cls, v):
        return v or ""


def extract_skills(text):
    text_lower = text.lower()
    found_skills = []
    for skill in SKILLS_DATABASE:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    return found_skills


def predict_career_rule_based(skills):
    best_match = None
    best_score = 0
    
    for career, required_skills in CAREER_MAPPING.items():
        match_count = len(set(skills) & set(required_skills))
        if match_count > best_score:
            best_score = match_count
            best_match = career
    
    return best_match


def predict_career_ml(text):
    vector = vectorizer.transform([text])
    prediction = model.predict(vector)
    return prediction[0]


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
async def analyze(data: ResumeRequest):
    resume_text = data.resume
    job_text = data.job
    
    entities = extract_entities(resume_text)
    extracted_skills = extract_skills(resume_text)
    
    if job_text:
        vectorizer_tfidf = TfidfVectorizer(stop_words='english')
        vectors = vectorizer_tfidf.fit_transform([resume_text, job_text])
        similarity = cosine_similarity(vectors[0], vectors[1])[0][0]
        match_percentage = round(similarity * 100, 2)
    else:
        match_percentage = 0
    
    rule_based_career = predict_career_rule_based(extracted_skills)
    ml_career = predict_career_ml(resume_text)
    
    resume_score = calculate_resume_score(extracted_skills, rule_based_career)
    missing_skills = get_missing_skills(extracted_skills, rule_based_career)
    recommended_jobs = recommend_jobs(extracted_skills)
    
    suggestions = generate_resume_suggestions(missing_skills, resume_score)
    courses = COURSES.get(ml_career, [])
    questions = get_interview_questions(ml_career)
    
    return {
        "match_percentage": match_percentage,
        "location": entities.get("location"),
        "resume_score": resume_score,
        "rule_based_career": rule_based_career,
        "ml_predicted_career": ml_career,
        "entities": entities,
        "extracted_skills": extracted_skills,
        "missing_skills": missing_skills,
        "recommended_jobs": recommended_jobs,
        "recommended_courses": courses,
        "interview_questions": questions,
        "resume_suggestions": suggestions
    }


@app.post("/jobs")
async def jobs(data: JobSearchRequest):
    """Live listings from free job APIs, ranked against the resume's skills."""
    jobs, meta = load_jobs(tags=data.skills, refresh=data.refresh)
    ranked = match_jobs(
        jobs,
        user_skills=data.skills,
        career=data.career,
        search=data.search,
        location=data.location,
        home_location=data.home_location,
        remote_only=data.remote_only,
        min_match=data.min_match,
    )
    return {
        "total": len(ranked),
        "jobs": ranked[: max(1, data.limit)],
        "sources": ["Jobicy", "Arbeitnow"],
        "meta": meta,
    }

def job_required_skills(job):
    """The skills a posting asks for: whatever the employer typed, plus any
    the description mentions. Employers rarely fill the skills box completely,
    so reading the body too keeps ranking useful either way."""
    named = [s.strip() for s in (job.skills or []) if s.strip()]
    detected = tag_skills(job.title, job.description)
    # Preserve the employer's own wording and ordering first.
    seen = {s.lower() for s in named}
    return named + [s for s in detected if s.lower() not in seen]


@app.post("/job-skills")
async def job_skills(job: JobPostRequest):
    """Skills implied by a job description - used to tag a posting on save."""
    return {"skills": job_required_skills(job)}


@app.post("/match")
async def match(data: MatchRequest):
    """Rank applicants against one job post, best fit first.

    Uses the same weighted scorer as the live job listings, so a percentage
    means the same thing to the employer and to the candidate.
    """
    required = job_required_skills(data.job)
    title_words = set(re.findall(r"[a-z]+", (data.job.title or "").lower()))

    ranked = []
    for applicant in data.applicants:
        skills = applicant.skills
        # Fall back to reading the resume text when no skills were stored.
        if not skills and applicant.resume_text:
            skills = extract_skills(applicant.resume_text)

        score, matched, missing = score_skill_match(required, skills)

        # A candidate whose predicted career echoes the job title is a better
        # lead than a bare skill overlap - the same nudge the job feed applies.
        career_words = set(re.findall(r"[a-z]+", applicant.career.lower())) - {
            "developer", "engineer", "analyst", "specialist"
        }
        if career_words & title_words:
            score = min(100.0, score + 15)

        ranked.append({
            "id": applicant.id,
            "match_percentage": round(score, 1),
            "matched_skills": matched,
            "missing_skills": missing[:8],
        })

    ranked.sort(key=lambda a: (a["match_percentage"], len(a["matched_skills"])), reverse=True)
    return {"required_skills": required, "applicants": ranked}

@app.get("/")
async def root():
    return {"message": "AI Career Prediction Service is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
