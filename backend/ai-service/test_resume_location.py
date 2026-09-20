from resume_location import extract_location


def test_reads_the_contact_line_of_a_us_resume():
    text = ("MARIA GARCIA\nBackend Developer\n"
            "maria.garcia@email.com | (555) 345-6789 | Austin, TX\nSUMMARY\n")
    assert extract_location(text) == "Austin, TX"


def test_reads_a_city_and_country():
    text = "JANE DOE\nEngineer\njane@x.com | London, United Kingdom\nSUMMARY\n"
    assert extract_location(text) == "London, United Kingdom"


def test_reads_a_labelled_location():
    assert extract_location("RAM THAPA\nDeveloper\nLocation: Kathmandu\nram@x.com") == "Kathmandu"


def test_reports_remote_as_a_location():
    assert extract_location("ALEX LEE\nEngineer\nalex@x.com | Remote\nEXPERIENCE") == "Remote"


def test_ignores_employer_cities_below_the_contact_block():
    # "Google, CA" is where a past employer was, not where the candidate lives.
    text = "TOM RAY\nEngineer\ntom@x.com\nSUMMARY\nWorked at Google, CA on search\n"
    assert extract_location(text) is None


def test_returns_none_when_no_location_is_present():
    assert extract_location("BOB SMITH\nDeveloper\nbob@x.com\nSUMMARY\nExperienced dev") is None
    assert extract_location("") is None


def test_section_headings_are_never_read_as_a_city():
    assert extract_location("ANA LI\nDev\nana@x.com\nSKILLS\nPython, SQL") is None
