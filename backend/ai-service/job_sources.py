"""Job feed scrapers for free public sources."""
import hashlib
import logging
import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import requests

log = logging.getLogger(__name__)

HEADERS = {"User-Agent": "CareerAI job feed (+https://github.com/Bisu56/ai-career-system)"}
TIMEOUT = 15


def _external_id(prefix: str, raw: str) -> str:
    return f"{prefix}-{hashlib.sha1(str(raw).encode()).hexdigest()[:20]}"


def _iso_utc(value) -> str | None:
    if not value:
        return None
    try:
        if isinstance(value, (int, float)):
            parsed = datetime.fromtimestamp(value, tz=timezone.utc)
        else:
            try:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except ValueError:
                parsed = parsedate_to_datetime(str(value))
    except (ValueError, TypeError, OverflowError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _matches(keyword: str, *fields: str) -> bool:
    words = keyword.lower().split()
    haystack = " ".join(f or "" for f in fields).lower()
    return all(word in haystack for word in words)


def get_wwr_jobs(keyword: str = "", limit: int = 50) -> list[dict]:
    response = requests.get("https://weworkremotely.com/remote-jobs.rss", headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    feed = feedparser.parse(response.content)
    results = []
    for e in feed.entries:
        title = e.get("title", "")
        if keyword and not _matches(keyword, title):
            continue
        parts = title.split(":", 1)
        company = parts[0].strip() if len(parts) == 2 else "Unknown"
        role = parts[1].strip() if len(parts) == 2 else title
        results.append({
            "source": "wwr",
            "external_id": _external_id("wwr", e.get("id") or e.get("link") or title),
            "title": role,
            "company": company,
            "url": e.get("link", ""),
            "location": "Remote",
            "posted_at": _iso_utc(e.get("published")),
        })
        if len(results) >= limit:
            break
    return results


def get_remoteok_jobs(keyword: str = "", limit: int = 50) -> list[dict]:
    response = requests.get("https://remoteok.com/api", headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    results = []
    for job in response.json():
        if not isinstance(job, dict) or not job.get("id") or not job.get("position"):
            continue
        if keyword and not _matches(keyword, job.get("position"), " ".join(job.get("tags") or [])):
            continue
        results.append({
            "source": "remoteok",
            "external_id": _external_id("rok", job["id"]),
            "title": job.get("position", ""),
            "company": job.get("company") or "Unknown",
            "url": job.get("url") or f"https://remoteok.com/remote-jobs/{job['id']}",
            "location": job.get("location") or "Remote",
            "posted_at": _iso_utc(job.get("epoch") or job.get("date")),
        })
        if len(results) >= limit:
            break
    return results


def adzuna_enabled() -> bool:
    return bool(os.getenv("ADZUNA_APP_ID") and os.getenv("ADZUNA_APP_KEY"))


def get_adzuna_jobs(keyword: str = "python", country: str = "us", limit: int = 50) -> list[dict]:
    if not adzuna_enabled():
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": os.getenv("ADZUNA_APP_ID"),
        "app_key": os.getenv("ADZUNA_APP_KEY"),
        "results_per_page": limit,
        "what": keyword,
    }
    response = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    results = []
    for job in response.json().get("results", []):
        results.append({
            "source": "adzuna",
            "external_id": _external_id("adz", job.get("id") or job.get("redirect_url") or job.get("title", "")),
            "title": job.get("title", ""),
            "company": job.get("company", {}).get("display_name", "Unknown"),
            "url": job.get("redirect_url", ""),
            "location": job.get("location", {}).get("display_name", ""),
            "posted_at": _iso_utc(job.get("created")),
        })
    return results


SOURCES = {
    "wwr": get_wwr_jobs,
    "remoteok": get_remoteok_jobs,
    "adzuna": get_adzuna_jobs,
}


def fetch_all(keyword: str = "python", limit: int = 50) -> list[dict]:
    """Aggregate jobs from all sources, deduplicating by external_id."""
    keyword = (keyword or "").strip()
    seen: set[str] = set()
    jobs: list[dict] = []
    for name, fetch in SOURCES.items():
        try:
            listings = fetch(keyword, limit=limit)
        except (requests.RequestException, ValueError) as error:
            log.warning("Job source %s failed: %s", name, error)
            continue
        for listing in listings:
            eid = listing["external_id"]
            if eid not in seen:
                seen.add(eid)
                jobs.append(listing)
    return jobs
