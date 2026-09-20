"""Pull the candidate's own location out of a resume.

Resumes put it in the contact block near the top ("Austin, TX", "London, UK",
"Kathmandu, Nepal"), usually on the same line as the email or phone number.
That header is searched first with explicit patterns; spaCy's GPE entities are
the fallback for layouts the patterns miss.
"""

import re

US_STATES = {
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
    "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
    "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
    "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
    "wi", "wy", "dc",
}

# "Remote" is a work arrangement, not a home city, but it is worth reporting
# because it should widen a job search rather than narrow it.
REMOTE_WORDS = {"remote", "anywhere", "worldwide"}

# Words that look like a city to a regex but never are, in resume headers.
NOT_A_PLACE = {
    "summary", "experience", "education", "skills", "projects", "profile",
    "objective", "contact", "certifications", "languages", "references",
    "linkedin", "github", "portfolio", "email", "phone", "mobile", "present",
    "curriculum", "vitae", "resume",
}

# "Austin, TX" / "New York, NY"
CITY_STATE = re.compile(
    r"\b([A-Z][a-zA-Z.'-]+(?:[ -][A-Z][a-zA-Z.'-]+){0,2}),\s*([A-Z]{2})\b(?!\w)"
)
# "London, United Kingdom" / "Kathmandu, Nepal"
CITY_COUNTRY = re.compile(
    r"\b([A-Z][a-zA-Z.'-]+(?:[ -][A-Z][a-zA-Z.'-]+){0,2}),\s*"
    r"([A-Z][a-zA-Z.'-]+(?:[ -][A-Z][a-zA-Z.'-]+){0,2})\b"
)
# "Based in Berlin" / "Location: Pokhara"
LABELLED = re.compile(
    r"(?:location|based in|address|city)\s*[:\-]?\s*"
    r"([A-Z][a-zA-Z.'-]+(?:[ ,-][A-Za-z.'-]+){0,3})",
    re.IGNORECASE,
)


def _clean(value):
    return re.sub(r"\s+", " ", (value or "").strip(" \t,|·-"))


def _is_plausible(city):
    words = city.lower().split()
    return bool(words) and not any(w in NOT_A_PLACE for w in words)


SECTION_HEADINGS = {
    "summary", "profile", "objective", "experience", "work experience",
    "professional experience", "employment", "education", "skills",
    "technical skills", "projects", "certifications", "achievements",
    "about me", "career objective",
}


def _header(text):
    """The contact block: everything above the first section heading.

    Stopping there matters - an employer's city in the experience section
    ("Worked at Google, CA") would otherwise be read as the candidate's own.
    """
    lines = []
    for line in text.splitlines()[:15]:
        if line.strip().strip(":").lower() in SECTION_HEADINGS:
            break
        lines.append(line)
    return "\n".join(lines)


def extract_location(text, doc=None):
    """Return the candidate's location as a display string, or None.

    `doc` is an already-parsed spaCy document; passing it avoids parsing the
    resume a second time.
    """
    if not text:
        return None

    header = _header(text)

    match = CITY_STATE.search(header)
    if match and match.group(2).lower() in US_STATES and _is_plausible(match.group(1)):
        return "%s, %s" % (_clean(match.group(1)), match.group(2).upper())

    match = LABELLED.search(header)
    if match and _is_plausible(match.group(1)):
        return _clean(match.group(1))

    match = CITY_COUNTRY.search(header)
    if match and _is_plausible(match.group(1)) and _is_plausible(match.group(2)):
        return "%s, %s" % (_clean(match.group(1)), _clean(match.group(2)))

    for line in header.splitlines():
        for word in re.findall(r"[A-Za-z]+", line):
            if word.lower() in REMOTE_WORDS:
                return "Remote"

    # Fallback: the first place name spaCy finds in the header.
    if doc is not None:
        for ent in doc.ents:
            if ent.label_ in ("GPE", "LOC") and ent.start_char < len(header):
                if _is_plausible(ent.text):
                    return _clean(ent.text)
    return None
