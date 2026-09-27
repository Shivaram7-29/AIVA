"""Focused regression tests for the Groq free-plan request guard."""

import asyncio
import json
import sys
import unittest
from types import SimpleNamespace
from pathlib import Path

import pymupdf


BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main  # noqa: E402


class _FakeUpload:
    def __init__(self, contents: bytes, filename: str = "resume.pdf"):
        self.content_type = "application/pdf"
        self.filename = filename
        self._contents = contents

    async def read(self) -> bytes:
        return self._contents


class _FakeGroq:
    def __init__(self, response: str = '{"ok": true}'):
        self.calls = []
        self.response = response
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        self.calls.append(kwargs)
        response = self.response
        if isinstance(response, list):
            response = response.pop(0)
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=response),
                    finish_reason="stop",
                )
            ]
        )


def _make_pdf(text: str) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    result = document.tobytes()
    document.close()
    return result


class GroqBudgetTests(unittest.TestCase):
    def test_interview_answer_returns_feedback_without_next_question(self):
        original = main.call_ai_json
        try:
            main.call_ai_json = lambda prompt, max_tokens=0: {
                "feedback": {
                    "score": 8,
                    "verdict": "Strong answer",
                    "acceptable": True,
                    "strengths": ["Clear explanation"],
                    "weaknesses": ["Add a concrete metric"],
                    "better_answer": "I would add one measurable project outcome.",
                    "actionable_feedback": "Use one specific example next time.",
                },
                "next_question": {"question": "This must not be returned"},
            }
            response = asyncio.run(main.evaluate_answer(main.AnswerRequest(
                question="Tell me about yourself.",
                answer="I am a computer science student with a backend project.",
                role="Software Engineer",
                interview_type="HR",
            )))
        finally:
            main.call_ai_json = original

        self.assertIn("feedback", response)
        self.assertNotIn("next_question", response)
        self.assertEqual(response["feedback"]["score"], 8)
        self.assertTrue(response["feedback"]["acceptable"])

    def test_interview_next_is_a_separate_explicit_operation(self):
        original = main.call_ai_json
        try:
            main.call_ai_json = lambda prompt, max_tokens=0: {
                "question": "Tell me about a project where you improved reliability.",
                "question_number": 2,
                "difficulty": "Medium",
                "topic": "Projects",
                "hint": "Use the situation, action, result structure.",
            }
            response = asyncio.run(main.next_interview_question(main.NextInterviewQuestionRequest(
                role="Software Engineer",
                interview_type="HR",
                question_number=1,
                current_question="Tell me about yourself.",
                current_answer="I built a backend project.",
                current_feedback={"score": 7, "weaknesses": ["Add detail"]},
                history=[{"question": "Tell me about yourself.", "answer": "I built a backend project.", "score": 7}],
            )))
        finally:
            main.call_ai_json = original

        self.assertEqual(response["question_number"], 2)
        self.assertIn("reliability", response["question"])

    def test_interview_start_normalises_one_question(self):
        original = main.call_ai_json
        try:
            main.call_ai_json = lambda prompt, max_tokens=0: {
                "question": "Why do you want this role?",
                "question_number": 1,
                "difficulty": "Easy",
                "topic": "Motivation",
            }
            response = asyncio.run(main.start_interview(main.StartInterviewRequest(
                role="Data Scientist",
                interview_type="Technical",
            )))
        finally:
            main.call_ai_json = original

        self.assertEqual(response["question_number"], 1)
        self.assertEqual(response["topic"], "Motivation")

    def test_hr_start_always_uses_introduction_phase(self):
        response = asyncio.run(main.start_interview(main.StartInterviewRequest(
            role="Data Scientist",
            interview_type="HR",
        )))

        self.assertEqual(response["question_number"], 1)
        self.assertEqual(response["topic"], "Introduction")
        self.assertEqual(response["phase"], "introduction")
        self.assertIn("introduce yourself", response["question"].lower())

    def test_interview_prompt_uses_compact_resume_profile(self):
        original = main.call_ai_json
        captured = {}
        try:
            def fake_call(prompt, max_tokens=0):
                captured["prompt"] = prompt
                return {
                    "question": "Can you explain the LangChain project?",
                    "question_number": 1,
                    "difficulty": "Medium",
                    "topic": "Projects",
                }

            main.call_ai_json = fake_call
            asyncio.run(main.start_interview(main.StartInterviewRequest(
                role="ML Engineer",
                interview_type="Technical",
                candidate_profile={
                    "programming_languages": ["Python"],
                    "technologies": ["LangChain", "RAG"],
                    "projects": ["Built a RAG-based application"],
                },
            )))
        finally:
            main.call_ai_json = original

        self.assertIn("LangChain", captured["prompt"])
        self.assertIn("RAG-based application", captured["prompt"])
        self.assertIn("verified details", captured["prompt"])

    def test_coding_next_prompt_stays_coding_and_adapts_difficulty(self):
        original = main.call_ai_json
        captured = {}
        try:
            def fake_call(prompt, max_tokens=0):
                captured["prompt"] = prompt
                return {
                    "question": "How would you detect a cycle in a linked list?",
                    "question_number": 2,
                    "difficulty": "Medium",
                    "topic": "Linked Lists",
                }

            main.call_ai_json = fake_call
            asyncio.run(main.next_interview_question(main.NextInterviewQuestionRequest(
                role="Software Engineer",
                interview_type="Coding",
                question_number=1,
                current_question="Find two numbers that add up to a target.",
                current_answer="I would use a hash map.",
                current_feedback={"score": 9, "weaknesses": []},
                current_difficulty="Easy",
                history=[{
                    "question": "Find two numbers that add up to a target.",
                    "answer": "I would use a hash map.",
                    "score": 9,
                }],
            )))
        finally:
            main.call_ai_json = original

        self.assertIn("ROUND RULES — CODING", captured["prompt"])
        self.assertIn("Do not ask HR", captured["prompt"])
        self.assertIn("Increase difficulty", captured["prompt"])
        self.assertIn('CURRENT DIFFICULTY: "Easy"', captured["prompt"])

    def test_pdf_extraction_uses_pymupdf(self):
        pdf = _make_pdf("Skills\nPython, React\nEducation\nB.Tech Computer Science")
        text, pages = main._extract_pdf_text(pdf)
        self.assertEqual(pages, 1)
        self.assertIn("Python, React", text)

    def test_resume_compaction_preserves_required_sections(self):
        sections = "\n\n".join(
            [
                "SUMMARY\n" + "Candidate summary. " * 120,
                "EXPERIENCE\n" + "Built production services with measurable results. " * 180,
                "PROJECTS\n" + "Project used Python, React, SQL and REST APIs. " * 180,
                "SKILLS\nPython React SQL Git Docker",
                "EDUCATION\nB.Tech Computer Science, Example University, 2026",
                "CERTIFICATIONS\nAWS Cloud Practitioner",
                "ACHIEVEMENTS\nHackathon finalist",
            ]
        )
        compacted = main._compact_resume_for_ai(sections, max_tokens=1800)
        for label in ("SUMMARY", "EXPERIENCE", "PROJECTS", "SKILLS",
                      "EDUCATION", "CERTIFICATIONS", "ACHIEVEMENTS"):
            self.assertIn(f"[{label}]", compacted)
        self.assertIn("B.Tech Computer Science", compacted)
        self.assertIn("AWS Cloud Practitioner", compacted)
        self.assertLessEqual(main._estimate_tokens(compacted), 1800)

    def test_combined_prompt_compacts_jobs_and_deduplicates_descriptions(self):
        resume = "\n".join(
            [
                "EXPERIENCE",
                "Built APIs with Python and FastAPI.",
                "PROJECTS",
                "Created a React frontend backed by REST services.",
                "SKILLS",
                "Python React FastAPI SQL",
                "EDUCATION",
                "B.Tech Computer Science",
                "CERTIFICATIONS",
                "Cloud fundamentals",
            ]
        ) * 200
        jobs = [
            {
                "id": str(index),
                "title": f"Junior Python Developer {index}",
                "company": "Example Co",
                "location": "India",
                "description": "Python REST API SQL required. " * 100,
            }
            for index in range(10)
        ]
        prompt = main._build_combined_recommend_prompt(
            resume, jobs, candidate_profile={"target_roles": ["Python Developer"]}
        )
        self.assertLessEqual(main._estimate_tokens(prompt), 5200)
        self.assertEqual(prompt.count("(same description as another listing"), 9)
        self.assertNotIn("\nredirect_url:", prompt)
        self.assertNotIn('"redirect_url":', prompt)

    def test_mocked_transport_receives_safe_total_request(self):
        fake = _FakeGroq()
        old_client = main.client
        old_fallbacks = main.GROQ_FALLBACK_MODELS
        try:
            main.client = fake
            main.GROQ_FALLBACK_MODELS = []
            main._groq_chat("RESUME:\n" + ("large resume line. " * 10000),
                            max_tokens=8192)
        finally:
            main.client = old_client
            main.GROQ_FALLBACK_MODELS = old_fallbacks

        self.assertEqual(len(fake.calls), 1)
        request = fake.calls[0]
        prompt = request["messages"][1]["content"]
        total = (
            main._estimate_tokens(request["messages"][0]["content"])
            + main._estimate_tokens(prompt)
            + request["max_tokens"]
        )
        self.assertLessEqual(total, main._GROQ_SAFE_REQUEST_TOKENS)
        self.assertLess(request["max_tokens"], 8192)

    def test_agent_pipeline_mocked_end_to_end(self):
        pdf = _make_pdf(
            "EXPERIENCE\nPython intern\nPROJECTS\nReact and FastAPI project\n"
            "SKILLS\nPython React FastAPI SQL\nEDUCATION\nB.Tech Computer Science\n"
            "CERTIFICATIONS\nAWS Cloud Practitioner"
        )
        jobs = [
            {
                "id": "job-1",
                "title": "Junior Python Developer",
                "company": "Example Co",
                "location": "India",
                "description": "Required: Python, REST APIs, SQL.",
                "salary_min": 100,
                "salary_max": 200,
                "created": "2026-09-01",
                "redirect_url": "https://example.com/job-1",
            }
        ]
        profile = {
            "name": "Candidate",
            "location": "India",
            "email": "candidate@example.com",
            "education": [{"degree": "B.Tech"}],
            "programming_languages": ["Python"],
            "frameworks": ["FastAPI", "React"],
            "libraries": [],
            "databases": ["SQL"],
            "cloud_devops": [],
            "technical_skills": ["REST APIs"],
            "soft_skills": [],
            "projects": ["React and FastAPI project"],
            "work_experience": ["Python intern"],
            "certifications": ["AWS Cloud Practitioner"],
            "target_roles": ["Python Developer"],
            "experience_level": "Entry Level",
        }
        matching = {
            "candidate_profile": {
                "name": "Candidate",
                "programming_languages": ["Python"],
                "frameworks_and_tools": ["FastAPI", "React"],
                "skills": [],
                "experience": ["Python intern"],
                "target_roles": ["Python Developer"],
                "education": ["B.Tech"],
            },
            "matched_jobs": [{
                "job_id": "job-1",
                "title": "Junior Python Developer",
                "company": "Example Co",
                "location": "India",
                "match_score": 88,
                "matched_skills": ["Python", "REST APIs"],
                "missing_skills": [],
                "experience_match": "Strong",
                "evidence": ["Python internship and FastAPI project"],
                "match_summary": "Strong technical alignment for an entry-level role.",
            }],
        }

        old_search = main._smart_search_adzuna
        old_client = main.client
        old_fallbacks = main.GROQ_FALLBACK_MODELS

        fake = _FakeGroq(json.dumps(matching))

        try:
            main.client = fake
            main.GROQ_FALLBACK_MODELS = []
            main.groq_token_budget.reset_for_tests()
            main._groq_result_cache.clear()
            main._smart_search_adzuna = lambda queries, location: (jobs, [])
            results = [
                asyncio.run(main.agent_run(
                    _FakeUpload(pdf), location="India", target_role=""
                ))
                for _ in range(3)
            ]
            result = results[-1]
        finally:
            main._smart_search_adzuna = old_search
            main.client = old_client
            main.GROQ_FALLBACK_MODELS = old_fallbacks

        # The normal Job Search path now uses deterministic profile/query
        # extraction and exactly one compact semantic matching call.
        self.assertEqual(len(fake.calls), 1)
        self.assertEqual([item["jobs_found"] for item in results], [1, 1, 1])
        for request in fake.calls:
            request_tokens = (
                main._estimate_tokens(request["messages"][0]["content"])
                + main._estimate_tokens(request["messages"][1]["content"])
                + request["max_tokens"]
            )
            self.assertLessEqual(request_tokens, main._GROQ_SAFE_REQUEST_TOKENS)
        self.assertEqual(result["candidate_profile"]["name"], "Candidate")
        self.assertEqual(result["matched_jobs"][0]["job_id"], "job-1")
        self.assertEqual(result["matched_jobs"][0]["match_score"], 88)
        self.assertEqual(result["matched_jobs"][0]["redirect_url"],
                         "https://example.com/job-1")
        self.assertEqual(result["_debug"]["jobs_after_filter"], 1)
        self.assertEqual(result["_debug"]["ai_mode"], "groq")

    def test_rolling_budget_waits_instead_of_overbooking(self):
        budget = main.GroqTokenBudget(budget=100, window_seconds=0.01)
        budget.reserve(70)
        self.assertEqual(budget.used(), 70)
        budget.reserve(30)
        self.assertLessEqual(budget.used(), 100)

    def test_groq_cache_avoids_duplicate_transport_calls(self):
        fake = _FakeGroq('{"cached": true}')
        old_client = main.client
        old_fallbacks = main.GROQ_FALLBACK_MODELS
        try:
            main.client = fake
            main.GROQ_FALLBACK_MODELS = []
            main.groq_token_budget.reset_for_tests()
            main._groq_result_cache.clear()
            first = main._groq_chat("cache me", max_tokens=300)
            second = main._groq_chat("cache me", max_tokens=300)
        finally:
            main.client = old_client
            main.GROQ_FALLBACK_MODELS = old_fallbacks
        self.assertEqual(first, second)
        self.assertEqual(len(fake.calls), 1)

    def test_deterministic_fallback_returns_evidence_and_missing_skills(self):
        resume = (
            "Alex Candidate\n"
            "EXPERIENCE\nPython intern building REST APIs with FastAPI.\n"
            "PROJECTS\nBuilt a React dashboard backed by PostgreSQL.\n"
            "SKILLS\nPython FastAPI React PostgreSQL\n"
            "EDUCATION\nB.Tech Computer Science\n"
        )
        profile = main._build_deterministic_candidate_profile(resume, "fresher")
        result = main._deterministic_match_jobs(
            resume,
            [{
                "id": "job-2",
                "title": "Junior Python Developer",
                "company": "Example",
                "location": "India",
                "description": "Required: Python, FastAPI, Docker. 2 years experience.",
            }],
            profile,
            "India",
        )[0]
        self.assertIn("Python", result["matched_skills"])
        self.assertIn("Docker", result["missing_skills"])
        self.assertTrue(result["evidence"])
        self.assertGreaterEqual(result["match_score"], 1)

    def test_agent_returns_jobs_when_groq_is_unconfigured(self):
        pdf = _make_pdf(
            "Alex Candidate\nEXPERIENCE\nPython intern building REST APIs.\n"
            "PROJECTS\nReact dashboard\nSKILLS\nPython React FastAPI\n"
            "EDUCATION\nB.Tech Computer Science"
        )
        jobs = [{
            "id": "fallback-job",
            "title": "Junior Python Developer",
            "company": "Example Co",
            "location": "India",
            "description": "Required: Python, FastAPI, Docker.",
            "redirect_url": "https://example.com/fallback-job",
        }]
        old_search = main._smart_search_adzuna
        old_client = main.client
        old_fallbacks = main.GROQ_FALLBACK_MODELS
        try:
            main.client = None
            main.GROQ_FALLBACK_MODELS = []
            main._smart_search_adzuna = lambda queries, location: (jobs, [])
            result = asyncio.run(main.agent_run(
                _FakeUpload(pdf), location="India", target_role=""
            ))
        finally:
            main._smart_search_adzuna = old_search
            main.client = old_client
            main.GROQ_FALLBACK_MODELS = old_fallbacks
        self.assertEqual(result["jobs_found"], 1)
        self.assertEqual(result["matched_jobs"][0]["job_id"], "fallback-job")
        self.assertEqual(result["_debug"]["ai_mode"], "deterministic_fallback")

    def test_browser_agent_mapping_is_deterministic_and_does_not_invent(self):
        profile = {
            "name": "Alex Candidate",
            "email": "alex@example.com",
            "phone": "+91 9000000000",
            "university": "Example University",
        }
        prepared = {"form_fields": {}, "application_answers": {}}
        email_field = {
            "label": "Email Address", "name": "email", "input_type": "email",
            "context": "", "required": True,
        }
        work_auth_field = {
            "label": "Are you authorized to work?", "name": "work_auth",
            "input_type": "text", "context": "", "required": True,
        }
        self.assertEqual(
            main._map_agent_field(email_field, profile, prepared)[:2],
            ("alex@example.com", "candidate_profile.email"),
        )
        value, source, reason = main._map_agent_field(work_auth_field, profile, prepared)
        self.assertEqual((value, source), ("", ""))
        self.assertIn("Required field", reason)


if __name__ == "__main__":
    unittest.main()