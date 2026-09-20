"""Job feed scrapers for free public sources."""
import os
import re
import feedparser
import requests


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def get_wwr_jobs(keyword: str = "", limit: int = 50) -> list[dict]:
    feed = feedparser.parse("https://weworkremotely.com/remote-jobs.rss")
    results = []
    for e in feed.entries:
        title = e.get("title", "")
        if keyword and keyword.lower() not in title.lower():
            continue
        # WWR title format: "Company: Role"
        parts = title.split(":", 1)
        company = parts[0].strip() if len(parts) == 2 else "Unknown"
        role = parts[1].strip() if len(parts) == 2 else title
        results.append({
            "source": "wwr",
            "external_id": f"wwr-{_slug(e.get('id', title))}",
            "title": role,
            "company": company,
            "url": e.get("link", ""),
            "location": "Remote",
            "posted_at": e.get("published", None),
        })
        if len(results) >= limit:
            break
    return results


def get_remoteok_jobs(category: str = "python", limit: int = 50) -> list[dict]:
    url = f"https://remoteok.io/remote-{category}-jobs.rss"
    feed = feedparser.parse(url)
    results = []
    for e in feed.entries:
        results.append({
            "source": "remoteok",
            "external_id": f"rok-{_slug(e.get('id', e.get('link', e.title)))}",
            "title": e.get("title", ""),
            "company": e.get("author", "Unknown"),
            "url": e.get("link", ""),
            "location": "Remote",
            "posted_at": e.get("published", None),
        })
        if len(results) >= limit:
            break
    return results


def get_adzuna_jobs(keyword: str = "python", country: str = "us", limit: int = 50) -> list[dict]:
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    if not app_id or not app_key:
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {"app_id": app_id, "app_key": app_key, "results_per_page": limit, "what": keyword}
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        return []
    results = []
    for job in r.json().get("results", []):
        results.append({
            "source": "adzuna",
            "external_id": f"adz-{job.get('id', _slug(job.get('title', '')))}",
            "title": job.get("title", ""),
            "company": job.get("company", {}).get("display_name", "Unknown"),
            "url": job.get("redirect_url", ""),
            "location": job.get("location", {}).get("display_name", ""),
            "posted_at": job.get("created", None),
        })
    return results


def fetch_all(keyword: str = "python", limit: int = 50) -> list[dict]:
    """Aggregate jobs from all sources, deduplicating by external_id."""
    seen: set[str] = set()
    jobs: list[dict] = []
    for listing in (
        get_wwr_jobs(keyword, limit)
        + get_remoteok_jobs(keyword, limit)
        + get_adzuna_jobs(keyword, limit=limit)
    ):
        eid = listing["external_id"]
        if eid not in seen:
            seen.add(eid)
            jobs.append(listing)
    return jobs
