"""One-off, in-memory diagnostic for a /jobs/recommend Groq response.

This script does not modify backend/main.py or write captured content to disk.
It sends Naveenresume.pdf through the normal endpoint flow once.
"""

import json
from pathlib import Path

from fastapi.testclient import TestClient

import backend.main as main


PDF_PATH = Path(__file__).with_name("Naveenresume.pdf")
LANCESOFT_JOB_ID = "5832794132"


def main_diagnostic() -> None:
    if not PDF_PATH.is_file():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    captured: dict[str, str | None] = {"prompt": None, "raw_response": None}

    def capture_call_ai(prompt: str, max_tokens: int = 4096) -> str:
        """Production-equivalent Groq call that keeps raw content for this process."""
        captured["prompt"] = prompt

        if main.client is None:
            raise RuntimeError("Groq client is not configured.")

        completion = main.client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful AI assistant. Always respond with valid JSON "
                        "when asked for JSON output. No markdown fences, no extra text."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            model=main.GROQ_MODEL,
            temperature=0.7,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )

        raw_response = completion.choices[0].message.content
        captured["raw_response"] = raw_response
        return (raw_response or "").strip()

    # Process-local replacement only. backend/main.py remains unchanged.
    main.call_ai = capture_call_ai

    with PDF_PATH.open("rb") as pdf_file:
        response = TestClient(main.app).post(
            "/jobs/recommend",
            files={"file": (PDF_PATH.name, pdf_file, "application/pdf")},
            data={"target_role": "Python Developer", "location": "Bangalore"},
        )

    prompt = captured["prompt"]
    raw_response = captured["raw_response"]

    print("=== EXACT PROMPT SENT TO GROQ ===")
    print(prompt if prompt is not None else "<Groq was not called>")
    print("=== END EXACT PROMPT ===")

    print("\n=== EXACT RAW GROQ RESPONSE ===")
    print(raw_response if raw_response is not None else "<Groq was not called>")
    print("=== END EXACT RAW GROQ RESPONSE ===")

    if raw_response is None:
        print(f"\nEndpoint status: {response.status_code}")
        print(response.text)
        return

    parsed = main.clean_json_response((raw_response or "").strip())
    raw_lancesoft = next(
        (
            item
            for item in parsed.get("matched_jobs", [])
            if str(item.get("job_id", "")) == LANCESOFT_JOB_ID
        ),
        None,
    )

    endpoint_json = response.json()
    final_lancesoft = next(
        (
            item
            for item in endpoint_json.get("matched_jobs", [])
            if str(item.get("job_id", "")) == LANCESOFT_JOB_ID
        ),
        None,
    )

    print("\n=== PARSED LANCESOFT JOB ===")
    print(json.dumps(raw_lancesoft, indent=2, ensure_ascii=False))
    print("=== END PARSED LANCESOFT JOB ===")

    raw_missing_skills = (
        raw_lancesoft.get("missing_skills") if raw_lancesoft is not None else None
    )
    final_missing_skills = (
        final_lancesoft.get("missing_skills") if final_lancesoft is not None else None
    )

    print("\nLancesoft missing_skills from raw Groq response:")
    print(raw_missing_skills)
    print("Lancesoft missing_skills from final endpoint response:")
    print(final_missing_skills)
    print("Changed after Groq:")
    print(raw_missing_skills != final_missing_skills)


if __name__ == "__main__":
    main_diagnostic()
