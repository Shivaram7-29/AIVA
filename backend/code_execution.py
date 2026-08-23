"""
CodeExecutionService
=====================

A clean, pluggable abstraction for running untrusted candidate code.

IMPORTANT SECURITY NOTE
------------------------
This module intentionally does NOT execute candidate code locally via
subprocess/exec/eval/shell. Candidate code is untrusted input and must
never run inside the main FastAPI process or on the host filesystem.

Instead, code is sent to an external sandboxed execution provider
(Judge0) over HTTP. Judge0 handles process isolation, timeouts, and
resource limits on its own infrastructure.

If no provider is configured (no JUDGE0_API_URL / JUDGE0_API_KEY set),
every call returns a clear "not configured" result instead of raising
an unhandled exception or silently running code unsafely. This keeps
the rest of the Coding Round (question browsing, saving code, timer,
navigation) fully functional even before a sandbox is wired up.

To add a different provider later (e.g. a self-hosted sandbox, Piston,
AWS Lambda-based runner, etc.), implement a new subclass of
CodeExecutionService and swap it in `get_execution_service()` below.
Nothing else in the backend needs to change.
"""

import os
import time
import base64
import urllib.request
import urllib.error
import json as _json
from dataclasses import dataclass, field
from typing import Optional, List


# ============================================================
#  Result types
# ============================================================

@dataclass
class TestCaseResult:
    passed: bool
    status: str            # "passed" | "failed" | "runtime_error" | "compilation_error" | "time_limit_exceeded"
    stdout: str = ""
    stderr: str = ""
    expected_output: Optional[str] = None   # only populated for visible test cases
    is_hidden: bool = False
    time_taken: Optional[float] = None      # seconds, if provider reports it


@dataclass
class ExecutionResult:
    ok: bool                      # False if the execution provider itself failed/unavailable
    status: str                   # "success" | "provider_not_configured" | "provider_error"
    message: str = ""
    results: List[TestCaseResult] = field(default_factory=list)


# ============================================================
#  Language -> Judge0 language_id mapping
#  (IDs from the standard Judge0 CE language table)
# ============================================================

JUDGE0_LANGUAGE_IDS = {
    "python": 71,       # Python 3.8.1
    "javascript": 63,   # Node.js 12.14.0
    "java": 62,         # Java (OpenJDK 13.0.1)
    "cpp": 54,          # C++ (GCC 9.2.0)
}

SUPPORTED_LANGUAGES = list(JUDGE0_LANGUAGE_IDS.keys())


# ============================================================
#  Base abstraction
# ============================================================

class CodeExecutionService:
    """Abstract interface. Subclasses implement `run_against_test_cases`."""

    def is_configured(self) -> bool:
        raise NotImplementedError

    def run_against_test_cases(
        self,
        code: str,
        language: str,
        test_cases: list,   # list of {"input": str, "expected_output": str, "is_hidden": bool}
        time_limit_seconds: float = 5.0,
    ) -> ExecutionResult:
        raise NotImplementedError


# ============================================================
#  Not-configured fallback (used until JUDGE0 env vars are set)
# ============================================================

class UnconfiguredExecutionService(CodeExecutionService):
    def is_configured(self) -> bool:
        return False

    def run_against_test_cases(self, code, language, test_cases, time_limit_seconds=5.0):
        return ExecutionResult(
            ok=False,
            status="provider_not_configured",
            message=(
                "Code execution provider is not configured. "
                "Set JUDGE0_API_URL and JUDGE0_API_KEY in the backend .env file "
                "to enable Run/Submit."
            ),
        )


# ============================================================
#  Judge0 implementation
# ============================================================

class Judge0ExecutionService(CodeExecutionService):
    """
    Talks to a Judge0 CE-compatible HTTP API (e.g. RapidAPI's Judge0 CE,
    or a self-hosted Judge0 instance). Fully configured via env vars —
    no secrets ever live in frontend code.
    """

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key

    def is_configured(self) -> bool:
        return bool(self.api_url and self.api_key)

    def _submit_one(self, code: str, language: str, stdin: str, time_limit_seconds: float):
        language_id = JUDGE0_LANGUAGE_IDS.get(language)
        if language_id is None:
            return {"error": f"Unsupported language: {language}"}

        payload = {
            "source_code": base64.b64encode(code.encode("utf-8")).decode("ascii"),
            "language_id": language_id,
            "stdin": base64.b64encode(stdin.encode("utf-8")).decode("ascii"),
            "cpu_time_limit": time_limit_seconds,
            "wall_time_limit": time_limit_seconds + 2,
        }

        url = f"{self.api_url}/submissions?base64_encoded=true&wait=true"
        req = urllib.request.Request(
            url,
            data=_json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                # Common auth header shape for RapidAPI-hosted Judge0.
                # Self-hosted Judge0 instances typically ignore unknown headers.
                "X-RapidAPI-Key": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=time_limit_seconds + 10) as resp:
                body = resp.read().decode("utf-8")
                return _json.loads(body)
        except urllib.error.URLError as e:
            return {"error": f"Execution provider unreachable: {e}"}
        except Exception as e:
            return {"error": f"Execution provider error: {e}"}

    @staticmethod
    def _decode(value: Optional[str]) -> str:
        if not value:
            return ""
        try:
            return base64.b64decode(value).decode("utf-8", errors="replace")
        except Exception:
            return value or ""

    def _map_status(self, judge0_response: dict) -> str:
        status = (judge0_response.get("status") or {}).get("description", "")
        status_l = status.lower()
        if "accepted" in status_l:
            return "passed"
        if "compilation error" in status_l:
            return "compilation_error"
        if "time limit" in status_l:
            return "time_limit_exceeded"
        if "runtime error" in status_l or "internal" in status_l:
            return "runtime_error"
        return "failed"

    def run_against_test_cases(self, code, language, test_cases, time_limit_seconds=5.0):
        if not self.is_configured():
            return ExecutionResult(
                ok=False,
                status="provider_not_configured",
                message="Code execution provider is not configured.",
            )
        if language not in JUDGE0_LANGUAGE_IDS:
            return ExecutionResult(
                ok=False,
                status="provider_error",
                message=f"Unsupported language '{language}'. Supported: {SUPPORTED_LANGUAGES}",
            )

        results: List[TestCaseResult] = []

        for tc in test_cases:
            raw = self._submit_one(code, language, tc.get("input", ""), time_limit_seconds)

            if "error" in raw:
                return ExecutionResult(
                    ok=False,
                    status="provider_error",
                    message=raw["error"],
                    results=results,
                )

            stdout = self._decode(raw.get("stdout"))
            stderr = self._decode(raw.get("stderr")) or self._decode(raw.get("compile_output"))
            mapped_status = self._map_status(raw)

            expected = (tc.get("expected_output") or "").strip()
            actual = stdout.strip()
            passed = mapped_status == "passed" and actual == expected

            if mapped_status == "passed" and not passed:
                mapped_status = "failed"

            results.append(TestCaseResult(
                passed=passed,
                status=mapped_status,
                stdout=stdout,
                stderr=stderr,
                expected_output=None if tc.get("is_hidden") else expected,
                is_hidden=bool(tc.get("is_hidden")),
                time_taken=float(raw.get("time")) if raw.get("time") else None,
            ))

        return ExecutionResult(ok=True, status="success", results=results)


# ============================================================
#  Factory — picks the active provider from environment variables
# ============================================================

def get_execution_service() -> CodeExecutionService:
    api_url = os.getenv("JUDGE0_API_URL", "").strip()
    api_key = os.getenv("JUDGE0_API_KEY", "").strip()

    if api_url and api_key:
        return Judge0ExecutionService(api_url, api_key)

    return UnconfiguredExecutionService()
