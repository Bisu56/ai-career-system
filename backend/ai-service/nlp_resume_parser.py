import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")


def extract_entities(text):
    doc = nlp(text)
    
    entities = {
        "name": None,
        "emails": [],
        "organizations": [],
        "skills": []
    }
    
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            entities["name"] = ent.text
        elif ent.label_ == "ORG":
            entities["organizations"].append(ent.text)
    
    import re
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    entities["emails"] = emails
    
    return entities
