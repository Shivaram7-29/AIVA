"""
Coding Round module for AIVA.

Kept isolated from main.py on purpose (main.py is already large and this
whole module should be easy to remove/replace without touching the AI
resume/aptitude/interview features). Import this router from main.py with:

    from coding_service import router as coding_router
    app.include_router(coding_router)

Persistence: plain JSON files under backend/data/coding/, matching the
existing ApplicationTracker pattern in main.py. There's no database or
auth in AIVA today, so this stays single-user/single-active-round —
one round.json represents the current (or most recent) attempt.
"""

import os
import re
import json
import uuid
import datetime
from typing import List, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from code_execution import get_execution_service, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/coding", tags=["Coding Round"])

# ============================================================
#  Storage locations
# ============================================================

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "coding")
_SUBMISSIONS_DIR = os.path.join(_DATA_DIR, "submissions")
_QUESTIONS_FILE = os.path.join(_DATA_DIR, "questions.json")
_ROUND_FILE = os.path.join(_DATA_DIR, "round.json")
_PROGRESS_FILE = os.path.join(_DATA_DIR, "progress.json")

os.makedirs(_SUBMISSIONS_DIR, exist_ok=True)

DEFAULT_ROUND_DURATION_SECONDS = 60 * 60  # 60 minutes


# ============================================================
#  Question bank (loaded once, read-only at request time)
# ============================================================

def _load_questions() -> list:
    with open(_QUESTIONS_FILE, "r") as f:
        return json.load(f)


def _find_question(question_id: str) -> Optional[dict]:
    for q in _load_questions():
        if q["id"] == question_id:
            return q
    return None


def _public_question_summary(q: dict) -> dict:
    """List view — no description/test cases, just enough to render the nav panel."""
    return {
        "id": q["id"],
        "title": q["title"],
        "difficulty": q["difficulty"],
        "topic": q["topic"],
        "max_score": q["max_score"],
    }


def _public_question_detail(q: dict) -> dict:
    """
    Single-question view — full problem statement + starter code + ONLY
    visible test cases. Hidden test cases and their expected output are
    never included in any response the frontend can see.
    """
    visible_cases = [
        {"input": tc["input"], "expected_output": tc["expected_output"]}
        for tc in q["test_cases"] if not tc.get("is_hidden")
    ]
    return {
        "id": q["id"],
        "title": q["title"],
        "difficulty": q["difficulty"],
        "topic": q["topic"],
        "max_score": q["max_score"],
        "description": q["description"],
        "input_format": q["input_format"],
        "output_format": q["output_format"],
        "constraints": q["constraints"],
        "examples": q["examples"],
        "starter_code": q.get("starter_code", {}),
        "visible_test_cases": visible_cases,
    }


# ============================================================
#  Round persistence
# ============================================================

def _read_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return default


def _write_json(path: str, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _get_round() -> Optional[dict]:
    return _read_json(_ROUND_FILE, None)


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _iso(dt: datetime.datetime) -> str:
    return dt.replace(microsecond=0).isoformat() + "Z"


def _round_seconds_remaining(round_data: dict) -> int:
    end_time = datetime.datetime.fromisoformat(round_data["end_time"].rstrip("Z"))
    remaining = (end_time - _now()).total_seconds()
    return max(0, int(remaining))


def _round_is_expired(round_data: dict) -> bool:
    return _round_seconds_remaining(round_data) <= 0


def _sanitize_question_id(question_id: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_\-]", "", question_id)


def _submission_path(question_id: str) -> str:
    return os.path.join(_SUBMISSIONS_DIR, f"{_sanitize_question_id(question_id)}.json")


def _load_all_submissions() -> Dict[str, dict]:
    subs = {}
    for fname in os.listdir(_SUBMISSIONS_DIR):
        if fname.endswith(".json"):
            data = _read_json(os.path.join(_SUBMISSIONS_DIR, fname), None)
            if data:
                subs[data["question_id"]] = data
    return subs


def _require_active_round() -> dict:
    round_data = _get_round()
    if not round_data:
        raise HTTPException(status_code=400, detail="No coding round has been started yet.")
    if round_data["status"] == "active" and _round_is_expired(round_data):
        round_data["status"] = "expired"
        _write_json(_ROUND_FILE, round_data)
    return round_data


# ============================================================
#  Pydantic request models
# ============================================================

class SaveCodeRequest(BaseModel):
    question_id: str
    language: str
    code: str


class RunRequest(BaseModel):
    question_id: str
    language: str
    code: str


class SubmitRequest(BaseModel):
    question_id: str
    language: str
    code: str


# ============================================================
#  Routes
# ============================================================

@router.get("/problems")
def list_problems():
    """List all coding questions (summary only, no test cases)."""
    questions = _load_questions()
    return {"questions": [_public_question_summary(q) for q in questions], "total": len(questions)}


@router.get("/problems/{question_id}")
def get_problem(question_id: str):
    """Full problem detail + visible test cases + starter code. Never includes hidden test cases."""
    q = _find_question(question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")
    return _public_question_detail(q)


@router.post("/start")
def start_round():
    """
    Start (or resume) the coding round. If a round is already active and
    not expired, returns the existing one instead of resetting the timer —
    this is what makes a page refresh safe.
    """
    existing = _get_round()
    if existing and existing["status"] == "active" and not _round_is_expired(existing):
        questions = _load_questions()
        return {
            **existing,
            "seconds_remaining": _round_seconds_remaining(existing),
            "questions": [_public_question_summary(q) for q in questions],
        }

    start_time = _now()
    end_time = start_time + datetime.timedelta(seconds=DEFAULT_ROUND_DURATION_SECONDS)
    round_data = {
        "id": str(uuid.uuid4())[:12],
        "start_time": _iso(start_time),
        "end_time": _iso(end_time),
        "duration_seconds": DEFAULT_ROUND_DURATION_SECONDS,
        "status": "active",
        "total_score": 0,
    }
    _write_json(_ROUND_FILE, round_data)
    _write_json(_PROGRESS_FILE, {})

    # Clear submissions from any previous round
    for fname in os.listdir(_SUBMISSIONS_DIR):
        if fname.endswith(".json"):
            os.remove(os.path.join(_SUBMISSIONS_DIR, fname))

    questions = _load_questions()
    return {
        **round_data,
        "seconds_remaining": DEFAULT_ROUND_DURATION_SECONDS,
        "questions": [_public_question_summary(q) for q in questions],
    }


@router.get("/status")
def round_status():
    """Backend-authoritative timer check. Frontend polls this rather than trusting a local countdown alone."""
    round_data = _require_active_round()
    submissions = _load_all_submissions()
    return {
        "id": round_data["id"],
        "status": round_data["status"],
        "start_time": round_data["start_time"],
        "end_time": round_data["end_time"],
        "seconds_remaining": _round_seconds_remaining(round_data),
        "questions_submitted": len(submissions),
    }


@router.post("/save")
def save_code(req: SaveCodeRequest):
    """Persist the candidate's in-progress code so navigating/refreshing doesn't lose it."""
    round_data = _require_active_round()
    if round_data["status"] != "active":
        raise HTTPException(status_code=403, detail="The coding round has ended. Progress can no longer be saved.")

    if not _find_question(req.question_id):
        raise HTTPException(status_code=404, detail="Question not found.")

    progress = _read_json(_PROGRESS_FILE, {})
    progress[req.question_id] = {
        "language": req.language,
        "code": req.code,
        "saved_at": _iso(_now()),
    }
    _write_json(_PROGRESS_FILE, progress)
    return {"message": "Progress saved."}


@router.get("/progress/{question_id}")
def get_progress(question_id: str):
    """Restore previously saved code for a question."""
    progress = _read_json(_PROGRESS_FILE, {})
    saved = progress.get(question_id)
    if not saved:
        q = _find_question(question_id)
        if not q:
            raise HTTPException(status_code=404, detail="Question not found.")
        return {"language": None, "code": None}
    return saved


def _score_for(question: dict, passed: int, total: int) -> int:
    if total == 0:
        return 0
    return round(question["max_score"] * (passed / total))


@router.post("/run")
def run_code(req: RunRequest):
    """Run against VISIBLE test cases only. Never touches hidden test cases."""
    round_data = _require_active_round()
    if round_data["status"] != "active":
        raise HTTPException(status_code=403, detail="The coding round has ended.")

    if req.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {SUPPORTED_LANGUAGES}")

    q = _find_question(req.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    visible_cases = [tc for tc in q["test_cases"] if not tc.get("is_hidden")]

    service = get_execution_service()
    result = service.run_against_test_cases(req.code, req.language, visible_cases)

    if not result.ok:
        # Provider not configured or unreachable — surface a clear, friendly error
        # rather than crashing or pretending code ran.
        return {
            "status": result.status,
            "message": result.message or "Code execution is currently unavailable.",
            "results": [],
        }

    return {
        "status": "success",
        "results": [
            {
                "passed": r.passed,
                "status": r.status,
                "stdout": r.stdout,
                "stderr": r.stderr,
                "expected_output": r.expected_output,
            }
            for r in result.results
        ],
        "passed_count": sum(1 for r in result.results if r.passed),
        "total_count": len(result.results),
    }


@router.post("/submit")
def submit_code(req: SubmitRequest):
    """Evaluate against visible + hidden test cases. Score is always computed server-side."""
    round_data = _require_active_round()
    if round_data["status"] != "active":
        raise HTTPException(status_code=403, detail="The coding round has ended. Submissions are no longer accepted.")

    if req.language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {SUPPORTED_LANGUAGES}")

    q = _find_question(req.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    all_cases = q["test_cases"]

    service = get_execution_service()
    result = service.run_against_test_cases(req.code, req.language, all_cases)

    if not result.ok:
        return {
            "status": result.status,
            "message": result.message or "Code execution is currently unavailable.",
        }

    passed_count = sum(1 for r in result.results if r.passed)
    total_count = len(result.results)
    score = _score_for(q, passed_count, total_count)

    overall_status = "passed" if passed_count == total_count else (
        "partial" if passed_count > 0 else "failed"
    )
    # Surface the first real error type encountered, if any, for a clearer verdict
    for r in result.results:
        if r.status in ("compilation_error", "runtime_error", "time_limit_exceeded"):
            overall_status = r.status
            break

    # Save code as the latest progress too, so it's consistent with what was submitted
    progress = _read_json(_PROGRESS_FILE, {})
    progress[req.question_id] = {
        "language": req.language,
        "code": req.code,
        "saved_at": _iso(_now()),
    }
    _write_json(_PROGRESS_FILE, progress)

    submission = {
        "question_id": req.question_id,
        "language": req.language,
        "code": req.code,
        "status": overall_status,
        "test_cases_passed": passed_count,
        "total_test_cases": total_count,
        "score": score,
        "max_score": q["max_score"],
        "submitted_at": _iso(_now()),
        # Only visible-case detail is stored for display; hidden inputs/outputs are never persisted back
        "visible_results": [
            {
                "passed": r.passed,
                "status": r.status,
                "stdout": r.stdout,
                "stderr": r.stderr,
                "expected_output": r.expected_output,
            }
            for r in result.results if not r.is_hidden
        ],
    }
    _write_json(_submission_path(req.question_id), submission)

    return {
        "status": overall_status,
        "test_cases_passed": passed_count,
        "total_test_cases": total_count,
        "score": score,
        "max_score": q["max_score"],
    }


@router.post("/finish")
def finish_round():
    """Mark the round finished and compute the final total score from all submission files."""
    round_data = _require_active_round()

    submissions = _load_all_submissions()
    total_score = sum(s.get("score", 0) for s in submissions.values())

    round_data["status"] = "finished"
    round_data["total_score"] = total_score
    round_data["finished_at"] = _iso(_now())
    _write_json(_ROUND_FILE, round_data)

    return {"message": "Round finished.", "total_score": total_score}


@router.get("/result")
def get_result():
    """Aggregate final result: per-question performance + overall totals."""
    round_data = _get_round()
    if not round_data:
        raise HTTPException(status_code=400, detail="No coding round found.")

    questions = _load_questions()
    submissions = _load_all_submissions()

    question_results = []
    total_score = 0
    max_possible = 0
    attempted = 0
    completed = 0

    for q in questions:
        max_possible += q["max_score"]
        sub = submissions.get(q["id"])
        if sub:
            attempted += 1
            total_score += sub["score"]
            if sub["status"] == "passed":
                completed += 1
            question_results.append({
                "question_id": q["id"],
                "title": q["title"],
                "difficulty": q["difficulty"],
                "status": sub["status"],
                "test_cases_passed": sub["test_cases_passed"],
                "total_test_cases": sub["total_test_cases"],
                "score": sub["score"],
                "max_score": q["max_score"],
            })
        else:
            question_results.append({
                "question_id": q["id"],
                "title": q["title"],
                "difficulty": q["difficulty"],
                "status": "not_attempted",
                "test_cases_passed": 0,
                "total_test_cases": len(q["test_cases"]),
                "score": 0,
                "max_score": q["max_score"],
            })

    time_taken_seconds = None
    if round_data.get("start_time"):
        start = datetime.datetime.fromisoformat(round_data["start_time"].rstrip("Z"))
        end_field = round_data.get("finished_at") or round_data.get("end_time")
        end = datetime.datetime.fromisoformat(end_field.rstrip("Z"))
        time_taken_seconds = max(0, int((min(end, _now()) - start).total_seconds()))

    return {
        "round_id": round_data["id"],
        "status": round_data["status"],
        "total_score": total_score,
        "max_possible_score": max_possible,
        "questions_total": len(questions),
        "questions_attempted": attempted,
        "questions_completed": completed,
        "time_taken_seconds": time_taken_seconds,
        "question_results": question_results,
    }
