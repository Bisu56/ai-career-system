"""Live job listings from free, no-key public job APIs.

Two sources are queried and merged:

  * Jobicy      - remote tech roles, supports real keyword search via ?tag=
  * Arbeitnow   - a broad board (mostly EU), no search, so it is fetched whole

Results are normalised to one shape, cached on disk, and ranked against the
skills extracted from a resume. The disk cache means the Jobs page still works
when the machine is offline or a provider is down.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request

US_STATE_CODES = {
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
    "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
    "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
    "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
    "wi", "wy", "dc",
}

CACHE_PATH = os.path.join(os.path.dirname(__file__), "jobs_cache.json")
CACHE_TTL = 60 * 60 * 6  # 6 hours - job boards don't change faster than this
HTTP_TIMEOUT = 15

JOBICY_URL = "https://jobicy.com/api/v2/remote-jobs"
ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api"

# Skill vocabulary used to tag listings. Wider than SKILLS_DATABASE because a
# job post mentions far more technologies than the resume parser looks for.
JOB_SKILL_VOCAB = [
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "nodejs", "node.js", "laravel", "php", "django", "flask", "spring",
    "ruby", "rails", "golang", "rust", "c++", "c#", ".net", "kotlin",
    "swift", "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "pandas", "numpy", "scikit-learn", "data analysis", "data science",
    "power bi", "tableau", "excel", "spark", "hadoop", "airflow", "etl",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd",
    "aws", "azure", "gcp", "linux", "git", "graphql", "rest api", "api",
    "html", "css", "tailwind", "sass", "figma", "agile", "scrum",
]

# A few tokens are ambiguous in job copy and need a tighter rule than a plain
# word boundary. "PHP 25,000" is Philippine pesos, not the language; "excel at
# communication" is not a spreadsheet skill; bare "go" matches far too much.
SKILL_PATTERNS = {
    "excel": r"(?<![\w+#.])excel(?![\w+#.])(?!\s+(?:at|in|as)\b)",
}

# "PHP" is also the ISO code for the Philippine peso and shows up in salary
# lines ("1,000 PHP", "PHP 25,000") on a lot of listings that have nothing to
# do with the language. Amounts are scrubbed before any skill is matched.
_MONEY_PATTERNS = [
    re.compile(r"\b\d[\d,.]*\s*(?:php|usd|eur|gbp|inr|idr|cad|aud)\b"),
    re.compile(r"\b(?:php|usd|eur|gbp|inr|idr|cad|aud)\s*\d[\d,.]*"),
]


_DEFAULT = object()


# html/css/git/agile appear in nearly every listing, so a match on them says
# far less about fit than a match on a framework or a specialised tool. Scoring
# weights them down accordingly.
GENERIC_SKILLS = {
    "html", "css", "git", "api", "rest api", "sql", "linux", "excel",
    "agile", "scrum", "figma", "sass",
}


def skill_weight(skill):
    return 0.4 if skill in GENERIC_SKILLS else 1.0


def score_skill_match(job_skills, user_skills):
    """Weighted overlap between a job's skills and a candidate's.

    Shared by the live-listing ranking and the employer-side applicant
    ranking so a "72% match" means the same thing on both screens.
    Returns (match, matched, missing).
    """
    job_set = {s.lower() for s in (job_skills or [])}
    user = {s.lower() for s in (user_skills or [])}

    matched = sorted(user & job_set)
    missing = sorted(job_set - user)

    matched_weight = sum(skill_weight(s) for s in matched)
    job_weight = sum(skill_weight(s) for s in job_set)

    # Depth carries most of the weight: covering all of a three-line job
    # post is weaker evidence than sharing four specialised technologies
    # with a detailed one.
    coverage = matched_weight / job_weight if job_weight else 0.0
    depth = min(matched_weight / 4.0, 1.0)
    return 100 * (0.3 * coverage + 0.7 * depth), matched, missing


# Job boards rarely name a city - they write "USA", "Europe" or "Anywhere". A
# candidate in Austin, TX should still see a USA-wide listing flagged as
# nearby, so a home region is expanded to the broader terms boards actually use.
REGION_ALIASES = {
    "usa": {"usa", "united states", "u.s.", "us only", "north america", "americas"},
    "uk": {"uk", "united kingdom", "england", "britain", "europe"},
    "canada": {"canada", "north america", "americas"},
    "india": {"india", "asia", "apac"},
    "nepal": {"nepal", "asia", "apac"},
    "australia": {"australia", "apac", "oceania"},
    "germany": {"germany", "deutschland", "europe", "emea"},
    "france": {"france", "europe", "emea"},
}


def expand_region(parts):
    """Add the country/continent terms implied by a home location."""
    expanded = set(parts)
    for part in parts:
        if part in US_STATE_CODES or part in ("usa", "united states"):
            expanded |= REGION_ALIASES["usa"]
        for country, aliases in REGION_ALIASES.items():
            if part == country or part in aliases:
                expanded |= aliases
    return expanded


def _get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ai-career-system/1.0"})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _strip_html(text):
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", text).strip()


def tag_skills(*texts):
    """Return the skills mentioned anywhere in the given text fragments."""
    blob = " ".join(t for t in texts if t).lower()
    for money in _MONEY_PATTERNS:
        blob = money.sub(" ", blob)
    found = []
    for skill in JOB_SKILL_VOCAB:
        pattern = SKILL_PATTERNS.get(skill, _DEFAULT)
        if pattern is None:
            continue
        if pattern is _DEFAULT:
            pattern = r"(?<![\w+#.])" + re.escape(skill) + r"(?![\w+#.])"
        if re.search(pattern, blob):
            found.append(skill)
    return found


def _fetch_jobicy(tags):
    """Jobicy supports one tag per call, so query the user's top skills."""
    jobs = []
    seen = set()
    queries = tags[:4] or [None]
    for tag in queries:
        url = JOBICY_URL + "?count=50"
        if tag:
            url += "&tag=" + urllib.parse.quote(tag)
        try:
            payload = _get_json(url)
        except Exception:
            continue
        for j in payload.get("jobs", []):
            jid = "jobicy-%s" % j.get("id")
            if jid in seen:
                continue
            seen.add(jid)
            description = _strip_html(j.get("jobDescription") or j.get("jobExcerpt"))
            jobs.append({
                "id": jid,
                "source": "Jobicy",
                "title": j.get("jobTitle", ""),
                "company": j.get("companyName", ""),
                "company_logo": j.get("companyLogo") or "",
                "location": j.get("jobGeo") or "Remote",
                "job_type": ", ".join(j.get("jobType") or []) or "full_time",
                "level": ", ".join(j.get("jobLevel") or []) if isinstance(j.get("jobLevel"), list) else (j.get("jobLevel") or ""),
                "salary": _jobicy_salary(j),
                "url": j.get("url", ""),
                "posted_at": j.get("pubDate", ""),
                "remote": True,
                "description": description[:600],
                "skills": tag_skills(j.get("jobTitle"), description, str(j.get("jobIndustry"))),
            })
    return jobs


def _jobicy_salary(j):
    lo, hi = j.get("annualSalaryMin"), j.get("annualSalaryMax")
    cur = j.get("salaryCurrency") or "USD"
    if lo and hi:
        return "%s %s - %s" % (cur, f"{int(lo):,}", f"{int(hi):,}")
    if lo:
        return "%s %s+" % (cur, f"{int(lo):,}")
    return ""


def _fetch_arbeitnow(pages=2):
    jobs = []
    for page in range(1, pages + 1):
        try:
            payload = _get_json("%s?page=%d" % (ARBEITNOW_URL, page))
        except Exception:
            break
        for j in payload.get("data", []):
            description = _strip_html(j.get("description"))
            posted = j.get("created_at")
            jobs.append({
                "id": "arbeitnow-%s" % j.get("slug"),
                "source": "Arbeitnow",
                "title": j.get("title", ""),
                "company": j.get("company_name", ""),
                "company_logo": "",
                "location": j.get("location") or "",
                "job_type": ", ".join(j.get("job_types") or []) or "",
                "level": "",
                "salary": "",
                "url": j.get("url", ""),
                "posted_at": _epoch_to_iso(posted),
                "remote": bool(j.get("remote")),
                "description": description[:600],
                "skills": tag_skills(j.get("title"), description, " ".join(j.get("tags") or [])),
            })
    return jobs


def _epoch_to_iso(value):
    try:
        return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(int(value)))
    except (TypeError, ValueError):
        return ""


def _read_cache():
    try:
        with open(CACHE_PATH) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def _write_cache(jobs):
    try:
        with open(CACHE_PATH, "w") as fh:
            json.dump({"fetched_at": time.time(), "jobs": jobs}, fh)
    except OSError:
        pass


def _dedupe(jobs):
    """Drop repeats - boards paginate with overlap and syndicate each other."""
    seen = set()
    unique = []
    for job in jobs:
        key = (job.get("title", "").strip().lower(), job.get("company", "").strip().lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(job)
    return unique


def load_jobs(tags=None, refresh=False):
    """Return (jobs, meta). Falls back to the disk cache when fetching fails."""
    cache = _read_cache()
    fresh = cache and (time.time() - cache.get("fetched_at", 0)) < CACHE_TTL

    if fresh and not refresh:
        return cache["jobs"], {"cached": True, "fetched_at": cache["fetched_at"]}

    jobs = _dedupe(_fetch_jobicy(tags or []) + _fetch_arbeitnow())
    if jobs:
        _write_cache(jobs)
        return jobs, {"cached": False, "fetched_at": time.time()}

    # Every provider failed (offline, rate limited, outage) - serve stale data
    # rather than an empty page.
    if cache:
        return cache["jobs"], {"cached": True, "stale": True, "fetched_at": cache.get("fetched_at", 0)}
    return [], {"cached": False, "error": "No job source reachable"}


def match_jobs(jobs, user_skills, career=None, search="", location="",
               home_location="", remote_only=False, min_match=0):
    """Score every listing against the resume skills and return it ranked."""
    user = {s.lower() for s in (user_skills or [])}
    search = (search or "").strip().lower()
    location = (location or "").strip().lower()
    # The candidate's own city, used to flag and lift nearby roles. It never
    # filters anything out - most listings on these boards are remote, and a
    # hard location filter would empty the page for most users.
    home = (home_location or "").strip().lower()
    home_parts = expand_region(
        {p.strip() for p in re.split(r"[,/]", home) if len(p.strip()) >= 2}
    )
    # "Developer" alone matches almost every listing, so the generic half of a
    # career label is dropped and only the distinguishing word is boosted on.
    career_words = set(re.findall(r"[a-z]+", (career or "").lower())) - {
        "developer", "engineer", "analyst", "specialist"
    }

    results = []
    for job in jobs:
        job_skills = [s.lower() for s in job.get("skills", [])]

        # One stray technology in a job post is noise, not a requirements list.
        if len(job_skills) < 2:
            continue

        if search:
            haystack = " ".join([job.get("title", ""), job.get("company", ""),
                                 job.get("description", ""), " ".join(job_skills)]).lower()
            if search not in haystack:
                continue
        if location and location not in job.get("location", "").lower():
            continue
        if remote_only and not job.get("remote") and "remote" not in job.get("location", "").lower():
            continue

        # A listing that names one technology is not a 100% match just because
        # the candidate happens to know it, so coverage is tempered by how much
        # evidence there actually is: both the share of the job's requirements
        # covered and the absolute number of skills in common.
        match, overlap, missing = score_skill_match(job_skills, user)

        # Roles whose title echoes the predicted career path rank above generic
        # matches, so a Backend Developer sees backend work first.
        title = job.get("title", "").lower()
        title_words = set(re.findall(r"[a-z]+", title))
        if career_words & title_words:
            match = min(100.0, match + 15)

        # A role that names one of the candidate's specialised skills in its
        # title ("React Developer") is a better lead than one that merely
        # mentions it in the body.
        if any(s in title for s in overlap if s not in GENERIC_SKILLS):
            match = min(100.0, match + 10)

        job_location = job.get("location", "").lower()
        nearby = bool(home_parts) and any(p in job_location for p in home_parts)
        if nearby:
            match = min(100.0, match + 8)

        if not overlap or match < min_match:
            continue

        results.append({
            **job,
            "match_percentage": round(match, 1),
            "matched_skills": overlap,
            "missing_skills": missing[:8],
            "nearby": nearby,
        })

    results.sort(key=lambda j: (j["match_percentage"], j["nearby"], len(j["matched_skills"])), reverse=True)
    return results
