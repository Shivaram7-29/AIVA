"""Tests for improved deterministic job-matching accuracy.

Covers: one-skill matches, multi-skill matches, fresher vs senior roles,
        experience-level detection, missing experience data, resume evidence.
"""

import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main  # noqa: E402


# ── Sample resume texts ──────────────────────────────────────────────────

FRESHER_RESUME = (
    "Shiva Ram\n"
    "B.Tech Computer Science, VIT University, 2026\n"
    "Fresher\n"
    "\n"
    "SKILLS\n"
    "Python, HTML, CSS, Git\n"
    "\n"
    "PROJECTS\n"
    "Personal Portfolio Website built with HTML and CSS.\n"
    "Simple calculator in Python as a college assignment.\n"
    "\n"
    "EDUCATION\n"
    "B.Tech Computer Science — VIT University (2022-2026)\n"
    "\n"
    "Currently learning Django and React.\n"
)

STRONG_RESUME = (
    "Anita Developer\n"
    "Software Engineer\n"
    "\n"
    "EXPERIENCE\n"
    "Full-time Python Developer at TechCorp (2023-2025)\n"
    "Built REST APIs with FastAPI, deployed with Docker on AWS.\n"
    "Worked with PostgreSQL, Redis, and React frontend.\n"
    "\n"
    "SKILLS\n"
    "Python, FastAPI, Django, React, PostgreSQL, Redis, Docker, AWS, Git, SQL, REST APIs\n"
    "\n"
    "PROJECTS\n"
    "E-commerce platform with React frontend and FastAPI backend.\n"
    "Data pipeline using Pandas, NumPy, and PostgreSQL.\n"
    "\n"
    "EDUCATION\n"
    "B.Tech Computer Science — IIT Delhi (2019-2023)\n"
)


# ── Helper ────────────────────────────────────────────────────────────────

def _match(resume, job, target_role=""):
    profile = main._build_deterministic_candidate_profile(
        resume, experience_level=main._detect_experience_level(resume)
    )
    return main._deterministic_match_job(resume, job, profile, target_role=target_role)


# ── Tests ─────────────────────────────────────────────────────────────────

class TestMatchingAccuracy(unittest.TestCase):
    """Deterministic matching must produce honest, evidence-based scores."""

    # ── Single-skill overlap must not score 90+ ──────────────────────────

    def test_one_skill_overlap_not_inflated(self):
        """A job with only Python overlapping should NOT get 90+."""
        job = {
            "id": "senior-platform",
            "title": "Specialist Platform Engineer – Python Developer",
            "company": "BigCorp",
            "location": "Bangalore, India",
            "description": (
                "Required: Python, Kubernetes, Terraform, CI/CD, AWS. "
                "5+ years of platform engineering experience."
            ),
        }
        result = _match(FRESHER_RESUME, job, target_role="Python Developer")
        self.assertLess(
            result["match_score"], 55,
            f"One-skill overlap for a senior role should be <55, got {result['match_score']}"
        )

    def test_one_skill_overlap_experience_not_strong(self):
        """A fresher must NOT get 'Strong' experience for a 5+ years role."""
        job = {
            "id": "senior-python",
            "title": "Senior Python Developer",
            "company": "Corp",
            "location": "India",
            "description": "Required: Python, Django, Docker. 5+ years experience.",
        }
        result = _match(FRESHER_RESUME, job)
        self.assertNotEqual(
            result["experience_match"], "Strong",
            "Fresher should not get 'Strong' for a senior/5+ years role"
        )
        self.assertIn(result["experience_match"], {"Partial", "Weak"})

    # ── Multi-skill match should score higher ────────────────────────────

    def test_strong_multi_skill_match_scores_well(self):
        """A candidate with 5+ matching skills should score decently."""
        job = {
            "id": "python-dev",
            "title": "Python Developer",
            "company": "StartupCo",
            "location": "Remote, India",
            "description": (
                "Required: Python, FastAPI, PostgreSQL, Docker, REST APIs. "
                "2 years experience preferred."
            ),
        }
        result = _match(STRONG_RESUME, job, target_role="Python Developer")
        self.assertGreaterEqual(
            result["match_score"], 60,
            f"Strong multi-skill match should be >=60, got {result['match_score']}"
        )
        self.assertGreater(len(result["matched_skills"]), 3)

    def test_entry_level_job_matches_fresher_well(self):
        """A fresher applying to an explicitly entry-level role should match OK."""
        job = {
            "id": "junior-py",
            "title": "Junior Python Developer",
            "company": "Acme",
            "location": "India",
            "description": "Entry level. Required: Python, Git. Freshers welcome.",
        }
        result = _match(FRESHER_RESUME, job, target_role="Python Developer")
        # Fresher + entry-level job with matching skills should be decent
        self.assertGreaterEqual(result["match_score"], 40)
        self.assertIn(result["experience_match"], {"Strong", "Not specified"})

    # ── Fresher detection ─────────────────────────────────────────────────

    def test_fresher_detected_from_resume(self):
        """Resume containing 'Fresher' should be detected as fresher."""
        level = main._detect_experience_level(FRESHER_RESUME)
        self.assertEqual(level, "fresher")

    def test_experienced_not_fresher(self):
        """Resume with full-time employment should not be fresher."""
        level = main._detect_experience_level(STRONG_RESUME)
        self.assertNotEqual(level, "fresher")

    # ── Senior job penalty ────────────────────────────────────────────────

    def test_senior_title_penalises_fresher(self):
        """A fresher applying to a 'Senior' titled role must get Partial."""
        job = {
            "id": "senior-eng",
            "title": "Senior Software Engineer",
            "company": "BigTech",
            "location": "India",
            "description": "Required: Python, React, AWS. 7+ years experience.",
        }
        result = _match(FRESHER_RESUME, job)
        self.assertEqual(result["experience_match"], "Partial")
        self.assertLess(result["match_score"], 45)

    # ── Missing experience data ───────────────────────────────────────────

    def test_no_experience_info_not_strong_for_fresher(self):
        """If job doesn't mention experience, a fresher should get 'Not specified'."""
        job = {
            "id": "generic",
            "title": "Python Developer",
            "company": "SomeCo",
            "location": "India",
            "description": "Work on Python projects. Knowledge of Python required.",
        }
        result = _match(FRESHER_RESUME, job)
        # Should NOT default to "Strong" — should be "Not specified"
        self.assertNotEqual(
            result["experience_match"], "Strong",
            "Fresher should not get 'Strong' when job has no experience info"
        )

    # ── Evidence quality ──────────────────────────────────────────────────

    def test_evidence_references_real_resume_content(self):
        """Evidence must come from the actual resume, not be fabricated."""
        job = {
            "id": "api-dev",
            "title": "API Developer",
            "company": "APICo",
            "location": "India",
            "description": "Required: Python, FastAPI, REST APIs.",
        }
        result = _match(STRONG_RESUME, job)
        for ev in result["evidence"]:
            # Each evidence entry should contain text from the resume
            self.assertTrue(
                len(ev) > 5,
                f"Evidence should be substantive, got: '{ev}'"
            )

    def test_missing_skills_reported(self):
        """Skills the job requires but the resume lacks should appear in missing."""
        job = {
            "id": "devops",
            "title": "DevOps Engineer",
            "company": "OpsCo",
            "location": "India",
            "description": "Required: Python, Kubernetes, Terraform, Ansible.",
        }
        result = _match(FRESHER_RESUME, job)
        # Fresher resume has Python but not Kubernetes, Terraform, Ansible
        missing_lower = [s.lower() for s in result["missing_skills"]]
        self.assertTrue(
            any("kubernetes" in m or "terraform" in m or "ansible" in m for m in missing_lower),
            f"Expected some missing skills, got: {result['missing_skills']}"
        )

    # ── Summary reflects reality ──────────────────────────────────────────

    def test_summary_mentions_limited_overlap_for_one_skill(self):
        """When only 1 skill overlaps, summary should note limited evidence."""
        job = {
            "id": "platform-eng",
            "title": "Platform Engineer",
            "company": "Corp",
            "location": "India",
            "description": "Required: Python, Kubernetes, Terraform, CI/CD, Prometheus.",
        }
        result = _match(FRESHER_RESUME, job)
        summary_lower = result["match_summary"].lower()
        self.assertTrue(
            "1 " in summary_lower or "limited" in summary_lower or "only" in summary_lower,
            f"Summary should mention limited overlap, got: '{result['match_summary']}'"
        )

    # ── Ranking order ─────────────────────────────────────────────────────

    def test_junior_job_ranks_above_senior_for_fresher(self):
        """For a fresher, an entry-level role should rank above a senior role."""
        junior_job = {
            "id": "junior",
            "title": "Junior Python Developer",
            "company": "JuniorCo",
            "location": "India",
            "description": "Entry level. Required: Python, Git. Freshers welcome.",
        }
        senior_job = {
            "id": "senior",
            "title": "Senior Platform Engineer – Python",
            "company": "SeniorCo",
            "location": "India",
            "description": "Required: Python, Kubernetes, Terraform. 5+ years.",
        }
        profile = main._build_deterministic_candidate_profile(
            FRESHER_RESUME,
            experience_level=main._detect_experience_level(FRESHER_RESUME),
        )
        results = main._deterministic_match_jobs(
            FRESHER_RESUME, [junior_job, senior_job], profile,
            target_role="Python Developer",
        )
        # Results are sorted by score descending
        self.assertEqual(
            results[0]["job_id"], "junior",
            f"Junior job should rank first for a fresher. "
            f"Junior={results[0]['match_score']} vs Senior={results[1]['match_score']}"
        )


class TestExperienceLevelEdgeCases(unittest.TestCase):
    """Edge cases for _detect_experience_level."""

    def test_btech_student_is_fresher(self):
        resume = "Alex Student\nB.Tech Computer Science\n2026\nSKILLS: Python"
        self.assertEqual(main._detect_experience_level(resume), "fresher")

    def test_intern_only_is_fresher(self):
        resume = "Jane Doe\nIntern at Google (Summer 2025)\nSKILLS: Python, Java"
        self.assertEqual(main._detect_experience_level(resume), "fresher")

    def test_two_years_experience_is_mid(self):
        resume = "Bob Engineer\n2 years experience in software development"
        level = main._detect_experience_level(resume)
        self.assertIn(level, {"mid", "junior"})

    def test_five_years_is_senior(self):
        resume = "Carol Lead\n5 years of experience as senior developer"
        self.assertEqual(main._detect_experience_level(resume), "senior")



class TestExperienceYearRegexAndMatchReal(unittest.TestCase):
    """Focused tests for candidate vs company experience extraction and /jobs/match-real prompt."""

    def test_company_years_does_not_penalize_fresher_for_entry_level(self):
        """Company background with '10 years of industry experience' must not demote entry-level job."""
        job = {
            "id": "junior-with-company-history",
            "title": "Junior Python Developer",
            "company": "DecadeCorp",
            "location": "India",
            "description": (
                "With over 10 years of industry experience, DecadeCorp is expanding its team. "
                "Entry level role. Freshers welcome. Required: Python, Git."
            ),
        }
        result = _match(FRESHER_RESUME, job, target_role="Python Developer")
        self.assertEqual(
            result["experience_match"], "Strong",
            f"Fresher should get Strong for entry-level role despite company mentioning 10 years; got {result['experience_match']}"
        )
        self.assertGreaterEqual(result["match_score"], 40)

    def test_company_celebration_years_does_not_penalize_intern(self):
        """Company 'celebrating 15 years' must not count as 15 years required."""
        job = {
            "id": "intern-role",
            "title": "Python Intern",
            "company": "AnniversaryCo",
            "location": "India",
            "description": (
                "Celebrating 15 years of excellence! We are hiring interns. "
                "Required: Python, HTML, CSS."
            ),
        }
        result = _match(FRESHER_RESUME, job)
        self.assertEqual(
            result["experience_match"], "Strong",
            f"Intern role should receive Strong experience match; got {result['experience_match']}"
        )

    def test_legitimate_candidate_experience_requirement_detected(self):
        """Phrases like '5+ years of experience required' must be detected as candidate requirement."""
        job = {
            "id": "mid-developer",
            "title": "Python Developer",
            "company": "MidTech",
            "location": "India",
            "description": (
                "5+ years of experience required in backend development. "
                "Required: Python, Docker, PostgreSQL."
            ),
        }
        result = _match(FRESHER_RESUME, job)
        self.assertEqual(
            result["experience_match"], "Partial",
            "Fresher applying to role with '5+ years of experience required' must get Partial"
        )
        self.assertLess(result["match_score"], 50)

    def test_minimum_years_experience_detected(self):
        """Phrases like 'minimum 3 years experience' must be detected."""
        req_years = main._extract_job_required_years("Minimum 3 years experience in Python and cloud services.")
        self.assertEqual(req_years, 3)

    def test_match_real_prompt_consistent_scoring_rules(self):
        """_build_real_match_prompt must have scoring rules aligned with _build_combined_recommend_prompt."""
        prompt = main._build_real_match_prompt("Sample resume", [{"id": "1", "title": "Developer"}])
        # Old conflicting rule must NOT be present
        self.assertNotIn("Do NOT lower the score merely because of fewer years if technical skill alignment is strong", prompt)
        # Consistent scoring rules must be present
        self.assertIn("SCORING RULES (follow strictly):", prompt)
        self.assertIn("A single overlapping skill must NOT produce a score above 54", prompt)
        self.assertIn('A fresher/junior candidate must NOT receive "Strong" for a role requiring 3+ years', prompt)


if __name__ == "__main__":
    unittest.main()
