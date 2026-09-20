from job_sources import tag_skills, match_jobs, _dedupe


def job(**kw):
    base = {"id": "x", "title": "", "company": "", "location": "Remote",
            "description": "", "skills": [], "remote": True}
    base.update(kw)
    return base


def test_tag_skills_finds_technologies():
    found = tag_skills("Senior Backend Engineer", "You will use Python, Laravel and Docker daily.")
    assert {"python", "laravel", "docker"} <= set(found)


def test_php_currency_is_not_the_language():
    # "PHP" is also the Philippine peso; salary lines must not tag the language.
    assert "php" not in tag_skills("AutoCAD Drafter", "Budget of 1,000 PHP de minimis benefits")
    assert "php" not in tag_skills("Sales Assistant", "Compensation PHP 25,000 per month")
    assert "php" in tag_skills("Web Developer", "Strong PHP and Laravel experience")


def test_excel_the_verb_is_not_the_spreadsheet():
    assert "excel" not in tag_skills("Manager", "You will excel at stakeholder communication")
    assert "excel" in tag_skills("Analyst", "Advanced Excel and SQL required")


def test_listings_with_one_skill_are_dropped_as_noise():
    results = match_jobs([job(title="Sales", skills=["python"])], ["python"])
    assert results == []


def test_specialised_overlap_outranks_generic_overlap():
    react_role = job(id="a", title="React Developer",
                     skills=["react", "javascript", "html", "css"])
    seo_role = job(id="b", title="SEO Manager", skills=["html", "css", "javascript"])
    ranked = match_jobs([seo_role, react_role], ["react", "javascript", "html", "css"])
    assert ranked[0]["id"] == "a"


def test_match_reports_matched_and_missing_skills():
    ranked = match_jobs([job(title="Data Engineer", skills=["python", "sql", "airflow"])],
                        ["python", "sql"])
    assert ranked[0]["matched_skills"] == ["python", "sql"]
    assert ranked[0]["missing_skills"] == ["airflow"]


def test_filters_narrow_the_results():
    jobs = [job(id="a", title="React Developer", skills=["react", "javascript"], location="Berlin"),
            job(id="b", title="Python Developer", skills=["python", "sql"], location="Remote")]
    assert [j["id"] for j in match_jobs(jobs, ["react", "javascript", "python", "sql"], search="react")] == ["a"]
    assert [j["id"] for j in match_jobs(jobs, ["react", "javascript", "python", "sql"], location="berlin")] == ["a"]
    assert match_jobs(jobs, ["react", "javascript"], min_match=95) == []


def test_dedupe_drops_the_same_role_from_two_boards():
    dupes = [job(id="a", title="React Developer", company="Acme"),
             job(id="b", title="react developer", company="acme")]
    assert len(_dedupe(dupes)) == 1


def test_home_location_flags_and_lifts_nearby_roles():
    remote_role = job(id="a", title="Data Analyst", skills=["python", "sql"], location="Paris")
    local_role = job(id="b", title="Data Analyst", skills=["python", "sql"], location="USA")
    ranked = match_jobs([remote_role, local_role], ["python", "sql"],
                        home_location="Austin, TX")
    assert ranked[0]["id"] == "b"
    assert ranked[0]["nearby"] is True
    assert ranked[1]["nearby"] is False


def test_home_location_never_filters_anything_out():
    jobs = [job(id="a", title="Engineer", skills=["python", "sql"], location="Berlin")]
    assert len(match_jobs(jobs, ["python", "sql"], home_location="Austin, TX")) == 1


def test_us_state_implies_the_country_boards_actually_write():
    from job_sources import expand_region
    assert "usa" in expand_region({"austin", "tx"})
    assert "united states" in expand_region({"ny"})
