# PlacementAI implementation and testing report

## Applications page crash

`ApplicationTracker.jsx` already resolved the current status configuration to
`StatusIcon`, but the status button rendered the undefined `nextConf.icon`.
That caused `ReferenceError: nextConf is not defined` while mapping saved
applications. The fix uses `StatusIcon`; the backend API and application
record shape remain compatible. Submitted, verification-required, and failed
terminal statuses are also displayed and filterable.

## Guarded browser application agent

The preparation-only flow is preserved. The new Playwright workflow:

1. Opens the job URL in a temporary server-side browser session.
2. Detects standard inputs, textareas, selects, radio buttons, checkboxes, and
   resume upload controls using labels, names, placeholders, ARIA labels, and
   nearby context.
3. Maps only known candidate/profile values and existing prepared answers.
4. Fills supported fields and uploads the user's actual PDF.
5. Shows a review with mapped fields, missing required information, and
   warnings.
6. Pauses for CAPTCHA, login, MFA/OTP, anti-bot blocks, ambiguous controls, or
   missing information; it never bypasses those protections.
7. Submits only when the frontend sends an explicit `confirm: true`.
8. Detects success indicators and records `Submitted`, `Submitted -
   Verification Required`, or `Failed` in the existing application tracker.

Added endpoints:

- `POST /application/agent/start`
- `GET /application/agent/{session_id}`
- `POST /application/agent/{session_id}/submit`
- `POST /application/agent/{session_id}/continue-manually`

Browser sessions are in-memory, expire after 30 minutes, and use a temporary
resume file that is removed when the session closes. Playwright/Chromium setup
is included in `requirements.txt` and `RUN_PROJECT.bat`.

### Windows launch root cause and fix

The failure was caused by Playwright's **async API** launching its Node driver
through Python 3.12's Windows asyncio subprocess path. Under the event loop
used by FastAPI/Uvicorn, subprocess creation raised
`NotImplementedError` before Chromium could start.

The backend now imports Playwright's **sync API** and owns the complete browser
session inside a dedicated `ThreadPoolExecutor(max_workers=1)`. Launch,
navigation, form operations, submission, and cleanup all execute on that same
worker thread, avoiding the incompatible asyncio subprocess implementation.
The project does not catch `NotImplementedError`, fake a successful launch, or
download Chromium on every request.

## Groq safety preserved

The previous free-plan protections remain intact: deterministic job-search
query/profile work, one compact normal matching call, rolling 6,000 estimated
TPM reservations, 5,500 estimated-token request caps, short-lived caching, and
header-aware 429 handling.

## Verification

Passed:

```text
python -m py_compile main.py test_main.py
python -m unittest discover -s . -p "test_*.py" -v
Ran 10 tests ... OK
npm ci --ignore-scripts
npm run build
✓ 2141 modules transformed
```

The backend imports with all new routes present. Uvicorn started successfully
in the available Linux test environment and `GET /health` returned HTTP 200.
Deterministic browser
field-mapping tests verify that known email/profile values map without AI and
that sensitive unknown answers such as work authorization remain missing.

The production frontend build passes. Existing project-wide ESLint findings
remain in unchanged UI/avatar files; they are unrelated to this feature.

A real Groq/Adzuna request and a real external-site submission were not run
because provider credentials and a test account were unavailable. The required
Windows 11/Python 3.12 environment was not available in this workspace, so
Windows Chromium launch cannot be truthfully marked as passed. A local
Playwright launch and `/application/agent/start` smoke test were attempted in
the available Linux environment; both reached the Chromium process but were
blocked by missing native `libgbm` runtime support and returned a manual
fallback/HTTP 502 rather than claiming success. The launch path now uses
Playwright's synchronous API on a dedicated
`ThreadPoolExecutor(max_workers=1)`, keeping launch, form operations, and
cleanup on the same worker thread. This avoids the Python 3.12 Windows
asyncio subprocess path that raises `NotImplementedError`; it does not catch
that error or fake a browser result. The ZIP contains no
credentials, `.env`, caches, virtual environments, `node_modules`, build
output, logs, or compiled Python files.