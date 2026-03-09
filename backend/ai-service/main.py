from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import re

from skills_db import SKILLS_DATABASE, CAREER_MAPPING, JOBS

app = FastAPI()

model = joblib.load("model.pkl")
vectorizer = joblib.load("vectorizer.pkl")

class ResumeRequest(BaseModel):
    resume: str
    job: str = ""


def extract_skills(text):
    text_lower = text.lower()
    found_skills = []
    for skill in SKILLS_DATABASE:
        if skill.lower() in text_lower:
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
    
    return {
        "match_percentage": match_percentage,
        "extracted_skills": extracted_skills,
        "missing_skills": missing_skills,
        "resume_score": resume_score,
        "rule_based_career": rule_based_career,
        "ml_predicted_career": ml_career,
        "recommended_jobs": recommended_jobs
    }


@app.get("/")
async def root():
    return {"message": "AI Career Prediction Service is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
