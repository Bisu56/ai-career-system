from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

class ResumeRequest(BaseModel):
    resume: str
    job: str

@app.post("/analyze")
async def analyze(data: ResumeRequest):
    resume_text = data.resume
    job_text = data.job

    vectorizer = TfidfVectorizer(stop_words='english')

    vectors = vectorizer.fit_transform([resume_text, job_text])

    similarity = cosine_similarity(vectors[0], vectors[1])[0][0]

    match_percentage = round(similarity * 100, 2)

    return {
        "match_percentage": match_percentage
    }
