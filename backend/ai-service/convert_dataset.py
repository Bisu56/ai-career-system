import pandas as pd

df = pd.read_csv("../../archive/AI-based Career Recommendation System.csv")

career_map = {
    "Data Scientist": "Data Scientist",
    "Software Engineer": "Software Engineer",
    "UX Designer": "UX Designer",
    "AI Researcher": "AI Researcher",
    "Project Manager": "Project Manager",
    "Embedded Systems Engineer": "Embedded Systems Engineer",
    "Data Analyst": "Data Analyst",
    "Digital Marketer": "Digital Marketer",
    "NLP Engineer": "NLP Engineer",
    "Financial Analyst": "Financial Analyst",
    "Research Scientist": "Research Scientist",
    "Front-end Developer": "Frontend Developer",
    "Software Developer": "Software Developer",
    "Machine Learning Engineer": "ML Engineer",
    "Marketing Manager": "Marketing Manager",
    "Full Stack Developer": "Full Stack Developer",
    "AI Specialist": "AI Specialist",
    "Cybersecurity Analyst": "Cybersecurity Analyst",
    "Research Analyst": "Research Analyst",
    "DevOps Engineer": "DevOps Engineer",
    "Graphic Designer": "Graphic Designer",
    "Deep Learning Engineer": "ML Engineer",
    "Business Analyst": "Business Analyst",
    "Backend Developer": "Backend Developer",
    "Biostatistician": "Data Scientist",
    "Content Strategist": "Digital Marketer",
    "Mobile Developer": "Mobile Developer",
    "UX Researcher": "UX Designer",
    "Cybersecurity Specialist": "Cybersecurity Analyst",
    "Cloud Engineer": "DevOps Engineer",
    "Automation Engineer": "DevOps Engineer",
}

records = []
for _, row in df.iterrows():
    skills = row["Skills"].replace(";", " ")
    career = career_map.get(row["Recommended_Career"], row["Recommended_Career"])
    records.append({"text": skills.lower(), "career": career})

new_df = pd.DataFrame(records)
new_df.to_csv("dataset/careers.csv", index=False)
print(f"Converted {len(new_df)} records")
print(new_df["career"].value_counts())