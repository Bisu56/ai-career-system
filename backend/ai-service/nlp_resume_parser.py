import re
import subprocess
import sys

import spacy

NER_ONLY = ["tagger", "parser", "lemmatizer", "attribute_ruler"]

try:
    nlp = spacy.load("en_core_web_sm", disable=NER_ONLY)
except OSError:
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
    nlp = spacy.load("en_core_web_sm", disable=NER_ONLY)

EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')


def extract_entities(text):
    doc = nlp(text)

    entities = {
        "name": None,
        "emails": [],
        "organizations": [],
        "skills": []
    }

    for ent in doc.ents:
        if ent.label_ == "PERSON" and entities["name"] is None:
            entities["name"] = ent.text.strip()
        elif ent.label_ == "ORG" and ent.text.strip() not in entities["organizations"]:
            entities["organizations"].append(ent.text.strip())

    entities["emails"] = list(dict.fromkeys(EMAIL_PATTERN.findall(text)))

    return entities
