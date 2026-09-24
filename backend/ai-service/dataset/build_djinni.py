import csv
import random
import re
from collections import defaultdict

import pyarrow.parquet as pq

SOURCE = "dataset/raw/djinni_cvs.parquet"
TARGET = "dataset/careers_djinni.csv"
PER_CAREER = 700
MAX_CHARS = 2000
SEED = 42


def has(text, *words):
    return any(re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", text) for w in words)


def career_for(keyword, position):
    p = position.lower()

    if keyword == "Data Science":
        if has(p, "nlp", "natural language"):
            return "NLP Engineer"
        if has(p, "research", "researcher"):
            return "Research Scientist"
        if has(p, "ml engineer", "machine learning engineer", "mlops", "ml"):
            return "ML Engineer"
        if has(p, "ai", "computer vision", "deep learning"):
            return "AI Specialist"
        return "Data Scientist"
    if keyword == "Data Analyst":
        return "Data Analyst"
    if keyword == "Data Engineer":
        return "Data Engineer"
    if keyword in ("DevOps", "Sysadmin"):
        return "DevOps Engineer"
    if keyword == "Security":
        return "Cybersecurity Analyst"
    if keyword in ("iOS", "Android", "Flutter"):
        return "Mobile Developer"
    if keyword == "C++":
        return "Embedded Systems Engineer" if has(p, "embedded", "firmware", "iot", "hardware") else None
    if keyword in ("JavaScript", "Node.js", "PHP", "Python", "Ruby", "Golang"):
        if has(p, "full stack", "fullstack", "full-stack"):
            return "Full Stack Developer"
        if keyword == "Python" and has(p, "ml", "machine learning", "data scientist"):
            return None
        if keyword == "JavaScript" and not has(p, "node", "backend", "back-end", "back end"):
            return "Frontend Developer"
        return "Backend Developer"
    if keyword in ("Java", ".NET"):
        if has(p, "full stack", "fullstack", "full-stack"):
            return "Full Stack Developer"
        return "Software Engineer" if has(p, "engineer") else "Software Developer"
    if keyword == "Design":
        if has(p, "graphic", "illustrator", "brand", "motion", "visual"):
            return "Graphic Designer"
        return "UX Designer"
    if keyword == "Artist":
        return "Graphic Designer"
    if keyword in ("Marketing", "SEO", "Lead Generation"):
        if has(p, "head", "cmo", "director", "marketing manager", "lead"):
            return "Marketing Manager"
        return "Digital Marketer"
    if keyword in ("Project Manager", "Product Manager", "Scrum Master"):
        return "Project Manager"
    if keyword == "Business Analyst":
        return "Business Analyst"
    return None


def main():
    random.seed(SEED)
    pools = defaultdict(list)
    seen = defaultdict(int)
    parquet = pq.ParquetFile(SOURCE)

    for batch in parquet.iter_batches(batch_size=5000, columns=["Position", "Primary Keyword", "CV"]):
        for position, keyword, cv in zip(*(batch.column(i).to_pylist() for i in range(3))):
            if not cv or not position:
                continue
            career = career_for(keyword or "", position)
            if career is None:
                continue
            text = re.sub(r"\s+", " ", f"{position}. {cv}").strip()[:MAX_CHARS]
            if len(text) < 120:
                continue
            seen[career] += 1
            pool = pools[career]
            if len(pool) < PER_CAREER:
                pool.append(text)
            else:
                j = random.randrange(seen[career])
                if j < PER_CAREER:
                    pool[j] = text

    with open(TARGET, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "career"])
        for career in sorted(pools):
            for text in pools[career]:
                writer.writerow([text, career])

    for career in sorted(pools):
        print(f"{career:28s} {len(pools[career]):5d} of {seen[career]}")


if __name__ == "__main__":
    main()
