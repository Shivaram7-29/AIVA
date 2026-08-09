from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import fitz  # PyMuPDF
import json
import os
import urllib.request
import urllib.parse
from groq import Groq
from dotenv import load_dotenv
import hashlib
import datetime
import re as stdlib_re

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="InterviewAI Backend")

# Allow React frontend (localhost:5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Configure Groq AI (FREE — no billing required) ----------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# The model to use — Llama 3.3 70B is free and very capable
GROQ_MODEL = "llama-3.3-70b-versatile"

if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)
    print(f"[OK] Groq AI configured successfully (model: {GROQ_MODEL})")
else:
    client = None
    print("[WARN] GROQ_API_KEY not found in .env — AI analysis will be unavailable")
    print("[INFO] Get your FREE API key at: https://console.groq.com (no credit card needed)")


def call_ai(prompt: str, max_tokens: int = 4096) -> str:
    """Call Groq AI with json_object mode (returns a JSON dict). Use for object responses."""
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="AI is not available. Please set GROQ_API_KEY in backend/.env file. "
                   "Get your FREE key at https://console.groq.com (no credit card needed)."
        )

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful AI assistant. Always respond with valid JSON when asked for JSON output. No markdown fences, no extra text."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model=GROQ_MODEL,
        temperature=0.7,
        max_tokens=max_tokens,
        response_format={"type": "json_object"}
    )

    content = chat_completion.choices[0].message.content
    return (content or "").strip()


def call_ai_raw(prompt: str, max_tokens: int = 4096) -> str:
    """Call Groq AI WITHOUT json_object mode — allows returning JSON arrays."""
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="AI is not available. Please set GROQ_API_KEY in backend/.env file. "
                   "Get your FREE key at https://console.groq.com (no credit card needed)."
        )

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful AI assistant. Always respond with valid JSON when asked for JSON output. No markdown fences, no extra text."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        model=GROQ_MODEL,
        temperature=0.7,
        max_tokens=max_tokens,
    )

    content = chat_completion.choices[0].message.content
    return (content or "").strip()


# ---------- AI Analysis Prompt ----------
def build_analysis_prompt(resume_text: str, target_role: str) -> str:
    # Determine role category to inject role-specific requirements into the prompt
    role_lower = target_role.lower()

    if any(k in role_lower for k in ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin"]):
        role_category = "MOBILE_DEVELOPMENT"
        role_skills_required = "Flutter, React Native, Swift (iOS), Kotlin (Android), Dart, Xcode, Android Studio, Play Store deployment, REST API integration, Firebase, App performance optimization, UI/UX for mobile"
        role_skills_nice = "State management (Redux/Provider/Riverpod), GraphQL, CI/CD for mobile (Fastlane), push notifications, offline storage"
        role_penalty_note = "If the resume is heavy on ML/Data Science/NLP/CV but has NO mobile frameworks or app projects, the score MUST be 30-55 max. ML skills do NOT count toward mobile development fitness."

    elif any(k in role_lower for k in ["ml", "machine learning", "ai", "data science", "deep learning", "nlp", "computer vision"]):
        role_category = "ML_AI_DATA_SCIENCE"
        role_skills_required = "Python, scikit-learn, TensorFlow or PyTorch, Pandas, NumPy, data preprocessing, model evaluation, Jupyter Notebooks, statistical analysis, feature engineering"
        role_skills_nice = "Hugging Face Transformers, MLflow, model deployment (Flask/FastAPI), SQL for data, Kaggle competitions, research papers"
        role_penalty_note = "If the resume has strong ML projects, Python, and relevant libraries, this is a strong match. Score 65-90 based on project depth and ML internship/certification quality."

    elif any(k in role_lower for k in ["frontend", "front end", "ui", "react", "vue", "angular"]):
        role_category = "FRONTEND"
        role_skills_required = "HTML, CSS, JavaScript, React.js or Vue.js or Angular, responsive design, REST API consumption, Git, browser dev tools, CSS frameworks like Tailwind or Bootstrap"
        role_skills_nice = "TypeScript, Next.js, testing (Jest/Cypress), Figma, web performance optimization, accessibility"
        role_penalty_note = "If the resume is ML-heavy with no web/frontend projects or frameworks, score must reflect the mismatch (30-55 max)."

    elif any(k in role_lower for k in ["backend", "back end", "node", "django", "spring", "api", "server"]):
        role_category = "BACKEND"
        role_skills_required = "Any backend language (Node.js, Python/Django/Flask, Java/Spring, Go), REST API design, SQL databases, authentication (JWT/OAuth), Git, basic cloud deployment"
        role_skills_nice = "Microservices, Docker, Redis, message queues (Kafka/RabbitMQ), system design basics, GraphQL"
        role_penalty_note = "ML projects alone are insufficient for backend roles. Score must reflect presence of actual server-side projects and API knowledge."

    elif any(k in role_lower for k in ["fullstack", "full stack", "full-stack", "mern", "mean"]):
        role_category = "FULLSTACK"
        role_skills_required = "Frontend (React/Vue) + Backend (Node/Django/Flask/Spring), REST APIs, SQL or NoSQL databases, Git, deployment (Vercel/Heroku/AWS), authentication"
        role_skills_nice = "TypeScript, Docker, CI/CD, system design basics, cloud services"
        role_penalty_note = "If resume is ML-only with no web projects, score must be 30-55. Full stack requires BOTH frontend and backend evidence."

    elif any(k in role_lower for k in ["devops", "cloud", "sre", "platform", "infrastructure", "aws", "azure", "gcp"]):
        role_category = "DEVOPS_CLOUD"
        role_skills_required = "Linux/Shell scripting, Docker, Kubernetes basics, CI/CD pipelines (GitHub Actions/Jenkins), AWS or Azure or GCP fundamentals, Git, networking basics"
        role_skills_nice = "Terraform, Ansible, monitoring (Prometheus/Grafana), cloud certifications (AWS CCP, AZ-900)"
        role_penalty_note = "ML/Data Science skills are largely irrelevant to DevOps. Score must penalize heavy ML resumes applying to DevOps roles."

    elif any(k in role_lower for k in ["data analyst", "business analyst", "bi", "power bi", "tableau"]):
        role_category = "DATA_ANALYST"
        role_skills_required = "SQL, Excel, Python (Pandas/NumPy), data visualization (Matplotlib/Seaborn/Tableau/Power BI), statistical analysis, business insight communication"
        role_skills_nice = "Power BI, Tableau, A/B testing, dashboard design, stakeholder reporting"
        role_penalty_note = "ML model building is not the primary requirement. Focus on SQL, visualization, and analytical thinking."

    elif any(k in role_lower for k in ["cybersecurity", "security", "ethical hacking", "penetration", "soc"]):
        role_category = "CYBERSECURITY"
        role_skills_required = "Networking (TCP/IP, DNS, HTTP), Linux, Python for scripting, basic cryptography, vulnerability scanning tools (Nmap, Burp Suite, Metasploit), OWASP top 10"
        role_skills_nice = "CEH or CompTIA Security+ certification, CTF competitions, SIEM tools, incident response basics"
        role_penalty_note = "ML skills are a mismatch for cybersecurity. Score should heavily favor security tools, networking knowledge, and CTF participation."

    elif any(k in role_lower for k in ["product manager", "product management", "pm"]):
        role_category = "PRODUCT_MANAGEMENT"
        role_skills_required = "Product thinking, user story writing, market research, wireframing (Figma/Balsamiq), data-driven decision making, stakeholder communication, Agile/Scrum basics"
        role_skills_nice = "SQL for analytics, A/B testing understanding, competitor analysis, roadmap planning"
        role_penalty_note = "Technical skills matter less than product sense, communication, and analytical ability. Score based on leadership, projects with product impact, and communication quality in the resume."

    else:  # Generic Software Engineer / SDE
        role_category = "SOFTWARE_ENGINEER"
        role_skills_required = "Data Structures & Algorithms, OOP, at least one programming language proficient (C++/Java/Python), SQL, OS basics, Computer Networks basics, Git, problem-solving"
        role_skills_nice = "System design basics, REST API, any web framework, competitive programming profiles (LeetCode/Codeforces), internship at a tech company"
        role_penalty_note = "A strong ML resume can still score 60-75 if the candidate shows strong DSA, good CGPA, and solid projects. But lack of DSA or low problem-solving evidence caps the score at 60."

    return f"""You are a senior Campus Placement Resume Analyst at "InterviewAI". You specialize in evaluating BTech/Engineering fresher resumes specifically for the role the candidate has chosen.

═══════════════════════════════════════════════════
CANDIDATE PROFILE:
- Status: BTech FRESHER or final-year engineering student
- Target Role: {target_role}
- Role Category Detected: {role_category}
═══════════════════════════════════════════════════

RESUME TEXT:
\"\"\"
{resume_text}
\"\"\"

═══════════════════════════════════════════════════
ROLE-SPECIFIC REQUIREMENTS FOR "{target_role}":
Must-Have Skills: {role_skills_required}
Nice-to-Have: {role_skills_nice}
Scoring Note: {role_penalty_note}
═══════════════════════════════════════════════════

SCORING ALGORITHM (apply in this order):

STEP 1 — Role Match Score (0-40 points):
- Count how many MUST-HAVE skills for "{target_role}" appear in the resume
- Award points proportionally. 0 must-have skills = 0 pts, all must-have = 40 pts
- Do NOT give points for skills that are irrelevant to this role

STEP 2 — Project Quality Score (0-25 points):
- 0-8 pts: No projects or very basic (Hello World level)
- 9-15 pts: 1-2 projects, but not relevant to target role or poorly described
- 16-20 pts: 2-3 decent role-relevant projects with tech stack mentioned
- 21-25 pts: Strong projects with deployment, measurable results, or internship-based

STEP 3 — Experience & Achievements Score (0-20 points):
- Internships (especially at known companies): up to 10 pts
- Competitive programming profiles (LeetCode/CF with count): up to 5 pts
- Relevant certifications for this role: up to 5 pts

STEP 4 — Resume Quality Score (0-15 points):
- Clear, ATS-friendly format, quantified achievements, good CGPA (7+): up to 15 pts

FINAL SCORE = Sum of all 4 steps (0-100)

═══════════════════════════════════════════════════
TASK:
Based on the above, produce a STRICT JSON analysis with NO extra text, NO markdown.

RULES YOU MUST FOLLOW:
1. "score" MUST reflect how well this resume matches "{target_role}" specifically — NOT a generic resume quality score
2. "missing_skills" MUST list only skills relevant to "{target_role}" that are ABSENT from the resume. Do NOT list ML skills as missing for a Mobile Dev role. Do NOT list mobile skills as missing for an ML role.
3. "suggestions" MUST be 100% derived from the ACTUAL resume content and the specific "{target_role}". Do NOT use generic boilerplate. Reference actual skills or projects FROM THE RESUME. For example: "Since you have Python skills, build a REST API with FastAPI and deploy it on Railway to demonstrate backend skills for this role."
4. "strengths" MUST reference ACTUAL items from the resume (project names, internship companies, certifications, coding profiles)
5. "role_fit" MUST reflect genuine alignment: if resume is ML-heavy and role is Mobile Dev, say "Weak Fit" with clear reason
6. All extracted skills MUST actually appear in the resume — never hallucinate skills

OUTPUT FORMAT (return ONLY this JSON object):
{{
  "score": <integer 0-100, calculated using the 4-step algorithm above>,
  "summary": "<2-3 sentences: candidate's background, strongest skills, and honest readiness for {target_role}>",
  "role_fit": "<Strong Fit / Moderate Fit / Weak Fit> — <1 sentence explaining WHY based on skill alignment>",
  "skills": {{
    "programming_languages": ["<only languages actually listed in resume, max 5>"],
    "ml_ai": ["<only ML/AI/Data skills actually in resume, max 5, empty array [] if none>"],
    "tools_frameworks": ["<only tools/frameworks/libraries actually in resume, max 5>"],
    "databases": ["<only databases actually in resume, max 3>"],
    "others": ["<other skills like Git, Linux, cloud, soft skills, max 3>"]
  }},
  "missing_skills": ["<3-5 high-impact skills for {target_role} that are MISSING from this resume. Must be specific to {target_role}, not generic>"],
  "strengths": ["<2-3 strengths that reference SPECIFIC items from the resume — project names, internship company, certification names, coding platform handles>"],
  "suggestions": ["<3-5 actionable suggestions that are SPECIFIC to this candidate's resume AND the {target_role} role. Each suggestion must mention a skill already in the resume OR a gap identified, and give a concrete action like building a specific type of project, getting a named certification, or adding a specific section to the resume>"],
  "project_feedback": ["<2-3 points of feedback referencing ACTUAL projects from the resume — are they relevant to {target_role}? What specific improvements would make them stand out to recruiters hiring for {target_role}?>"]
}}
"""


def clean_json_response(text: str) -> dict:
    """Clean AI response and parse JSON"""
    import re
    text = text.strip()
    # Remove markdown code blocks
    text = re.sub(r'```(?:json)?\n?(.*?)\n?```', r'\1', text, flags=re.DOTALL).strip()
    return json.loads(text)


# ---------- Endpoints ----------

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "InterviewAI Backend is running",
        "ai_enabled": client is not None,
        "ai_provider": "Groq (FREE)",
        "model": GROQ_MODEL
    }


@app.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accepts a PDF file, extracts text using PyMuPDF, and returns it.
    """
    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file."
        )

    # 2. Read file bytes
    contents = await file.read()

    # 3. Validate file size (5MB max)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 5MB limit."
        )

    # 4. Extract text from PDF using PyMuPDF
    try:
        pdf_document = fitz.open(stream=contents, filetype="pdf")
        extracted_text = ""
        page_count = len(pdf_document)

        for page_num in range(page_count):
            page = pdf_document[page_num]
            extracted_text += str(page.get_text())

        pdf_document.close()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )

    # 5. Check if any text was extracted
    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract any text from the PDF. It may be a scanned image. Please upload a text-based PDF."
        )

    return {
        "filename": file.filename,
        "pages": page_count,
        "text": extracted_text.strip()
    }


@app.post("/analyze")
async def analyze_resume(file: UploadFile = File(...), target_role: str = Form("Machine Learning Engineer")):
    """
    Accepts a PDF file, extracts text, then sends it to Groq AI for analysis.
    Returns structured resume analysis with score, skills, and suggestions.
    """

    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file."
        )

    # 2. Read and validate file
    contents = await file.read()

    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 5MB limit."
        )

    # 3. Extract text from PDF
    try:
        pdf_document = fitz.open(stream=contents, filetype="pdf")
        extracted_text = ""
        page_count = len(pdf_document)

        for page_num in range(page_count):
            page = pdf_document[page_num]
            extracted_text += str(page.get_text())

        pdf_document.close()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract any text from the PDF."
        )

    # 4. Send to Groq AI for analysis
    try:
        prompt = build_analysis_prompt(extracted_text.strip(), target_role)
        ai_text = call_ai(prompt, max_tokens=4096)
        analysis = clean_json_response(ai_text)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid response. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

    # 5. Return structured result
    return {
        "filename": file.filename,
        "pages": page_count,
        "target_role": target_role,
        "analysis": analysis
    }


# ============================================================
#  APTITUDE TEST ENDPOINT
# ============================================================

@app.post("/aptitude/generate")
async def generate_aptitude_test(count: int = 20):
    """
    Generate MCQ aptitude questions for campus placements.
    Returns 20 multiple-choice questions with 4 options each.
    """

    prompt = f"""You are an expert test creator for campus placement aptitude tests modeled after TCS NQT (National Qualifier Test) Foundation Section.

Generate exactly {count} multiple-choice questions (MCQs) for a BTech fresher preparing for campus placements.

SECTION DISTRIBUTION (follow TCS NQT pattern):

SECTION 1: NUMERICAL ABILITY (7 questions)
Topics to cover:
- Number Systems, HCF & LCM
- Percentages, Profit & Loss
- Simple & Compound Interest
- Time and Work, Pipes & Cisterns
- Speed, Time & Distance
- Ratio & Proportion, Averages
- Data Interpretation (tables, bar graphs)
- Mixtures & Allegations

SECTION 2: VERBAL ABILITY (7 questions)
Topics to cover:
- Reading Comprehension (give a short 3-4 line passage + question)
- Sentence Correction / Error Spotting
- Fill in the Blanks (vocabulary-based)
- Synonyms & Antonyms
- Para-jumbles (sentence rearrangement)
- Idioms & Phrases

SECTION 3: REASONING ABILITY (6 questions)
Topics to cover:
- Coding-Decoding
- Number Series / Letter Series
- Blood Relations
- Seating Arrangement (linear/circular)
- Syllogisms
- Direction Sense
- Statement & Conclusion

RULES:
- Each question must have exactly 4 options: A, B, C, D
- Exactly ONE correct answer per question
- Difficulty: Mix of Easy (40%), Medium (40%), Hard (20%)
- Questions should match the standard of TCS NQT, Infosys, Wipro, Cognizant placement tests
- Quantitative questions should involve actual calculations, not just definitions
- Verbal questions should test real English comprehension skills
- Reasoning questions should require logical thinking

Return ONLY this JSON array:
[
  {{
    "id": 1,
    "question": "Question text here?",
    "options": {{
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    }},
    "correct": "B",
    "topic": "Numerical Ability",
    "difficulty": "Easy"
  }},
  ... (total {count} questions)
]

IMPORTANT: topic must be exactly one of: "Numerical Ability", "Verbal Ability", "Reasoning Ability"
Return ONLY the JSON array. No markdown, no explanation."""

    try:
        ai_text = call_ai_raw(prompt, max_tokens=8000)
        parsed = clean_json_response(ai_text)

        # Groq may wrap the array in an object like {"questions": [...]} — unwrap it
        if isinstance(parsed, dict):
            # Find the first list value inside the dict
            questions = next((v for v in parsed.values() if isinstance(v, list)), None)
            if questions is None:
                raise ValueError("AI returned a dict but no list of questions found inside.")
        elif isinstance(parsed, list):
            questions = parsed
        else:
            raise ValueError("Unexpected AI response format.")

        return {"questions": questions, "total": len(questions)}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid format. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


class StartInterviewRequest(BaseModel):
    role: str = "Software Engineer"
    interview_type: str = "Technical"


@app.post("/interview/start")
async def start_interview(req: StartInterviewRequest):
    """Start a mock interview. Returns the first question."""

    prompt = f"""You are an expert AI interviewer conducting a {req.interview_type} round for a {req.role} position.
The candidate is a BTech fresher preparing for campus placements.

Generate the FIRST interview question.

INTERVIEW TYPE:
- HR: Introduction, strengths/weaknesses, teamwork, why this company, career goals, situational questions
- Technical: Core CS concepts — DSA, OOP, DBMS, OS, CN relevant to {req.role}
- Coding: A coding problem with clear input/output, fresher difficulty level

Return ONLY this JSON:
{{
  "question": "The interview question",
  "question_number": 1,
  "difficulty": "Easy",
  "topic": "Topic area",
  "hint": "A subtle hint (1 line)"
}}
No extra text."""

    try:
        ai_text = call_ai(prompt, max_tokens=1024)
        return clean_json_response(ai_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


class AnswerRequest(BaseModel):
    question: str
    answer: str
    role: str = "Software Engineer"
    interview_type: str = "Technical"
    question_number: int = 1
    history: List[Dict[str, str]] = Field(default_factory=list)


@app.post("/interview/answer")
async def evaluate_answer(req: AnswerRequest):
    """Evaluate answer and generate next question."""
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    # Format history for prompt
    history_text = ""
    if req.history:
        history_text = "PREVIOUS QUESTIONS AND ANSWERS:\n"
        for item in req.history:
            history_text += f"- Q: {item.get('question', '')}\n  A: {item.get('answer', '')}\n"

    prompt = f"""You are an expert AI interviewer conducting a {req.interview_type} round for {req.role}.
The candidate is a BTech fresher.

{history_text}

CURRENT QUESTION #{req.question_number}: "{req.question}"
CANDIDATE'S ANSWER: "{req.answer}"

Evaluate the current answer AND generate the next question.
If the candidate's answer is incomplete or incorrect, the next question can be a follow-up or hint to guide them. If they answered well, move on to a progressively harder question or a different sub-topic.
Be encouraging but honest. A partial answer from a fresher deserves 5-7/10.

Return ONLY this JSON:
{{
  "feedback": {{
    "score": 1-10,
    "verdict": "Excellent / Good / Average / Needs Improvement",
    "strengths": ["max 2 points"],
    "weaknesses": ["max 2 points"],
    "better_answer": "Model answer (3-5 lines)"
  }},
  "next_question": {{
    "question": "Next question (can be a follow-up or new topic)",
    "question_number": {req.question_number + 1},
    "difficulty": "Easy / Medium / Hard",
    "topic": "Topic area",
    "hint": "Hint (1 line)"
  }}
}}
No extra text."""

    try:
        ai_text = call_ai(prompt, max_tokens=2048)
        return clean_json_response(ai_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")


# ============================================================
#  RESUME-BASED JOB MATCHING  — /jobs/match
# ============================================================

def _extract_pdf_text(contents: bytes) -> tuple:
    """
    Shared helper: extract text + page count from raw PDF bytes.
    Raises HTTPException on invalid/empty PDF.
    Returns (text: str, page_count: int).
    """
    try:
        pdf_document = fitz.open(stream=contents, filetype="pdf")
        extracted_text = ""
        page_count = len(pdf_document)
        for page_num in range(page_count):
            extracted_text += str(pdf_document[page_num].get_text())
        pdf_document.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from the PDF. It may be a scanned image. Please upload a text-based PDF."
        )
    return extracted_text.strip(), page_count


def build_job_match_prompt(resume_text: str, target_role: str = "") -> str:
    """
    Evidence-based prompt that extracts a structured candidate profile AND
    suggests suitable job roles — all in a single Groq call.

    Comprehensive rules ensure:
    - Profile is built from ALL resume sections (summary, experience, projects,
      skills, education, certifications).
    - Technology equivalence is recognised (e.g. LangChain + Gemma 3 + GenAI
      internship = LLM/GenAI experience) without false equating unrelated tools.
    - missing_skills is precise: a broader skill is NOT marked missing when
      narrower explicit evidence covers it.
    - Scoring is transparent and balanced.
    - Evidence is mandatory for every claim.
    """
    role_hint = f"\nThe candidate has expressed interest in: {target_role}." if target_role.strip() else ""

    return f"""You are a precise, evidence-based career analysis AI for job-seekers.
Analyse the resume below. Return ONE JSON object with exactly two keys:
"candidate_profile" and "recommended_roles".{role_hint}

RESUME:
\"\"\"
{resume_text}
\"\"\"

══════════════════════════════════════════════════════════════
PART 1 — COMPREHENSIVE CANDIDATE PROFILE EXTRACTION
══════════════════════════════════════════════════════════════

Before matching, build the candidate profile by scanning ALL of these resume
sections thoroughly:
  • Summary / Objective
  • Work Experience / Internships (role, company, responsibilities, technologies used)
  • Education (degree, branch, institution, year, GPA)
  • Projects (name, description, technologies, outcomes)
  • Skills / Technical Skills / Programming Languages
  • Frameworks, Libraries, Tools
  • Certifications
  • Achievements / Awards / Competitive Programming

STRICT EXTRACTION RULES (violations are not acceptable):
1. ONLY include information that is EXPLICITLY written in the resume. Do not infer or assume.
2. If a skill, tool, technology, or experience is NOT clearly stated, do NOT include it anywhere.
3. Do not invent project details, responsibilities, or outcomes not stated in the resume.
4. If a field has no evidence in the resume, use an empty array [].
5. Certifications must only include items the resume explicitly labels as a certificate or course.
6. programming_languages must include ALL programming languages explicitly named in the resume.
7. frameworks_and_tools must include ALL frameworks, libraries, and tools explicitly named.
8. experience must capture EACH internship/job with role title, company, and key technologies.
9. projects must capture EACH project with name, key technologies, and a 1-line description.

══════════════════════════════════════════════════════════════
PART 2 — JOB MATCHING RULES
══════════════════════════════════════════════════════════════

For EACH recommended role, apply ALL of the following rules:

──────────────────────────────────────────────────────────────
RULE A — TECHNOLOGY-TO-CAPABILITY EQUIVALENCE (precision rule)
──────────────────────────────────────────────────────────────
When determining if the candidate has a capability, accept these equivalences
ONLY when the resume genuinely demonstrates them through projects, internships,
or work experience (NOT just skills/tool listings):

  LangChain + any named LLM (Gemma, GPT, LLaMA, Claude, Mistral, etc.)
    in a project/internship/work experience
    = GenAI / LLM-related experience
    = "Large Language Models" or "LLM" is a MATCHED capability, NOT missing
    = "LLM experience" or "LLMs experience" is MATCHED, NOT missing

  GenAI internship or "Generative AI" or "(GenAI)" role
    = GenAI / LLM-related experience
    = "Large Language Models" or "LLM" is a MATCHED capability, NOT missing

  Multilingual PDF summarization using LangChain and Gemma 3
    = GenAI / LLM experience (project demonstrates LLM usage)

  Flask or Django or FastAPI project described
    = Python backend / web framework experience
    = "Python backend" or "web framework" is a MATCHED capability

  RESTful endpoints or REST API described
    = API development experience

  TensorFlow or PyTorch project described
    = deep learning / ML framework experience

  Scikit-learn, K-Means, clustering, model training described
    = machine learning experience

  React/TypeScript/Angular/Vue used in a project
    = frontend development experience

  SQLite/MySQL/MongoDB/PostgreSQL queries or usage described
    = database experience

  Docker/Kubernetes mentioned in projects or tools
    = containerization / DevOps experience

CRITICAL — These are MATCHED when supported by evidence:
  If the resume mentions "LangChain" AND "Gemma 3" in a project or internship,
  then "Large Language Models (LLMs) experience" is MATCHED — do NOT list it as missing.
  If the resume has a "(GenAI)" internship using these tools, LLM experience is MATCHED.

IMPORTANT — DO NOT falsely equate:
  ✗ Flask does NOT mean FastAPI or Django.
  ✗ React does NOT mean Angular or Vue.
  ✗ Python does NOT mean Django.
  ✗ LangChain alone (without a named LLM or GenAI context) does NOT prove LLM experience.
  ✗ Pandas listed in skills does NOT prove Data Analysis (only tool mention, not capability).

──────────────────────────────────────────────────────────────
RULE B — MISSING-SKILL PRECISION (critical rule)
──────────────────────────────────────────────────────────────
Before adding ANY skill to missing_skills, you MUST verify ALL of these:

  1. Is this skill genuinely required for this specific role? (Not just commonly associated.)
  2. Did I scan ALL resume sections: summary, experience, projects, skills,
     education, certifications, tools?
  3. Is there ZERO explicit evidence for this capability across the entire resume?
  4. Is there NO technology equivalence that covers it (Rule A)?
     e.g., if the resume has LangChain + Gemma 3 + GenAI internship, then
     "Large Language Models (LLMs) experience" is NOT missing.
  5. Is this a technical/domain CAPABILITY — not seniority, years, or soft skills?

COMPLETELY FORBIDDEN in missing_skills (never include regardless of role):
  ✗ "senior-level experience" or "years of experience" (any form)
  ✗ "professional experience" or "seniority"
  ✗ "leadership experience" or "management experience"
  ✗ Communication skills, teamwork, or generic soft skills
  ✗ Any broader skill where narrower explicit evidence covers it
     (e.g., do NOT list "LLM experience" as missing when the resume
      contains LangChain + Gemma 3 + GenAI internship)
  ✗ "Large Language Models experience" or "LLMs experience" when the resume
    has LangChain + named LLM + GenAI context (Rule A covers this)

──────────────────────────────────────────────────────────────
RULE C — KEY_SKILLS_MATCHED EVIDENCE MANDATE
──────────────────────────────────────────────────────────────
For EVERY item in key_skills_matched, the evidence array MUST contain a direct
resume reference that genuinely supports that capability.

Do NOT mark a skill as matched merely because:
  ✗ The technology appears in a skills list (tool mention ≠ capability)
  ✗ The skill is commonly associated with another demonstrated skill

What DOES constitute valid evidence:
  ✓ Python in programming_languages → supports "Python" as matched
  ✓ "Developed a Flask-based backend" in a project → supports "Python backend"
  ✓ "LangChain and Gemma 3" in GenAI internship → supports "LLM/GenAI experience"
  ✓ "RESTful endpoints" in experience → supports "API development"
  ✓ "React/TypeScript frontend" in project → supports "frontend development"

──────────────────────────────────────────────────────────────
RULE D — BALANCED MATCH SCORE (transparent scoring)
──────────────────────────────────────────────────────────────
Calculate match_score using this balanced algorithm:

STEP 1 — Technical Skill Match (0-40 points):
  Count how many key technical requirements for this role the resume explicitly
  demonstrates (using Rule A equivalences). Award proportionally.
  Do NOT give 40/40 for just 2-3 technology name matches. Require substantive
  alignment of capabilities with role responsibilities.

STEP 2 — Experience & Project Quality (0-30 points):
  0-10: No relevant experience or projects
  11-20: 1-2 relevant projects or a relevant internship
  21-30: Strong relevant projects + internship with matching technologies

STEP 3 — Education & Certifications (0-15 points):
  Relevant degree (CS/IT/related): up to 10
  Relevant certifications: up to 5

STEP 4 — Role Alignment (0-15 points):
  How well the candidate's demonstrated capabilities align with the core
  responsibilities of this specific role (not just title match).
  If the role is senior/lead and the candidate is entry-level, cap this at 5.
  If the role is entry-level and the candidate is entry-level, allow full 15.

FINAL SCORE = Sum of all 4 steps (0-100)

Do NOT give 90+ simply because 1-2 skills match.
Do NOT give 70-80 when only 2-3 technologies match but core responsibilities don't align.
Do NOT heavily penalize lack of professional experience for entry-level roles
when the candidate has relevant internship/project experience.

──────────────────────────────────────────────────────────────
RULE E — EVIDENCE QUALITY
──────────────────────────────────────────────────────────────
Each evidence entry must be a concise paraphrase referencing ACTUAL resume content.
Prefer mentioning:
  • Internship (e.g., "GenAI internship at Broadrange AI using LangChain and Gemma 3")
  • Project (e.g., "Route Optimization using Python, Scikit-learn, K-Means++")
  • Technology (e.g., "React/TypeScript frontend with backend APIs")
  • Responsibility (e.g., "Designed secure RESTful endpoints")

Do NOT invent evidence. If you cannot find clear evidence, lower match_score instead.

──────────────────────────────────────────────────────────────
RULE F — ENTRY-LEVEL FAIRNESS
──────────────────────────────────────────────────────────────
For entry-level/junior roles:
  • Do NOT heavily penalize lack of multi-year professional experience.
  • Relevant internship experience counts toward capability evidence.
  • Relevant academic projects count toward skill evidence.
  • Score should reflect demonstrated CAPABILITIES, not years of work history.

──────────────────────────────────────────────────────────────
RULE G — ROLE RECOMMENDATION GUIDELINES
──────────────────────────────────────────────────────────────
  • Recommend 4-6 realistic entry-level/junior roles supported by resume evidence.
  • Do NOT suggest senior or specialist roles unsupported by the resume.
  • career_level must be exactly one of: "Entry Level", "Junior", or "Mid Level".
  • Include roles that leverage the candidate's STRONGEST demonstrated capabilities.
  • NEVER recommend roles with "Senior", "Lead", "Principal", "Staff", or "Architect"
    in the title for a fresher/entry-level candidate.

══════════════════════════════════════════════════════════════
Return ONLY this JSON (no markdown, no extra text):
══════════════════════════════════════════════════════════════
{{
  "candidate_profile": {{
    "name": "<full name as written in resume, or 'Not specified'>",
    "education": ["<degree, branch, institution, year — copy exactly from resume, one entry per line>"],
    "skills": ["<only soft/general skills explicitly stated in resume>"],
    "programming_languages": ["<only languages explicitly listed in resume>"],
    "frameworks_and_tools": ["<only frameworks, libraries, and tools explicitly named in resume>"],
    "experience": ["<internship or job: exact role title @ company name, duration — one entry per position, empty array if none>"],
    "projects": ["<project name — 1-line description using only details stated in resume>"],
    "certifications": ["<certification name — issuer, only if explicitly mentioned in resume>"],
    "target_roles": ["<3-5 broad job role titles genuinely supported by resume evidence>"]
  }},
  "recommended_roles": [
    {{
      "role_title": "<specific entry-level job title>",
      "match_score": <integer 0-100, calculated using the 4-step balanced algorithm>,
      "match_reason": "<1-2 sentences explaining the match using only resume facts>",
      "key_skills_matched": ["<skills present in BOTH the resume AND this role's requirements, each backed by evidence>"],
      "missing_skills": ["<2-4 genuinely missing technical skills required for this role and ABSENT from the resume — see Rule B>"],
      "evidence": ["<1-3 direct resume references supporting the matched skills — see Rule E>"],
      "career_level": "<Entry Level | Junior | Mid Level>",
      "job_categories": ["<1-2 industry tags, e.g. 'Data Science', 'Web Development'>"]
    }}
  ]
}}"""


@app.post("/jobs/match")
async def match_jobs(
    file: UploadFile = File(...),
    target_role: str = Form("")
):
    """
    Accepts a resume PDF and an optional target role preference.
    Extracts text, profiles the candidate via Groq AI, and returns
    a structured candidate profile + recommended job roles.
    Does NOT fetch real job listings — roles are AI-suggested based on resume.
    """

    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file."
        )

    # 2. Read and validate file size
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    # 3. Extract text (reuses shared helper — no duplication)
    resume_text, page_count = _extract_pdf_text(contents)

    # 4. Build prompt and call Groq (single call for profile + roles)
    try:
        prompt = build_job_match_prompt(resume_text, target_role)
        ai_text = call_ai(prompt, max_tokens=2048)
        result = clean_json_response(ai_text)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid response. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")

    # 5. Return structured response
    return {
        "filename": file.filename,
        "pages": page_count,
        "target_role_preference": target_role or None,
        "candidate_profile": result.get("candidate_profile", {}),
        "recommended_roles": result.get("recommended_roles", []),
    }


# ============================================================
#  ADZUNA JOB SEARCH  — GET /jobs/search
#
#  ATTRIBUTION NOTICE (for frontend implementation):
#  Adzuna requires attribution when displaying job listings.
#  The frontend MUST display: "Powered by Adzuna" with a link
#  to https://www.adzuna.in/ wherever these results are shown.
# ============================================================

# Adzuna base URL — country code 'in' targets the Indian job market
_ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/in/search"
_ADZUNA_RESULTS_PER_PAGE = 10  # Keep small to conserve free-tier quota


@app.get("/jobs/search")
def search_jobs(
    query: str,
    location: str = "India",
    page: int = 1,
):
    """
    Search real job listings via the Adzuna Jobs API.
    Credentials are read from environment variables and are never
    included in the API response.

    Query params:
      - query    (required): job title / keywords, e.g. 'Python Developer'
      - location (optional): city or region, default 'India'
      - page     (optional): result page number, default 1

    Returns up to 10 jobs per request to conserve Adzuna quota.
    """

    # 1. Load credentials from environment — never hardcode or log these
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        raise HTTPException(
            status_code=503,
            detail="Job search is unavailable. ADZUNA_APP_ID and ADZUNA_APP_KEY "
                   "must be set in backend/.env."
        )

    # 2. Validate page number
    if page < 1:
        raise HTTPException(status_code=400, detail="'page' must be 1 or greater.")

    # 3. Build Adzuna API URL using urllib (stdlib — no new dependency needed)
    params = urllib.parse.urlencode({
        "app_id": app_id,
        "app_key": app_key,
        "what": query.strip(),
        "where": location.strip(),
        "results_per_page": _ADZUNA_RESULTS_PER_PAGE,
        "content-type": "application/json",
    })
    url = f"{_ADZUNA_BASE}/{page}?{params}"

    # 4. Call Adzuna — handle network and API errors gracefully
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = json.loads(response.read().decode("utf-8"))

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail=f"Adzuna API error {e.code}: {error_body[:200]}"
        )
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Adzuna API: {str(e.reason)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Job search failed: {str(e)}"
        )

    # 5. Normalise each job — only expose useful fields, no credentials
    jobs = []
    for job in raw.get("results", []):
        jobs.append({
            "id": job.get("id", ""),
            "title": job.get("title", ""),
            "company": job.get("company", {}).get("display_name", "Not specified"),
            "location": job.get("location", {}).get("display_name", location),
            "description": job.get("description", ""),
            "salary_min": job.get("salary_min"),   # may be None
            "salary_max": job.get("salary_max"),   # may be None
            "created": job.get("created", ""),
            "redirect_url": job.get("redirect_url", ""),
        })

    # 6. Return structured response — credentials are NOT included
    return {
        "query": query,
        "location": location,
        "count": len(jobs),
        "jobs": jobs,
    }


# ============================================================
#  REAL-JOB AI MATCHING  — POST /jobs/match-real
#
#  Accepts: resume PDF  +  jobs JSON array (from /jobs/search)
#  Returns: up to 5 ranked jobs with resume-to-job compatibility
#  Uses ONE Groq call. No Adzuna calls. No fake data.
# ============================================================

MAX_MATCH_JOBS = 5          # return at most 5 ranked results
MAX_DESC_CHARS  = 400       # truncate job description in prompt to save tokens


def _strip_markdown_url(url: str) -> str:
    """
    Safety net: if the AI (or any layer) accidentally wraps a URL in Markdown
    link syntax like [text](https://...) or <https://...>, strip it and return
    the bare URL.  The primary defence is never giving the AI the redirect_url
    at all; this function is a belt-and-braces fallback.
    """
    import re
    url = url.strip()
    # Match [any text](url) — capture the url part
    md_match = re.match(r'^\[.*?\]\((.+?)\)$', url)
    if md_match:
        return md_match.group(1).strip()
    # Match <url> (angle-bracket form)
    ab_match = re.match(r'^<(.+?)>$', url)
    if ab_match:
        return ab_match.group(1).strip()
    return url


def _build_real_match_prompt(resume_text: str, jobs: list) -> str:
    """
    Build a concise single-call Groq prompt that:
      1. Derives a candidate profile strictly from the resume text.
      2. Compares the candidate against every provided job.
      3. Returns a JSON object with 'matched_jobs' list, sorted by match_score desc.

    The prompt is intentionally compact to minimise free-tier token usage.
    redirect_url is intentionally excluded from the prompt — the backend
    always restores it from the original client-supplied data.
    """
    # Summarise each job compactly for the prompt.
    # redirect_url is intentionally NOT included — the AI must never see or
    # touch it so it cannot corrupt the value.
    jobs_block = ""
    for idx, job in enumerate(jobs, start=1):
        desc = (job.get("description") or "").strip()
        desc_snippet = desc[:MAX_DESC_CHARS] + ("..." if len(desc) > MAX_DESC_CHARS else "")
        jobs_block += (
            f"JOB {idx}:\n"
            f"  job_id: {job.get('id', '')}\n"
            f"  title: {job.get('title', '')}\n"
            f"  company: {job.get('company', '')}\n"
            f"  location: {job.get('location', '')}\n"
            f"  description: {desc_snippet}\n\n"
        )

    return f"""You are a strict AI job-matching engine. You will be given a resume and a list of real job postings.

TASK:
1. Extract a concise candidate profile from the resume (skills, experience, education, tools).
2. Compare the candidate against EACH job listing.
3. Return a JSON object with a single key "matched_jobs" containing a list of results sorted by match_score descending.

RESUME:
\"\"\"
{resume_text}
\"\"\"

REAL JOB LISTINGS:
{jobs_block}

STRICT RULES (violations are unacceptable):
- Base EVERY score and field ONLY on information explicitly present in the resume and the job description above.
- Do NOT invent skills, experience, tools, education, or job requirements.
- Do NOT give a high match_score just because the job title sounds similar.
- Compare actual: skills, technologies, experience requirements, education, and role responsibilities.
- If a job requires experience the resume does NOT demonstrate, reduce match_score accordingly.
- matched_skills: only skills present in BOTH the resume AND the job requirements.
- missing_skills: skills the job requires that are ABSENT from the resume.
- evidence: 1-3 short direct paraphrases from the resume that support the match.

TECHNOLOGY-TO-CAPABILITY EQUIVALENCES (accept when resume demonstrates them):
  LangChain + any named LLM (Gemma, GPT, LLaMA, Claude, Mistral) = GenAI/LLM experience
  GenAI internship or "(GenAI)" role = GenAI/LLM experience
  Flask/Django/FastAPI project = Python backend / web framework
  TensorFlow/PyTorch project = deep learning / ML framework
  Scikit-learn, K-Means, model training = machine learning
  React/TypeScript/Angular/Vue project = frontend development
  SQLite/MySQL/MongoDB/PostgreSQL usage = database experience
  Docker/Kubernetes = containerization / DevOps

CRITICAL: If the resume has LangChain + named LLM + GenAI context, then
"Large Language Models experience" or "LLM experience" is MATCHED, NOT missing.

DO NOT falsely equate: Flask=FastAPI, React=Angular, Python=Django, LangChain alone=LLM, Pandas=Data Analysis.

SENIORITY vs TECHNICAL SKILLS (CRITICAL separation):
- Technical skills and seniority are COMPLETELY DIFFERENT. NEVER mix them.
- missing_skills MUST ONLY contain missing technical/domain CAPABILITIES.
- Experience/seniority gaps belong EXCLUSIVELY in experience_match and match_summary.
- NEVER put in missing_skills: "years of experience", "senior-level", "professional experience",
  "leadership experience", "management experience", or any seniority phrasing.

- experience_match rules (use EXACTLY one of these four values):
    "Strong"  = the resume clearly demonstrates the relevant experience AND the job description provides compatible, specific requirements that are met.
    "Partial" = some relevant experience is demonstrated, but important requirements are missing from the resume or unclear from the job description. USE THIS for a junior/fresher candidate with strong technical skills applying to a mid/senior role.
    "Weak"    = significant TECHNICAL mismatch (not merely a seniority gap).
    "Unknown" = the job description does not provide enough information to determine whether the experience requirement is met.
- Do NOT assign "Strong" simply because the job title matches or the description is vague.
- match_summary: 1-2 concise sentences distinguishing technical alignment from experience/seniority alignment.
  BAD: "Candidate lacks full-stack development." (wrong when resume shows React+Flask project)
  GOOD: "Candidate demonstrates Python, Flask, and full-stack capabilities, but has less professional experience than the senior-level requirement."
- Do NOT write "Meets all the job requirements" unless EVERY important requirement is explicitly supported.
- Do NOT include redirect_url in your response. The field will be populated by the server.

MATCH SCORE GUIDELINES:
90-100: Excellent technical alignment; experience requirements reasonably met.
75-89:  Strong technical alignment; minor gaps or experience-level limitations.
60-74:  Moderate alignment; several meaningful technical gaps.
40-59:  Limited alignment; significant technical gaps.
<40:    Poor alignment; fundamental skill mismatch.
Do NOT give 70-80 merely because 2-3 technologies match — require substantive capability alignment.
Do NOT lower the score merely because of fewer years if technical skill alignment is strong.

Return ONLY this JSON (no markdown, no extra text):
{{
  "matched_jobs": [
    {{
      "job_id": "<exact job_id from listing>",
      "title": "<exact title from listing>",
      "company": "<exact company from listing>",
      "location": "<exact location from listing>",
      "match_score": <integer 0-100>,
      "matched_skills": ["<skill in both resume and job>"],
      "missing_skills": ["<skill required by job but absent from resume>"],
      "experience_match": "<Strong | Partial | Weak | Unknown>",
      "evidence": ["<direct resume reference supporting this match>"],
      "match_summary": "<1-2 sentence summary>"
    }}
  ]
}}"""


@app.post("/jobs/match-real")
async def match_real_jobs(
    file: UploadFile = File(...),
    jobs: str = Form(...),
):
    """
    Match a resume PDF against a list of REAL Adzuna jobs (provided by the client
    from a prior call to GET /jobs/search).

    multipart/form-data fields:
      - file : resume PDF (required)
      - jobs : JSON string — the 'jobs' array from /jobs/search (required)

    Returns up to 5 jobs ranked by AI-assessed resume compatibility.
    Makes exactly ONE Groq API call. Does NOT call Adzuna.
    """

    # ── 1. Validate PDF ────────────────────────────────────────────────────────
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    # ── 2. Validate and parse jobs JSON ────────────────────────────────────────
    try:
        jobs_list = json.loads(jobs)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="'jobs' field must be a valid JSON array string.",
        )

    if not isinstance(jobs_list, list):
        raise HTTPException(
            status_code=400,
            detail="'jobs' must be a JSON array (list) of job objects.",
        )

    # Filter to only well-formed job objects (must have at least an id or title)
    valid_jobs = [
        j for j in jobs_list
        if isinstance(j, dict) and (j.get("id") or j.get("title"))
    ]

    # Graceful handling: empty list → return empty result immediately
    if not valid_jobs:
        return {
            "filename": file.filename,
            "matched_jobs": [],
        }

    # Cap to MAX_MATCH_JOBS before building the prompt to save tokens
    jobs_to_match = valid_jobs[:MAX_MATCH_JOBS]

    # ── 3. Extract resume text (reuses shared helper) ──────────────────────────
    resume_text, _page_count = _extract_pdf_text(contents)

    # ── 4. Single Groq call — profile candidate + rank all jobs ───────────────
    try:
        prompt = _build_real_match_prompt(resume_text, jobs_to_match)
        # Use call_ai (json_object mode) — one call, returns a JSON dict
        ai_text = call_ai(prompt, max_tokens=2048)
        ai_result = clean_json_response(ai_text)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid JSON response. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Job matching failed: {str(e)}",
        )

    # ── 5. Extract, sanitise, and sort matched jobs ────────────────────────────
    raw_matched = ai_result.get("matched_jobs", [])
    if not isinstance(raw_matched, list):
        raw_matched = []

    # Build a lookup so we can restore exact redirect_url from the original data
    # (guard against the AI accidentally altering it)
    original_url_map: dict = {
        str(j.get("id", "")): j.get("redirect_url", "")
        for j in jobs_to_match
    }

    sanitised: list = []
    for item in raw_matched:
        if not isinstance(item, dict):
            continue

        job_id = str(item.get("job_id", ""))

        # Always restore the original redirect_url — never use the AI's version.
        # Then run _strip_markdown_url() as a belt-and-braces guard in case
        # anything downstream accidentally introduced Markdown link syntax.
        redirect_url = _strip_markdown_url(
            original_url_map.get(job_id, item.get("redirect_url", ""))
        )

        sanitised.append({
            "job_id":          job_id,
            "title":           str(item.get("title", "")),
            "company":         str(item.get("company", "")),
            "location":        str(item.get("location", "")),
            "match_score":     int(item.get("match_score", 0)),
            "matched_skills":  list(item.get("matched_skills", [])),
            "missing_skills":  list(item.get("missing_skills", [])),
            "experience_match": str(item.get("experience_match", "Weak")),
            "evidence":        list(item.get("evidence", [])),
            "match_summary":   str(item.get("match_summary", "")),
            "redirect_url":    redirect_url,
        })

    # Sort descending by match_score; return at most MAX_MATCH_JOBS entries
    sanitised.sort(key=lambda x: x["match_score"], reverse=True)
    sanitised = sanitised[:MAX_MATCH_JOBS]

    # ── 6. Return final response ───────────────────────────────────────────────
    return {
        "filename":     file.filename,
        "matched_jobs": sanitised,
    }


# ============================================================
#  AUTOMATIC RESUME → ADZUNA → AI MATCHING  — POST /jobs/recommend
#
#  Full pipeline in ONE request:
#    1. Extract resume text
#    2. Deterministic Python → derive search queries (NO Groq call)
#    3. max 2-3 Adzuna searches (internal helper, no HTTP self-call)
#    4. Deduplicate + basic filter → select max 5 jobs
#    5. ONE Groq call → candidate_profile + ranked matched_jobs
#
#  Total Groq calls per request : 1
#  Total Adzuna calls per request: 2 (target_role given) / 3 (inferred)
#  No new dependencies. No HTTP self-calls.
# ============================================================

# Keyword terms that strongly suggest a senior/specialist role not suitable
# for freshers. Used for both soft and hard filtering depending on context.
_SENIOR_KEYWORDS = {
    "senior", "sr.", "sr ", "lead", "principal", "staff", "head of",
    "director", "vp", "vice president", "manager", "architect",
    "10+ years", "8+ years", "7+ years", "6+ years", "5+ years",
}

# Keywords that indicate a mid/senior role in job TITLE only (no description needed)
_SENIOR_TITLE_KEYWORDS = {
    "senior", "sr.", "sr ", "lead", "principal", "staff",
    "director", "vp", "vice president", "manager", "architect",
    "head of", "chief", "cto", "ceo", "coo",
}


def _detect_experience_level(resume_text: str) -> str:
    """
    Deterministic detection of candidate experience level from resume text.
    Returns one of: 'fresher', 'junior', 'mid', 'senior'.

    Detection heuristics (in priority order):
    1. If resume explicitly says 'fresher', 'freshers', 'entry level' → 'fresher'
    2. If work experience section has only internships or no work history → 'fresher'
    3. If resume mentions < 2 years total professional experience → 'junior'
    4. If resume mentions 2-5 years experience → 'mid'
    5. If resume mentions 5+ years or has senior/lead titles → 'senior'
    6. Default for student resumes (BTech/BSc/BE with graduation year >= 2024) → 'fresher'
    """
    text_lower = resume_text.lower()

    # Check explicit fresher/entry-level indicators
    fresher_indicators = [
        "fresher", "freshers", "entry level", "entry-level",
        "looking for internship", "seeking internship",
        "no experience", "0 years",
    ]
    if any(ind in text_lower for ind in fresher_indicators):
        return "fresher"

    # Check for recent/future graduation year (student or very recent grad)
    import re as _re
    current_year = 2026
    grad_years = _re.findall(r'\b(20\d{2})\b', resume_text)
    recent_grad_years = [int(y) for y in grad_years if current_year - 1 <= int(y) <= current_year + 1]

    # Check for internship-only experience (no full-time roles)
    has_internship = any(kw in text_lower for kw in ["intern", "internship", "trainee"])
    has_fulltime = any(kw in text_lower for kw in ["full-time", "fulltime", "employed at", "working at",
                                                      "associate ", "engineer at", "developer at"])

    # Check for years of experience
    years_patterns = _re.findall(r'(\d+)\+?\s*years?\s+(?:of\s+)?experience', text_lower)
    max_years = max(int(y) for y in years_patterns) if years_patterns else 0

    # Decision logic
    if max_years >= 5:
        return "senior"
    if max_years >= 2:
        return "mid"
    if max_years >= 1:
        return "junior"

    # No explicit years — use heuristics
    if has_fulltime and not has_internship:
        return "mid"  # Has full-time work but no years mentioned
    if has_internship and not has_fulltime:
        return "fresher"  # Only internships = fresher
    if recent_grad_years:
        return "fresher"  # Recent/upcoming graduation = fresher

    # Check for student indicators
    student_indicators = ["b.tech", "btech", "b.e", "be ", "b.sc", "bsc",
                         "m.tech", "mtech", "m.e", "me ", "m.sc", "msc",
                         "student", "pursuing", "final year", "3rd year", "4th year"]
    if any(ind in text_lower for ind in student_indicators):
        return "fresher"

    # Check for senior-level title claims in the resume
    if any(kw in text_lower for kw in ["senior developer", "senior engineer", "lead developer",
                                        "tech lead", "principal engineer"]):
        return "senior"

    # Default: if we can't determine, assume junior (safer than assuming senior)
    return "junior"


def _search_adzuna_jobs(query: str, location: str, page: int = 1) -> list:
    """
    Internal Adzuna search helper shared by /jobs/search and /jobs/recommend.
    Reuses the same urllib logic, constants, and normalisation already in place.
    Returns a list of normalised job dicts (same shape as /jobs/search).
    Raises HTTPException on credential/network errors.
    Credentials are never included in the returned data.
    """
    app_id  = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        raise HTTPException(
            status_code=503,
            detail="Job search is unavailable. ADZUNA_APP_ID and ADZUNA_APP_KEY "
                   "must be set in backend/.env.",
        )

    params = urllib.parse.urlencode({
        "app_id":           app_id,
        "app_key":          app_key,
        "what":             query.strip(),
        "where":            location.strip(),
        "results_per_page": _ADZUNA_RESULTS_PER_PAGE,
        "content-type":     "application/json",
    })
    url = f"{_ADZUNA_BASE}/{page}?{params}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail=f"Adzuna API error {e.code}: {body[:200]}",
        )
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Adzuna API: {str(e.reason)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Adzuna search failed: {str(e)}",
        )

    jobs = []
    for job in raw.get("results", []):
        jobs.append({
            "id":          job.get("id", ""),
            "title":       job.get("title", ""),
            "company":     job.get("company", {}).get("display_name", "Not specified"),
            "location":    job.get("location", {}).get("display_name", location),
            "description": job.get("description", ""),
            "salary_min":  job.get("salary_min"),
            "salary_max":  job.get("salary_max"),
            "created":     job.get("created", ""),
            "redirect_url": job.get("redirect_url", ""),
        })
    return jobs


def _filter_and_select_jobs(raw_jobs: list, max_jobs: int = MAX_MATCH_JOBS,
                             experience_level: str = "") -> list:
    """
    Deduplicate by Adzuna job ID, apply senior-role filtering, prefer recent
    jobs, and return at most max_jobs entries.

    Filtering strategy depends on experience_level:
    - 'fresher': AGGRESSIVE — remove any job whose title contains senior/lead/
      principal keywords. Also penalise jobs whose description requires 3+ years.
    - 'junior': MODERATE — remove jobs whose title has senior keywords AND
      description mentions 3+ years experience.
    - 'mid'/'senior'/other: CONSERVATIVE — only remove if BOTH title has senior
      keyword AND description mentions 5+ years (original soft filter).
    """
    is_fresher = experience_level == "fresher"
    is_junior  = experience_level == "junior"

    seen_ids: set = set()
    unique: list  = []

    for job in raw_jobs:
        job_id = str(job.get("id", ""))
        if not job_id or job_id in seen_ids:
            continue
        seen_ids.add(job_id)
        unique.append(job)

    def _title_is_senior(job: dict) -> bool:
        """Check if the job TITLE contains senior-level keywords."""
        title = (job.get("title") or "").lower()
        return any(kw in title for kw in _SENIOR_TITLE_KEYWORDS)

    def _desc_requires_experience(job: dict, min_years: int = 5) -> bool:
        """Check if the description requires N+ years of experience."""
        desc = (job.get("description") or "").lower()
        import re as _re
        # Match patterns like '3+ years', '5+ years', '3 years experience'
        years_matches = _re.findall(r'(\d+)\+?\s*years?', desc)
        for y in years_matches:
            if int(y) >= min_years:
                return True
        # Also check word-based year requirements
        word_years = {
            "three": 3, "four": 4, "five": 5, "six": 6,
            "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        }
        for word, num in word_years.items():
            if num >= min_years and f"{word} years" in desc:
                return True
        return False

    if is_fresher:
        # AGGRESSIVE: remove any job with senior title OR description requiring 3+ years
        filtered = [
            j for j in unique
            if not _title_is_senior(j) and not _desc_requires_experience(j, min_years=3)
        ]
    elif is_junior:
        # MODERATE: remove jobs with senior title AND (description requiring 3+ years OR title is very senior)
        very_senior_titles = {"principal", "director", "vp", "vice president", "architect", "staff", "head of"}
        def _is_very_senior_title(job):
            title = (job.get("title") or "").lower()
            return any(kw in title for kw in very_senior_titles)
        filtered = [
            j for j in unique
            if not _is_very_senior_title(j)
            and not (_title_is_senior(j) and _desc_requires_experience(j, min_years=3))
        ]
    else:
        # CONSERVATIVE: original soft filter — both title senior AND desc 5+ years
        filtered = [
            j for j in unique
            if not (_title_is_senior(j) and _desc_requires_experience(j, min_years=5))
        ]

    # If filtering removed everything, fall back to the full deduplicated list
    if not filtered:
        filtered = unique

    # Prefer recent jobs — sort by 'created' descending (ISO 8601 string sort is correct)
    filtered.sort(key=lambda j: j.get("created", ""), reverse=True)

    return filtered[:max_jobs]


# ── Deterministic role/query extraction — no Groq call needed ────────────────
# Maps technology/skill keywords found in raw resume text to generic job role
# search queries that work well with Adzuna's keyword search.
# Ordered by specificity: more specific patterns are checked first.
_ROLE_PATTERNS: list[tuple[list[str], str]] = [
    # Mobile
    (["flutter", "dart"],                             "Flutter Developer"),
    (["kotlin", "android studio"],                    "Android Developer"),
    (["swift", "xcode"],                              "iOS Developer"),
    (["react native"],                                "React Native Developer"),
    # Data / ML / AI
    (["tensorflow", "pytorch", "keras"],              "Machine Learning Engineer"),
    (["nlp", "natural language processing"],          "NLP Engineer"),
    (["computer vision", "opencv"],                   "Computer Vision Engineer"),
    (["scikit-learn", "sklearn", "pandas", "numpy"],  "Data Science"),
    (["power bi", "tableau", "data visuali"],         "Data Analyst"),
    # Web frontend
    (["react.js", "reactjs", "react js"],             "React Developer"),
    (["vue.js", "vuejs", "nuxt"],                     "Vue.js Developer"),
    (["angular"],                                     "Angular Developer"),
    (["next.js", "nextjs"],                           "Next.js Developer"),
    # Web backend / fullstack
    (["django", "flask", "fastapi"],                  "Python Developer"),
    (["node.js", "nodejs", "express.js"],             "Node.js Developer"),
    (["spring boot", "spring framework"],             "Java Developer"),
    (["asp.net", "c#", ".net core"],                  ".NET Developer"),
    (["golang", "go lang"],                           "Go Developer"),
    (["ruby on rails"],                               "Ruby on Rails Developer"),
    (["php", "laravel"],                              "PHP Developer"),
    (["mern", "mean"],                                "Full Stack Developer"),
    # DevOps / Cloud
    (["kubernetes", "docker", "helm"],                "DevOps Engineer"),
    (["terraform", "ansible"],                        "Infrastructure Engineer"),
    (["aws", "amazon web services"],                  "AWS Cloud Engineer"),
    (["azure"],                                       "Azure Cloud Engineer"),
    (["gcp", "google cloud"],                         "GCP Cloud Engineer"),
    # Cybersecurity
    (["penetration testing", "pentest", "burp suite"], "Cybersecurity Engineer"),
    (["ethical hacking", "ceh", "comptia security"],  "Cybersecurity Analyst"),
    # General / fallback
    (["python"],                                      "Python Developer"),
    (["java"],                                        "Java Developer"),
    (["javascript", "typescript"],                    "JavaScript Developer"),
    (["c++"],                                         "C++ Developer"),
    (["sql", "mysql", "postgresql"],                  "Software Engineer"),
]


def _extract_search_queries_from_resume(resume_text: str, max_queries: int = 3,
                                         experience_level: str = "") -> list[str]:
    """
    Deterministic Python-only role inference from raw resume text.
    Scans the lowercased resume for technology/skill keywords and maps them
    to Adzuna-friendly job role search strings.
    No Groq call. No external calls. Never invents information.
    Returns up to max_queries unique role strings.

    When experience_level is 'fresher' or 'junior', generates BOTH:
    - Entry-level prefixed queries (e.g. "Junior Python Developer")
    - Plain queries (e.g. "Python Developer")
    This maximises the chance of finding fresher-appropriate jobs on Adzuna.
    """
    text_lower = resume_text.lower()
    found: list[str] = []
    for keywords, role in _ROLE_PATTERNS:
        if any(kw in text_lower for kw in keywords):
            if role not in found:
                found.append(role)
        if len(found) >= max_queries:
            break

    # Add experience-level prefixes for fresher/junior candidates
    is_entry_level = experience_level in ("fresher", "junior")
    if is_entry_level and found:
        prefixed: list[str] = []
        for role in found:
            # Generate multiple entry-level query variants
            prefixed.append(f"Junior {role}")
            prefixed.append(f"Entry Level {role}")
            if experience_level == "fresher":
                prefixed.append(f"{role} Fresher")
        # Put prefixed queries first (higher priority), then plain queries as fallback
        # Deduplicate while preserving order
        all_queries = prefixed + found
        seen = set()
        unique_queries = []
        for q in all_queries:
            if q not in seen:
                seen.add(q)
                unique_queries.append(q)
        return unique_queries[:max_queries * 3]  # Allow more queries for entry-level

    return found


def _build_combined_recommend_prompt(resume_text: str, jobs: list) -> str:
    """
    Single Groq prompt for /jobs/recommend.
    Asks for TWO top-level keys in one JSON response:
      - "candidate_profile" : structured candidate summary derived from the resume
      - "matched_jobs"      : ranked job-match results (same schema as /jobs/match-real)

    redirect_url is excluded from the job listings sent to the AI.
    The backend restores exact URLs from the original Adzuna data.
    """
    jobs_block = ""
    for idx, job in enumerate(jobs, start=1):
        desc = (job.get("description") or "").strip()
        desc_snippet = desc[:MAX_DESC_CHARS] + ("..." if len(desc) > MAX_DESC_CHARS else "")
        jobs_block += (
            f"JOB {idx}:\n"
            f"  job_id: {job.get('id', '')}\n"
            f"  title: {job.get('title', '')}\n"
            f"  company: {job.get('company', '')}\n"
            f"  location: {job.get('location', '')}\n"
            f"  description: {desc_snippet}\n\n"
        )

    return f"""You are a precise AI career assistant and evidence-based job-matching engine.

You will be given a resume and a list of real job postings.
Return ONE JSON object with exactly two top-level keys: "candidate_profile" and "matched_jobs".

RESUME:
\"\"\"
{resume_text}
\"\"\"

REAL JOB LISTINGS:
{jobs_block}

════════════════════════════════════════════
PART 1 — CANDIDATE PROFILE EXTRACTION
════════════════════════════════════════════

Extract ONLY information explicitly stated in the resume. Do NOT infer or invent.

- "name": full name as written, or "Not specified".
- "programming_languages": only languages explicitly listed.
- "frameworks_and_tools": only frameworks/libraries/tools explicitly named.
- "skills": only general/soft skills explicitly stated.
- "experience": only internships or jobs explicitly described (empty array if none).
- "target_roles": 2-4 realistic job role titles genuinely supported by resume evidence.
- "education": degree, branch, institution, year — copy exactly from resume.

════════════════════════════════════════════
PART 2 — JOB MATCHING RULES
════════════════════════════════════════════

For EACH job, independently scan the ENTIRE resume from scratch.
Do not reuse evidence from a previous job's analysis.
Do not focus only on the first relevant project you find.

────────────────────────────────────────────
RULE 1 — SEMANTIC SKILL EQUIVALENCE
────────────────────────────────────────────
Do NOT mark a skill as missing merely because the resume uses different wording.
Accept these equivalences ONLY when the resume genuinely supports them:
  backend development = back-end = server-side = Flask/Django/FastAPI project described
  frontend development = front-end = React/Vue/Angular work described
  REST API = RESTful API
  Git = GitHub = version control
  relational database = MySQL = PostgreSQL = SQL database work
  machine learning = ML
  full-stack = demonstrated both frontend AND backend in the same context (see Rule 2A)
Apply an equivalence ONLY when the evidence genuinely supports it.
Do NOT invent equivalences to inflate the score.

TECHNOLOGY-TO-CAPABILITY EQUIVALENCES (accept when resume genuinely demonstrates):
  LangChain + any named LLM (Gemma, GPT, LLaMA, Claude, Mistral, etc.) in a project/internship
    = GenAI / LLM-related experience
    = "Large Language Models" or "LLM" is MATCHED, NOT missing
    = "LLM experience" or "LLMs experience" is MATCHED, NOT missing

  GenAI internship or "(GenAI)" role or "Generative AI" work
    = GenAI / LLM-related experience
    = "Large Language Models" or "LLM" is MATCHED, NOT missing

  Flask or Django or FastAPI project with endpoints
    = Python backend / web framework / API development

  TensorFlow or PyTorch used in a project
    = deep learning / ML framework experience

  Scikit-learn, K-Means, model training in a project
    = machine learning experience

  React/TypeScript/Angular/Vue used in a project
    = frontend development experience

  SQLite/MySQL/MongoDB/PostgreSQL queries or usage
    = database experience

  Docker/Kubernetes in projects
    = containerization / DevOps experience

CRITICAL — If the resume has LangChain + Gemma 3 + GenAI internship, then:
  "Large Language Models (LLMs) experience" is MATCHED — do NOT list it as missing.

DO NOT falsely equate:
  ✗ Flask = FastAPI or Django
  ✗ React = Angular or Vue
  ✗ Python = Django
  ✗ LangChain alone (without named LLM) = LLM experience
  ✗ Pandas in skills = Data Analysis capability

────────────────────────────────────────────
RULE 2A — FULL-STACK EVIDENCE (precision rule)
────────────────────────────────────────────
"Full-stack development" is a MATCHED capability when the resume shows BOTH frontend
and backend work in the same project, role, or clearly connected context.

Sufficient evidence — any of these patterns is enough:
  ✓ A project description combining a React/Angular/Vue frontend with a Python/Node/Java backend
  ✓ "full-stack compliance automation platform integrating React/TypeScript frontend with backend APIs"
  ✓ "Built a web application with React frontend and Flask/Django/FastAPI backend"
  ✓ Any sentence describing frontend + backend integration in ONE project or role
  ✓ A project explicitly called a "full-stack application", "full-stack platform", etc.

"Full-stack" is NOT matched when:
  ✗ React and Python appear only in separate skills lists, with no connecting project description
  ✗ Two completely independent projects each cover only one side

IMPORTANT: Do NOT require the resume to literally say "full-stack developer".
A project description like "compliance automation platform integrating a React/TypeScript
frontend with backend APIs" IS sufficient evidence for full-stack development.

When full-stack IS matched, the evidence entry must quote or paraphrase the specific
project/role description that shows the frontend+backend combination.

────────────────────────────────────────────
RULE 2B — DATA ANALYSIS vs PANDAS (precision rule)
────────────────────────────────────────────
Do NOT automatically equate "Pandas listed in skills" with "Data Analysis experience".
"Data Analysis" is a MATCHED skill only when the resume shows actual analysis work, such as:
  ✓ Analyzing/exploring datasets
  ✓ Data cleaning or preprocessing
  ✓ Exploratory data analysis (EDA)
  ✓ Statistical analysis
  ✓ Feature/data analysis for a model
  ✓ Data visualization or reporting insights from data

If the resume only lists Pandas as a tool without demonstrated analysis work, it is
correct to keep "Data Analysis" in missing_skills IF AND ONLY IF the job actually
requires Data Analysis. If the job does not require it, do not add it regardless.

────────────────────────────────────────────
RULE 2C — DATABASE EVIDENCE (precision rule)
────────────────────────────────────────────
Treat database capability as MATCHED when the resume explicitly demonstrates relevant
database work. Sufficient evidence includes ANY of:
  ✓ SQLite / SQLite3 queries or optimization
  ✓ MySQL, PostgreSQL, MongoDB, or any named database
  ✓ CRUD operations
  ✓ Database design or schema creation
  ✓ Data retrieval, indexing, or query optimization
  ✓ ORM usage (SQLAlchemy, Django ORM, Mongoose, etc.)

Do NOT require the exact phrase "database management".
For example: "Optimized SQLite3 database queries for efficient data retrieval and reduced
response latency" IS sufficient evidence for database capability.
Do NOT put "database management" or "database experience" in missing_skills when such
explicit evidence exists in the resume.

────────────────────────────────────────────
RULE 2D — FRONTEND EVIDENCE (precision rule)
────────────────────────────────────────────
Treat frontend development as MATCHED when the resume explicitly contains:
  ✓ React, Angular, or Vue (listed in skills or used in a project)
  ✓ TypeScript or JavaScript used in a frontend context
  ✓ HTML/CSS/JavaScript frontend development
  ✓ Any project describing a frontend application, UI, or frontend/backend integration

Do NOT put "frontend development" in missing_skills when the resume contains React,
TypeScript, Angular, or Vue with any project context.

────────────────────────────────────────────
RULE 3 — SKILL vs EXPERIENCE LEVEL (STRICTLY separate — this is critical)
────────────────────────────────────────────
Technical skills and seniority/experience requirements are COMPLETELY DIFFERENT things.
NEVER mix them.

Example: job requires "5+ years Python" and resume shows Python in projects/internship.
  → Python IS a matched skill (candidate has the capability).
  → "5+ years" is NOT satisfied → reflect in experience_match ("Partial") and match_summary.
  → Do NOT put "Python", "backend development", or "full-stack" in missing_skills
    just because the candidate lacks seniority or years.

missing_skills MUST ONLY contain missing technical/domain CAPABILITIES.
Experience/seniority gaps belong EXCLUSIVELY in experience_match and match_summary.

────────────────────────────────────────────
RULE 4 — USE THE WHOLE RESUME
────────────────────────────────────────────
Consider ALL resume sections when matching each job:
  programming_languages, frameworks_and_tools, skills, experience, projects, certifications.
Do not base the match primarily on one project or one section.

────────────────────────────────────────────
RULE 5 — MATCHED-SKILL EVIDENCE IS MANDATORY
────────────────────────────────────────────
For EVERY item in matched_skills, the evidence array MUST contain direct resume
evidence that genuinely supports that exact capability.

Do NOT mark a skill as matched merely because:
  ✗ The technology appears in the frameworks/tools or skills list (tool mention ≠ capability)
  ✗ The skill is commonly associated with another demonstrated skill
  ✗ The model believes the candidate probably has the capability

What DOES constitute valid evidence:
  ✓ Python in programming_languages → supports "Python" as a matched skill
  ✓ "Developed a Flask backend" in a project → supports "backend development"
  ✓ "Optimized SQLite3 queries" in a project → supports "database" capability
  ✓ "Built React/TypeScript frontend + Flask backend" in one project → supports both
     "frontend development" and "full-stack development"
  ✓ "Analysed datasets using Pandas" in a project/role → supports "Data Analysis"

What does NOT constitute valid evidence:
  ✗ Pandas listed in skills/tools only → does NOT prove "Data Analysis"
  ✗ React listed in frameworks/tools only → does NOT prove "frontend development"
     unless a project explicitly uses it in a frontend context
  ✗ "Python Developer" in target_roles → does NOT prove any specific Python capability

If you cannot find direct evidence for a matched skill anywhere in the resume, REMOVE
that skill from matched_skills.

For PREFERRED skills (Tier 2 — Rule 10):
  ✓ May appear in matched_skills ONLY if the resume contains direct supporting evidence.
  ✗ Must NOT appear in missing_skills regardless of resume evidence.
  ✓ May be mentioned in match_summary.

evidence field: provide 1-3 short direct paraphrases from the resume. Each evidence
entry must correspond to at least one item in matched_skills.

────────────────────────────────────────────
RULE 6 — MISSING SKILLS
────────────────────────────────────────────
For EACH candidate missing skill, you must answer YES to ALL of the following before
adding it. If any answer is NO, do NOT add the skill to missing_skills.

  1. Does THIS specific job description explicitly require or clearly expect this capability?
     (Do not infer from job title alone. Find the exact sentence or requirement.)
  2. Did I scan ALL resume sections: summary, skills, languages, projects, experience,
     tools, databases, and certifications?
  3. Did I find zero explicit evidence for this capability across the entire resume?
  4. Is this a technical/domain CAPABILITY — not seniority, years, or soft skills?
  5. Is this NOT covered by a semantic equivalence (Rules 1, 2A, 2C, 2D)?
     (e.g., SQLite3 queries = database capability; React project = frontend capability)
  6. Is this NOT a responsibility or duty from the job description that does not
     represent a distinct learnable technical skill?
  7. Would a reasonable recruiter consider this a genuine skill gap for this specific role?

COMPLETELY FORBIDDEN in missing_skills (never include regardless of job):
  ✗ "senior-level experience"
  ✗ "years of experience" (any form: 3+ years, 5+ years, etc.)
  ✗ "professional experience"
  ✗ "seniority"
  ✗ "junior/mid/senior level"
  ✗ "experience duration"
  ✗ Any phrasing referring to how long someone has worked
  ✗ Communication skills, teamwork, or generic soft skills
  ✗ Inferred requirements not stated in the job description

These belong in experience_match and match_summary only.

────────────────────────────────────────────
RULE 7 — MATCH SCORE (evidence-based, not title-based)
────────────────────────────────────────────
90–100: Excellent technical alignment; experience requirements reasonably met.
75–89:  Strong technical alignment; minor gaps or experience-level limitations.
60–74:  Moderate alignment; several meaningful technical gaps.
40–59:  Limited alignment; significant technical gaps.
<40:    Poor alignment; fundamental skill mismatch.
Do NOT lower the score merely because the candidate has fewer years of experience
if technical skill alignment is strong. Reflect the experience gap in experience_match.

────────────────────────────────────────────
RULE 8 — EXPERIENCE_MATCH (use EXACTLY one value)
────────────────────────────────────────────
"Strong"  = Technical requirements are strongly demonstrated AND the experience/seniority
             requirement is also reasonably satisfied by the resume evidence.

"Partial" = Technical alignment is strong or reasonable, BUT professional experience,
             years, or seniority is meaningfully below the job requirement.
             USE THIS for a junior/fresher candidate with strong technical skills
             applying to a mid or senior role.

"Weak"    = There is a SIGNIFICANT TECHNICAL mismatch (not merely a seniority gap).
             Do NOT use "Weak" just because the candidate is junior.
             A junior candidate with good technical alignment = "Partial", not "Weak".

"Unknown" = The job description is too vague to reliably assess experience requirements.
             Do NOT use "Unknown" merely because the candidate is junior.

────────────────────────────────────────────
RULE 9 — MATCH_SUMMARY (2 sentences max)
────────────────────────────────────────────
Accurately distinguish: technical capabilities the candidate has, technical gaps, and
experience/seniority gaps.
  BAD: "Candidate lacks full-stack development." (wrong when resume shows React+Flask project)
  GOOD: "Candidate demonstrates Python, Flask backend, and full-stack development capabilities,
         but has less professional experience than the senior-level requirement."
Only write "meets all requirements" if the resume genuinely supports all important requirements.

────────────────────────────────────────────
RULE 10 — REQUIRED vs PREFERRED vs OPTIONAL REQUIREMENTS
────────────────────────────────────────────
Before adding ANY item to missing_skills, determine how the job description
classifies that requirement. Apply the correct tier:

TIER 1 — REQUIRED (may appear in missing_skills if absent from resume)
The JD uses language such as:
  "Required Skills", "Required Qualifications", "Must have", "Mandatory",
  "Strong knowledge of", "Proficiency in", "Essential",
  "Experience with X" when clearly listed under required/core skills.

TIER 2 — PREFERRED / NICE-TO-HAVE (do NOT put in missing_skills)
The JD uses language such as:
  "Preferred", "Nice to have", "Preferred qualifications", "Desirable",
  "Preferred experience", "Good to have", "Advantageous".
If genuinely useful context, you may mention it in match_summary only.

TIER 3 — OPTIONAL / ADDED ADVANTAGE (NEVER put in missing_skills)
The JD uses language such as:
  "added advantage", "not mandatory", "optional", "bonus", "a plus",
  "familiarity is a plus", "exposure is a plus", "would be a bonus".

Concrete example:
  JD says: "Familiarity with Rust API ecosystem is an added advantage, though not mandatory."
  Candidate has no Rust evidence.
  CORRECT: missing_skills does NOT include Rust. It may appear in match_summary.
  WRONG:   missing_skills: ["Rust API experience"]

TIER 4 — EXPERIENCE / SENIORITY (NEVER put in missing_skills)
  years of experience, 3+ years, 5+ years, senior-level, leadership experience.
  These belong in experience_match and match_summary only.

IMPORTANT: If you cannot classify a JD requirement into Tier 1 (clearly required),
default to NOT adding it to missing_skills.

────────────────────────────────────────────
RULE 11 — RESPONSE FORMAT
────────────────────────────────────────────
- Do NOT include redirect_url — the server populates it.
- Do NOT modify job_id, company, title, or location values.
- Sort matched_jobs by match_score descending.

────────────────────────────────────────────
RULE 12 — FINAL CONSISTENCY CHECK (apply before outputting each job)
────────────────────────────────────────────
Before writing each matched_jobs entry, verify ALL of the following:
  A. Every matched_skill has direct resume evidence that genuinely supports it.
  B. Every missing_skill is a genuine technical/domain capability gap — not a seniority gap.
  C. NOTHING in missing_skills relates to seniority, years of experience, or professional
     experience duration. If you find any, REMOVE it and reflect it in experience_match instead.
  D. Full-stack development is recognized in matched_skills whenever the resume contains
     explicit connected frontend + backend project evidence (project description combining both).
  E. experience_match reflects seniority/experience gaps: junior + strong tech = "Partial" not "Weak".
  F. Evidence entries directly support their corresponding matched_skills.
  G. The entire resume (all sections) was scanned for this specific job.
  H. Frontend development is NOT in missing_skills when the resume contains React, TypeScript,
     Angular, or Vue with any project context.
  I. Database capability is NOT in missing_skills when the resume contains any explicit
     database work (SQLite, MySQL, MongoDB, CRUD, query optimization, ORM usage, etc.).
  J. Every missing_skill has a clear, specific requirement in THIS job's description.
     If you cannot quote the job-description sentence that requires it, REMOVE it.
  K. No preferred/nice-to-have/optional/added-advantage skill appears in missing_skills.
     If the JD classifies a skill as Tier 2 or Tier 3 (Rule 10), REMOVE it from missing_skills.
     It may appear in match_summary only.
  L. The entire job description was read to classify each requirement as
     Required / Preferred / Optional before finalising missing_skills.
  M. Every matched_skills item has direct supporting evidence in the resume.
     If a skill is listed in matched_skills but no evidence sentence supports it, REMOVE
     the skill from matched_skills. A tool/library mention alone is not evidence.
  N. Pandas in skills/tools alone does NOT prove Data Analysis. React in skills/tools
     alone does NOT prove frontend development. Only project/experience descriptions
     that demonstrate the actual activity constitute valid evidence.
  O. Job-title bias check: the job title (e.g. "Python Developer") must NOT restrict
     which resume evidence is considered. If the JD body requires frontend, backend, or
     full-stack capabilities, apply the same full-resume scan that would be applied to
     any other role. Resume evidence that supports those requirements must be recognised.
  P. Skill-name fidelity: when a matched skill directly corresponds to wording used in
     the JD, output the JD's terminology. For example, if the JD says
     "database management", output "database management", not "database".
  Q. FRONTEND EVIDENCE OVERRIDE: If the resume contains any project or role description
     that shows a frontend technology (React, Angular, Vue, TypeScript, JavaScript, etc.)
     integrated with backend APIs or backend logic in the SAME project context, then
     "frontend development" is a PRESENT capability.
     When the JD requires "front-end technologies", "frontend development", "frontend
     experience", "full-stack", or equivalent wording, DO NOT place "frontend development"
     in missing_skills.
     Example: "Built a full-stack compliance automation platform integrating a
     React/TypeScript frontend with backend APIs" IS sufficient evidence for both
     frontend development and full-stack development.
  R. DATABASE TERMINOLOGY: If the JD uses the phrase "database management" and the resume
     demonstrates explicit database work (SQLite/MySQL/PostgreSQL/MongoDB queries, CRUD
     operations, schema design, ORM usage, or query optimisation), output the matched skill
     as "database management" to preserve JD terminology, not as "database" alone.

Correct any inconsistencies before outputting.

────────────────────────────────────────────
RULE 13 — JOB-INDEPENDENT RESUME SCAN AND SKILL-NAME FIDELITY
────────────────────────────────────────────
PART A — JOB-SPECIFIC REQUIREMENTS MUST NOT SUPPRESS EXISTING EVIDENCE

For EVERY job, scan the ENTIRE resume independently. Do not allow the job title to
restrict which resume evidence you consider.

Specifically:
  ✓ If the JD requires both front-end and back-end technology experience, and the
    resume contains explicit connected project evidence such as:
    "Built a full-stack compliance automation platform integrating a React/TypeScript
    frontend with backend APIs"
    then recognize ALL of: frontend development, backend development, and full-stack
    development as matched skills — regardless of whether the job title is
    "Python Developer", "Full Stack Developer", or anything else.
  ✓ The job BODY requirements (what the JD text actually asks for) determine which
    skills are relevant, not the job title.

PART B — SKILL-NAME FIDELITY

When a matched skill directly corresponds to wording used in THIS job's description,
preserve the JD's exact terminology in matched_skills.

Examples:
  JD says "database management" → output "database management", not "database"
  JD says "front-end development" → output "front-end development", not "frontend"
  JD says "RESTful API development" → output "RESTful API development", not "REST API"

Do not invent JD terminology. Only apply this where the JD actually uses that phrase.

════════════════════════════════════════════
Return ONLY this JSON (no markdown, no extra text):
{{
  "candidate_profile": {{
    "name": "<full name or Not specified>",
    "programming_languages": ["<languages>"],
    "frameworks_and_tools": ["<tools>"],
    "skills": ["<soft/general skills>"],
    "experience": ["<internship/job entries>"],
    "target_roles": ["<2-4 role titles>"],
    "education": ["<degree, branch, institution, year>"]
  }},
  "matched_jobs": [
    {{
      "job_id": "<exact job_id>",
      "title": "<exact title>",
      "company": "<exact company>",
      "location": "<exact location>",
      "match_score": <integer 0-100>,
      "matched_skills": ["<skill supported by direct resume evidence>"],
      "missing_skills": ["<technical skill required by job AND genuinely absent from resume>"],
      "experience_match": "<Strong | Partial | Weak | Unknown>",
      "evidence": ["<direct resume reference that supports the matched skill>"],
      "match_summary": "<1-2 sentences: technical alignment + experience/seniority alignment>"
    }}
  ]
}}"""


@app.post("/jobs/recommend")
async def recommend_jobs(
    file: UploadFile = File(...),
    target_role: str = Form(""),
    location: str    = Form("Bangalore"),
):
    """
    Automatic Resume → Adzuna → AI matching pipeline.

    multipart/form-data fields:
      - file        : resume PDF (required)
      - target_role : preferred job role (optional — inferred from resume if omitted)
      - location    : city/region for Adzuna search (optional, default 'Bangalore')

    Pipeline (1 Groq call total):
      1. Extract resume text  [no AI]
      2. Derive search queries via deterministic Python  [no AI]
      3. 2 Adzuna searches (target_role given) / 3 (inferred)  [no AI]
      4. Deduplicate + soft-filter → max 5 jobs  [no AI]
      5. ONE Groq call → candidate_profile + matched_jobs
    """

    # ── 1. Validate and read PDF ───────────────────────────────────────────────
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    # ── 2. Extract resume text (shared helper — no AI) ─────────────────────────
    resume_text, _pages = _extract_pdf_text(contents)

    # ── 2.5. Detect experience level (deterministic — no AI) ──────────────────
    experience_level = _detect_experience_level(resume_text)

    # ── 3. Determine Adzuna search queries — purely deterministic, NO Groq ─────
    search_queries: list[str] = []

    if target_role.strip():
        # When the caller provides an explicit role, use it exactly as-is.
        # Also add an entry-level variant if the candidate is a fresher.
        search_queries.append(target_role.strip())
        if experience_level in ("fresher", "junior"):
            search_queries.append(f"Junior {target_role.strip()}")
            search_queries.append(f"Entry Level {target_role.strip()}")
    else:
        # No explicit role → deterministic keyword scan of resume text, max 3
        search_queries = _extract_search_queries_from_resume(resume_text, max_queries=3,
                                                              experience_level=experience_level)

    if not search_queries:
        return {
            "filename":          file.filename,
            "location":          location,
            "target_role":       None,
            "candidate_profile": {},
            "jobs_found":        0,
            "matched_jobs":      [],
            "message":           "Could not determine suitable job roles from the resume. "
                                 "Please provide a target_role parameter.",
        }

    # ── 4. Adzuna searches (internal helper — no HTTP self-call, no AI) ────────
    all_raw_jobs: list  = []
    adzuna_errors: list = []  # (query, error_summary) tuples

    for query in search_queries:
        try:
            results = _search_adzuna_jobs(query, location)
            all_raw_jobs.extend(results)
        except HTTPException as he:
            # Adzuna returned an HTTP error (4xx/5xx) — log and continue
            adzuna_errors.append(f"[{query!r}] {he.detail}")
        except Exception as exc:
            # Network-level error (timeout, DNS, SSL, etc.) — log and continue
            adzuna_errors.append(f"[{query!r}] Network error: {str(exc)[:120]}")

    # Only fail hard when EVERY query failed and we have nothing to show
    if not all_raw_jobs:
        error_summary = " | ".join(adzuna_errors) if adzuna_errors else "No results returned."
        raise HTTPException(
            status_code=502,
            detail=f"All Adzuna searches failed: {error_summary}",
        )

    # Record how many queries succeeded for the debug block later
    queries_succeeded = len(search_queries) - len(adzuna_errors)

    # ── 5. Deduplicate, filter, select max 5 (no AI) ──────────────────────────
    jobs_to_match = _filter_and_select_jobs(all_raw_jobs, max_jobs=MAX_MATCH_JOBS,
                                             experience_level=experience_level)

    if not jobs_to_match:
        return {
            "filename":          file.filename,
            "location":          location,
            "target_role":       target_role or None,
            "candidate_profile": {},
            "jobs_found":        0,
            "matched_jobs":      [],
            "message":           "No suitable jobs found on Adzuna for the searched roles. "
                                 "Try a different role or location.",
        }

    # Snapshot real Adzuna data before handing anything to AI
    original_url_map: dict = {
        str(j.get("id", "")): j.get("redirect_url", "")
        for j in jobs_to_match
    }
    original_meta_map: dict = {
        str(j.get("id", "")): {
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "created":    j.get("created", ""),
        }
        for j in jobs_to_match
    }

    # ── 6. ONE Groq call — profile + job matching combined ─────────────────────
    try:
        prompt    = _build_combined_recommend_prompt(resume_text, jobs_to_match)
        ai_text   = call_ai(prompt, max_tokens=2048)
        ai_result = clean_json_response(ai_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned an invalid response. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

    # ── 7. Extract candidate_profile from AI response ──────────────────────────
    cp = ai_result.get("candidate_profile", {})
    if not isinstance(cp, dict):
        cp = {}

    response_profile = {
        "name":                  cp.get("name", "Not specified"),
        "skills":                cp.get("skills", []),
        "programming_languages": cp.get("programming_languages", []),
        "frameworks_and_tools":  cp.get("frameworks_and_tools", []),
        "experience":            cp.get("experience", []),
        "target_roles":          cp.get("target_roles", []),
        "experience_level":      experience_level,
    }

    # ── 8. Sanitise matched_jobs + restore original Adzuna URLs ───────────────
    raw_matched = ai_result.get("matched_jobs", [])
    if not isinstance(raw_matched, list):
        raw_matched = []

    sanitised: list = []
    for item in raw_matched:
        if not isinstance(item, dict):
            continue

        job_id = str(item.get("job_id", ""))
        meta   = original_meta_map.get(job_id, {})

        # Always restore the original Adzuna redirect_url — AI never touches it
        redirect_url = _strip_markdown_url(
            original_url_map.get(job_id, item.get("redirect_url", ""))
        )

        sanitised.append({
            "job_id":           job_id,
            "title":            str(item.get("title", "")),
            "company":          str(item.get("company", "")),
            "location":         str(item.get("location", "")),
            "match_score":      int(item.get("match_score", 0)),
            "matched_skills":   list(item.get("matched_skills", [])),
            "missing_skills":   list(item.get("missing_skills", [])),
            "experience_match": str(item.get("experience_match", "Unknown")),
            "evidence":         list(item.get("evidence", [])),
            "match_summary":    str(item.get("match_summary", "")),
            # Real Adzuna metadata — sourced from API, NOT from the AI
            "salary_min":       meta.get("salary_min"),
            "salary_max":       meta.get("salary_max"),
            "created":          meta.get("created", ""),
            "redirect_url":     redirect_url,
        })

    sanitised.sort(key=lambda x: x["match_score"], reverse=True)
    sanitised = sanitised[:MAX_MATCH_JOBS]

    # ── 9. Return final response ───────────────────────────────────────────────
    response: dict = {
        "filename":          file.filename,
        "location":          location,
        "target_role":       target_role or None,
        "candidate_profile": response_profile,
        "jobs_found":        len(sanitised),
        "matched_jobs":      sanitised,
        # Lightweight debug — no credentials, no resume text
        "_debug": {
            "queries_attempted":  len(search_queries),
            "queries_succeeded":  queries_succeeded,
            "queries":            search_queries,
            "experience_level":   experience_level,
        },
    }
    # Surface partial Adzuna errors as a non-fatal warning
    if adzuna_errors:
        response["_debug"]["adzuna_warnings"] = adzuna_errors
    return response


# ============================================================
#  FEATURE 1 — ENHANCED RESUME EXTRACTION  — POST /resume/extract
#
#  Deep extraction of candidate profile from resume PDF.
#  Returns structured: name, location, education, skills,
#  projects, experience, certifications, target roles, etc.
#  Uses one Groq call. No hallucination.
# ============================================================

def _build_enhanced_resume_prompt(resume_text: str) -> str:
    return f"""You are a precise resume analysis AI. Extract ALL relevant information from the resume below.

RESUME:
\"\"\"
{resume_text}
\"\"\"

STRICT EXTRACTION RULES:
1. ONLY include information EXPLICITLY written in the resume.
2. Do NOT infer, assume, or invent any skill, tool, or experience.
3. If a field has no evidence, use an empty array [] or "Not specified".
4. Certifications must only include items the resume explicitly labels as certificates/courses.
5. For target_roles, infer 3-5 realistic job role titles based ONLY on demonstrated skills and experience.

Return ONLY this JSON (no markdown, no extra text):
{{
  "name": "<full name or Not specified>",
  "location": "<city/state/country or Not specified>",
  "email": "<email or Not specified>",
  "phone": "<phone or Not specified>",
  "education": [
    {{
      "degree": "<e.g. B.Tech>",
      "branch": "<e.g. Computer Science>",
      "institution": "<university/college name>",
      "year": "<graduation year or expected>",
      "gpa": "<GPA/CGPA or Not specified>"
    }}
  ],
  "programming_languages": ["<only languages explicitly listed>"],
  "frameworks": ["<only frameworks explicitly listed>"],
  "libraries": ["<only libraries explicitly listed>"],
  "databases": ["<only databases explicitly listed>"],
  "cloud_devops": ["<only cloud/DevOps tools explicitly listed>"],
  "technical_skills": ["<only technical skills explicitly stated>"],
  "soft_skills": ["<only soft skills explicitly stated>"],
  "projects": [
    {{
      "name": "<project name>",
      "description": "<1-2 line description using only resume details>",
      "technologies": ["<technologies used>"]
    }}
  ],
  "work_experience": [
    {{
      "role": "<job/internship title>",
      "company": "<company name>",
      "duration": "<time period>",
      "description": "<key responsibilities/achievements>"
    }}
  ],
  "certifications": ["<certification name - issuer>"],
  "achievements": ["<awards, hackathons, competitive programming, etc.>"],
  "target_roles": ["<3-5 realistic job role titles supported by resume evidence>"],
  "experience_level": "<Entry Level | Junior | Mid Level | Senior>",
  "years_of_experience": "<0 if fresher, otherwise approximate years>"
}}"""


@app.post("/resume/extract")
async def extract_resume_profile(file: UploadFile = File(...)):
    """
    Enhanced resume extraction — returns a deeply structured candidate profile.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    resume_text, page_count = _extract_pdf_text(contents)

    try:
        prompt = _build_enhanced_resume_prompt(resume_text)
        ai_text = call_ai(prompt, max_tokens=3000)
        profile = clean_json_response(ai_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid response. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume extraction failed: {str(e)}")

    return {
        "filename": file.filename,
        "pages": page_count,
        "profile": profile,
        "resume_text": resume_text
    }


# ============================================================
#  FEATURE 2 — INTELLIGENT MULTI-QUERY JOB SEARCH
#  POST /jobs/smart-search
#
#  Uses AI to generate diverse search queries from the resume
#  profile, then searches Adzuna with multiple queries.
#  Returns aggregated, deduplicated results.
# ============================================================

def _build_search_queries_prompt(profile: dict, experience_level: str = "") -> str:
    """Generate diverse job search queries from candidate profile."""

    # Build experience-level-specific instructions
    is_entry_level = experience_level in ("fresher", "junior")
    level_instructions = ""
    if is_entry_level:
        level_instructions = """
CRITICAL — ENTRY-LEVEL/JUNIOR CANDIDATE:
This candidate is a fresher/junior. You MUST generate entry-level-appropriate queries.

For EVERY target role, generate these variants:
  1. "Junior {Role}"      e.g. "Junior Python Developer"
  2. "Entry Level {Role}" e.g. "Entry Level Software Engineer"
  3. "{Role} Fresher"     e.g. "Python Developer Fresher"
  4. "Associate {Role}"   e.g. "Associate Software Engineer"

Do NOT generate any of these for a fresher:
  ✗ "Senior {Role}"
  ✗ "Lead {Role}"
  ✗ "Principal {Role}"
  ✗ "Staff {Role}"
  ✗ "Architect" or "Manager" roles

At least 60% of your queries MUST include "Junior", "Entry Level", "Fresher", or "Associate" prefix.
The remaining queries may be plain role names (e.g. "Python Developer") but never senior variants.
"""
    else:
        level_instructions = """
The candidate appears to be mid-level or experienced. Include a mix of:
  - Plain role queries (e.g. "Python Developer")
  - Level-appropriate queries if the profile suggests a specific level
  - Do NOT add "Junior" or "Entry Level" prefixes unless the profile indicates that level.
"""

    return f"""You are an expert job search strategist. Given a candidate's profile, generate diverse job search queries.

CANDIDATE PROFILE:
{json.dumps(profile, indent=2)}

CANDIDATE EXPERIENCE LEVEL: {experience_level or "Unknown"}
{level_instructions}
Generate 6-8 diverse search queries that would find relevant jobs for this candidate.
Consider:
- Their target roles (use each as a separate query)
- Combinations of their key skills (e.g. "Python Backend Developer", "React Frontend Engineer")
- Their experience level — see instructions above
- Alternative role titles (e.g. "Software Engineer" for "Python Developer")
- Their specific tech stack combinations

Rules:
1. Each query should be a concise job search term (2-5 words)
2. Include role variations: "Software Engineer", "Software Developer", "SDE"
3. Include technology-specific roles: "Python Developer", "React Developer"
4. Do NOT repeat the same query
5. Keep queries Adzuna-friendly (common job title keywords)
6. NEVER include "Senior", "Lead", "Principal", "Staff", "Architect", or "Manager" in queries for entry-level candidates

Return ONLY this JSON (no markdown, no extra text):
{{
  "search_queries": ["query1", "query2", ...]
}}"""


def _smart_search_adzuna(queries: list, location: str, max_per_query: int = 5) -> tuple:
    """Search Adzuna with multiple queries. Returns (all_jobs, errors)."""
    all_jobs = []
    errors = []
    for query in queries:
        try:
            results = _search_adzuna_jobs(query, location)
            # Tag each job with the query that found it
            for job in results:
                job["_search_query"] = query
            all_jobs.extend(results)
        except HTTPException as he:
            errors.append(f"[{query}] {he.detail}")
        except Exception as exc:
            errors.append(f"[{query}] Network error: {str(exc)[:120]}")
    return all_jobs, errors


@app.post("/jobs/smart-search")
async def smart_search_jobs(
    file: UploadFile = File(...),
    location: str = Form("India"),
    target_role: str = Form(""),
):
    """
    Intelligent multi-query job search:
    1. Extract resume profile (AI)
    2. Generate diverse search queries from profile (AI)
    3. Search Adzuna with each query
    4. Deduplicate and return aggregated results
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    resume_text, page_count = _extract_pdf_text(contents)

    # Detect experience level (deterministic — no AI)
    experience_level = _detect_experience_level(resume_text)

    # Step 1: Extract profile (reuse enhanced prompt)
    try:
        profile_prompt = _build_enhanced_resume_prompt(resume_text)
        profile_text = call_ai(profile_prompt, max_tokens=3000)
        profile = clean_json_response(profile_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile extraction failed: {str(e)}")

    # Step 2: Generate search queries (AI)
    try:
        query_prompt = _build_search_queries_prompt(profile, experience_level=experience_level)
        query_text = call_ai(query_prompt, max_tokens=1024)
        query_result = clean_json_response(query_text)
        search_queries = query_result.get("search_queries", [])
    except Exception:
        # Fallback: use deterministic extraction
        search_queries = _extract_search_queries_from_resume(resume_text, max_queries=5,
                                                              experience_level=experience_level)

    # If target_role provided, add it as primary query
    if target_role.strip():
        search_queries = [target_role.strip()] + [q for q in search_queries if q.lower() != target_role.strip().lower()]
        # Add entry-level variant for freshers
        if experience_level in ("fresher", "junior"):
            junior_query = f"Junior {target_role.strip()}"
            if junior_query not in search_queries:
                search_queries.insert(1, junior_query)

    # Ensure we have queries
    if not search_queries:
        search_queries = _extract_search_queries_from_resume(resume_text, max_queries=5,
                                                              experience_level=experience_level)

    # Limit to 6 queries max to conserve API quota
    search_queries = search_queries[:6]

    # Step 3: Search Adzuna with all queries
    all_raw_jobs, adzuna_errors = _smart_search_adzuna(search_queries, location)

    if not all_raw_jobs:
        return {
            "filename": file.filename,
            "candidate_profile": profile,
            "search_queries": search_queries,
            "jobs_found": 0,
            "jobs": [],
            "message": "No jobs found for the searched queries. Try a different location.",
            "_debug": {"queries": search_queries, "errors": adzuna_errors}
        }

    # Step 4: Deduplicate
    seen_ids = set()
    unique_jobs = []
    for job in all_raw_jobs:
        job_id = str(job.get("id", ""))
        if not job_id or job_id in seen_ids:
            continue
        seen_ids.add(job_id)
        unique_jobs.append(job)

    # Apply senior filter (experience-level-aware)
    filtered = _filter_and_select_jobs(unique_jobs, max_jobs=20, experience_level=experience_level)

    # Sort by recency
    filtered.sort(key=lambda j: j.get("created", ""), reverse=True)

    profile["experience_level"] = experience_level

    return {
        "filename": file.filename,
        "candidate_profile": profile,
        "search_queries": search_queries,
        "jobs_found": len(filtered),
        "jobs": filtered,
        "_debug": {
            "queries_attempted": len(search_queries),
            "queries": search_queries,
            "experience_level": experience_level,
            "errors": adzuna_errors if adzuna_errors else None
        }
    }


# ============================================================
#  FEATURE 3 — BATCH JOB MATCHING + RANKING
#  POST /jobs/match-rank
#
#  Accepts: resume PDF + jobs JSON array
#  Returns: candidate_profile + ranked matched_jobs (up to 10)
#  Reuses the existing evidence-based matching system.
# ============================================================

MAX_RANK_JOBS = 10

@app.post("/jobs/match-rank")
async def match_and_rank_jobs(
    file: UploadFile = File(...),
    jobs: str = Form(...),
):
    """
    Match resume against jobs AND rank them.
    Same matching logic as /jobs/match-real but supports up to 10 jobs
    and returns a richer ranked result.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    try:
        jobs_list = json.loads(jobs)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="'jobs' must be a valid JSON array string.")

    if not isinstance(jobs_list, list):
        raise HTTPException(status_code=400, detail="'jobs' must be a JSON array.")

    valid_jobs = [j for j in jobs_list if isinstance(j, dict) and (j.get("id") or j.get("title"))]

    if not valid_jobs:
        return {"filename": file.filename, "candidate_profile": {}, "matched_jobs": []}

    # Cap to MAX_RANK_JOBS
    jobs_to_match = valid_jobs[:MAX_RANK_JOBS]

    resume_text, _page_count = _extract_pdf_text(contents)

    # Use the combined recommend prompt (it does profile + matching in one call)
    try:
        prompt = _build_combined_recommend_prompt(resume_text, jobs_to_match)
        ai_text = call_ai(prompt, max_tokens=4096)
        ai_result = clean_json_response(ai_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid response.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")

    # Extract profile
    cp = ai_result.get("candidate_profile", {})
    if not isinstance(cp, dict):
        cp = {}

    response_profile = {
        "name": cp.get("name", "Not specified"),
        "skills": cp.get("skills", []),
        "programming_languages": cp.get("programming_languages", []),
        "frameworks_and_tools": cp.get("frameworks_and_tools", []),
        "experience": cp.get("experience", []),
        "target_roles": cp.get("target_roles", []),
    }

    # Sanitise matched jobs + restore URLs
    original_url_map = {str(j.get("id", "")): j.get("redirect_url", "") for j in jobs_to_match}
    original_meta_map = {
        str(j.get("id", "")): {
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "created": j.get("created", ""),
            "description": j.get("description", ""),
        }
        for j in jobs_to_match
    }

    raw_matched = ai_result.get("matched_jobs", [])
    if not isinstance(raw_matched, list):
        raw_matched = []

    sanitised = []
    for item in raw_matched:
        if not isinstance(item, dict):
            continue
        job_id = str(item.get("job_id", ""))
        meta = original_meta_map.get(job_id, {})
        redirect_url = _strip_markdown_url(original_url_map.get(job_id, item.get("redirect_url", "")))

        sanitised.append({
            "job_id": job_id,
            "title": str(item.get("title", "")),
            "company": str(item.get("company", "")),
            "location": str(item.get("location", "")),
            "match_score": int(item.get("match_score", 0)),
            "matched_skills": list(item.get("matched_skills", [])),
            "missing_skills": list(item.get("missing_skills", [])),
            "experience_match": str(item.get("experience_match", "Unknown")),
            "evidence": list(item.get("evidence", [])),
            "match_summary": str(item.get("match_summary", "")),
            "salary_min": meta.get("salary_min"),
            "salary_max": meta.get("salary_max"),
            "created": meta.get("created", ""),
            "redirect_url": redirect_url,
        })

    # Rank: sort by match_score descending
    sanitised.sort(key=lambda x: x["match_score"], reverse=True)
    sanitised = sanitised[:MAX_RANK_JOBS]

    return {
        "filename": file.filename,
        "candidate_profile": response_profile,
        "jobs_found": len(sanitised),
        "matched_jobs": sanitised,
    }


# ============================================================
#  FEATURE 5 — APPLICATION AGENT
#  POST /application/prepare
#  POST /application/cover-letter
#
#  Prepares application data and generates cover letters.
#  Does NOT auto-submit — user must confirm.
# ============================================================

def _build_cover_letter_prompt(
    candidate_profile: dict,
    job: dict,
    resume_text: str
) -> str:
    """Generate a tailored cover letter for a specific job application."""
    return f"""You are a professional cover letter writer. Write a tailored cover letter for this job application.

CANDIDATE PROFILE:
{json.dumps(candidate_profile, indent=2)}

JOB DETAILS:
Title: {job.get('title', '')}
Company: {job.get('company', '')}
Location: {job.get('location', '')}
Description: {job.get('description', '')[:600]}

FULL RESUME TEXT (for evidence grounding):
\"\"\"
{resume_text[:2000]}
\"\"\"

RULES:
1. Address the letter to the hiring manager at the company.
2. Reference the specific job title and company name.
3. Highlight skills and experience from the resume that match the job requirements.
4. Mention specific projects or achievements that are relevant.
5. Keep it professional and concise (3-4 paragraphs).
6. Do NOT invent skills, experience, or achievements not in the resume.
7. Use the candidate's actual name from the profile.
8. Express enthusiasm for the role and company.
9. Close with a professional sign-off.

Return ONLY this JSON (no markdown, no extra text):
{{
  "cover_letter": "<the full cover letter text>",
  "key_highlights": ["<2-3 specific resume points referenced in the letter>"]
}}"""


@app.post("/application/cover-letter")
async def generate_cover_letter(
    file: UploadFile = File(...),
    job: str = Form(...),
):
    """
    Generate a tailored cover letter for a specific job.
    - file: resume PDF
    - job: JSON string of the job object
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    try:
        job_data = json.loads(job)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="'job' must be a valid JSON object string.")

    resume_text, _ = _extract_pdf_text(contents)

    # Extract profile first
    try:
        profile_prompt = _build_enhanced_resume_prompt(resume_text)
        profile_text = call_ai(profile_prompt, max_tokens=3000)
        profile = clean_json_response(profile_text)
    except Exception:
        profile = {"name": "Not specified"}

    # Generate cover letter
    try:
        cl_prompt = _build_cover_letter_prompt(profile, job_data, resume_text)
        cl_text = call_ai(cl_prompt, max_tokens=3000)
        cl_result = clean_json_response(cl_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid response.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

    return {
        "cover_letter": cl_result.get("cover_letter", ""),
        "key_highlights": cl_result.get("key_highlights", []),
        "candidate_name": profile.get("name", "Not specified"),
        "job_title": job_data.get("title", ""),
        "company": job_data.get("company", ""),
    }


def _build_application_prep_prompt(
    candidate_profile: dict,
    job: dict,
    resume_text: str
) -> str:
    """Prepare application data: map resume to common form fields, generate answers."""
    return f"""You are an AI application assistant. Help prepare a job application.

CANDIDATE PROFILE:
{json.dumps(candidate_profile, indent=2)}

JOB DETAILS:
Title: {job.get('title', '')}
Company: {job.get('company', '')}
Location: {job.get('location', '')}
Description: {job.get('description', '')[:600]}

RESUME TEXT:
\"\"\"
{resume_text[:2000]}
\"\"\"

TASK:
1. Map the candidate's information to common application form fields.
2. Generate answers for common application questions using ONLY resume evidence.
3. Identify any information gaps that the user might need to fill manually.

Return ONLY this JSON (no markdown, no extra text):
{{
  "form_fields": {{
    "full_name": "<from resume>",
    "email": "<from resume>",
    "phone": "<from resume>",
    "location": "<from resume>",
    "education": "<highest degree, institution, year>",
    "experience_years": "<years or 'Fresher'>",
    "current_role": "<most recent role or 'Student'>",
    "linkedin": "<or Not specified>",
    "portfolio": "<or Not specified>",
    "github": "<or Not specified>"
  }},
  "application_answers": {{
    "why_this_company": "<2-3 sentences: why the candidate wants to work at this company, grounded in resume>",
    "why_this_role": "<2-3 sentences: why the candidate is suited for this specific role>",
    "relevant_experience": "<2-3 sentences: most relevant experience from resume>",
    "key_strengths": "<2-3 sentences: strengths most relevant to this job>"
  }},
  "information_gaps": ["<list of fields that could not be filled from resume, e.g. 'LinkedIn URL', 'Portfolio URL'>"],
  "application_url": "<the job's redirect_url if available, otherwise empty string>"
}}"""


@app.post("/application/prepare")
async def prepare_application(
    file: UploadFile = File(...),
    job: str = Form(...),
):
    """
    Prepare a job application:
    - Maps resume info to form fields
    - Generates answers for common questions
    - Identifies information gaps
    - Does NOT submit the application
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    try:
        job_data = json.loads(job)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="'job' must be a valid JSON object string.")

    resume_text, _ = _extract_pdf_text(contents)

    # Extract profile
    try:
        profile_prompt = _build_enhanced_resume_prompt(resume_text)
        profile_text = call_ai(profile_prompt, max_tokens=3000)
        profile = clean_json_response(profile_text)
    except Exception:
        profile = {"name": "Not specified"}

    # Prepare application
    try:
        prep_prompt = _build_application_prep_prompt(profile, job_data, resume_text)
        prep_text = call_ai(prep_prompt, max_tokens=3000)
        prep_result = clean_json_response(prep_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid response.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application preparation failed: {str(e)}")

    # Include the job's redirect URL for the frontend to open
    app_url = job_data.get("redirect_url", "") or prep_result.get("form_fields", {}).get("application_url", "")

    return {
        "candidate_name": profile.get("name", "Not specified"),
        "job_title": job_data.get("title", ""),
        "company": job_data.get("company", ""),
        "form_fields": prep_result.get("form_fields", {}),
        "application_answers": prep_result.get("application_answers", {}),
        "information_gaps": prep_result.get("information_gaps", []),
        "application_url": app_url,
        "can_auto_submit": False,  # We never auto-submit
        "requires_manual_completion": bool(prep_result.get("information_gaps", [])),
    }


# ============================================================
#  FEATURE 6 — APPLICATION TRACKING
#  JSON file-based storage (no new DB dependency)
#
#  POST   /applications          — Create/save an application
#  GET    /applications          — List all applications
#  GET    /applications/{app_id} — Get one application
#  PATCH  /applications/{app_id} — Update status
#  DELETE /applications/{app_id} — Delete an application
# ============================================================

_APPLICATIONS_DIR = os.path.join(os.path.dirname(__file__), "data", "applications")
os.makedirs(_APPLICATIONS_DIR, exist_ok=True)


def _app_file_path(app_id: str) -> str:
    # Sanitize app_id to prevent path traversal
    safe_id = stdlib_re.sub(r'[^a-zA-Z0-9_\-]', '', app_id)
    return os.path.join(_APPLICATIONS_DIR, f"{safe_id}.json")


def _load_applications() -> list:
    """Load all applications from JSON files."""
    apps = []
    for fname in os.listdir(_APPLICATIONS_DIR):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(_APPLICATIONS_DIR, fname), "r") as f:
                    apps.append(json.load(f))
            except Exception:
                continue
    # Sort by date_applied descending
    apps.sort(key=lambda a: a.get("date_applied", a.get("date_found", "")), reverse=True)
    return apps


def _save_application(app_data: dict) -> str:
    """Save an application to a JSON file. Returns app_id."""
    app_id = app_data.get("app_id", "")
    if not app_id:
        # Generate unique ID
        raw = f"{app_data.get('job_url', '')}{app_data.get('company', '')}{app_data.get('job_title', '')}{datetime.datetime.now().isoformat()}"
        app_id = hashlib.md5(raw.encode()).hexdigest()[:16]
        app_data["app_id"] = app_id

    filepath = _app_file_path(app_id)
    with open(filepath, "w") as f:
        json.dump(app_data, f, indent=2, default=str)
    return app_id


class ApplicationCreate(BaseModel):
    job_title: str
    company: str
    job_url: str = ""
    job_id: str = ""
    location: str = ""
    match_score: int = 0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    experience_match: str = ""
    match_summary: str = ""
    cover_letter: str = ""
    application_answers: Dict = {}
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    cover_letter: Optional[str] = None


@app.post("/applications")
async def create_application(app: ApplicationCreate):
    """
    Create a new application record.
    Checks for duplicates based on job_url or job_id+company.
    """
    # Check for duplicate
    existing = _load_applications()
    for existing_app in existing:
        if app.job_url and existing_app.get("job_url") == app.job_url:
            raise HTTPException(status_code=409, detail="Already applied to this job (duplicate URL).")
        if (app.job_id and existing_app.get("job_id") == app.job_id and
            app.company and existing_app.get("company") == app.company):
            raise HTTPException(status_code=409, detail="Already applied to this job (duplicate job ID + company).")

    now = datetime.datetime.now().isoformat()
    app_data = {
        "app_id": "",
        "job_title": app.job_title,
        "company": app.company,
        "job_url": app.job_url,
        "job_id": app.job_id,
        "location": app.location,
        "match_score": app.match_score,
        "matched_skills": app.matched_skills,
        "missing_skills": app.missing_skills,
        "experience_match": app.experience_match,
        "match_summary": app.match_summary,
        "cover_letter": app.cover_letter,
        "application_answers": app.application_answers,
        "salary_min": app.salary_min,
        "salary_max": app.salary_max,
        "status": "Saved",
        "notes": "",
        "date_found": now,
        "date_applied": "",
        "current_stage": "Saved",
    }

    # Generate app_id first, then save once
    raw = f"{app.job_url}{app.company}{app.job_title}{now}"
    app_id = hashlib.md5(raw.encode()).hexdigest()[:16]
    app_data["app_id"] = app_id

    _save_application(app_data)

    return {"app_id": app_id, "message": "Application saved successfully.", "application": app_data}


@app.get("/applications")
async def list_applications():
    """List all tracked applications."""
    apps = _load_applications()
    return {"applications": apps, "total": len(apps)}


@app.get("/applications/{app_id}")
async def get_application(app_id: str):
    """Get a specific application by ID."""
    filepath = _app_file_path(app_id)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Application not found.")
    with open(filepath, "r") as f:
        return json.load(f)


@app.patch("/applications/{app_id}")
async def update_application(app_id: str, update: ApplicationUpdate):
    """Update an application's status or notes."""
    filepath = _app_file_path(app_id)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Application not found.")

    with open(filepath, "r") as f:
        app_data = json.load(f)

    if update.status:
        valid_statuses = ["Saved", "Applying", "Applied", "Assessment", "Interview", "Rejected", "Offer"]
        if update.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        app_data["status"] = update.status
        app_data["current_stage"] = update.status
        if update.status == "Applied":
            app_data["date_applied"] = datetime.datetime.now().isoformat()

    if update.notes is not None:
        app_data["notes"] = update.notes

    if update.cover_letter is not None:
        app_data["cover_letter"] = update.cover_letter

    with open(filepath, "w") as f:
        json.dump(app_data, f, indent=2, default=str)

    return {"message": "Application updated.", "application": app_data}


@app.delete("/applications/{app_id}")
async def delete_application(app_id: str):
    """Delete an application record."""
    filepath = _app_file_path(app_id)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Application not found.")
    os.remove(filepath)
    return {"message": "Application deleted."}


# ============================================================
#  FULL PIPELINE — POST /agent/run
#
#  Complete Resume → Search → Match → Rank pipeline in one call.
#  Returns everything the frontend needs for the full workflow.
# ============================================================

@app.post("/agent/run")
async def agent_run(
    file: UploadFile = File(...),
    location: str = Form("India"),
    target_role: str = Form(""),
):
    """
    Complete AI Job Search Agent pipeline:
    1. Extract resume profile
    2. Generate diverse search queries
    3. Search Adzuna with multiple queries
    4. Match and rank all jobs against resume
    5. Return profile + ranked jobs

    Total: 3 Groq calls (profile + queries + matching)
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")

    resume_text, page_count = _extract_pdf_text(contents)

    # Detect experience level (deterministic — no AI)
    experience_level = _detect_experience_level(resume_text)

    # Step 1: Extract profile
    try:
        profile_prompt = _build_enhanced_resume_prompt(resume_text)
        profile_text = call_ai(profile_prompt, max_tokens=3000)
        profile = clean_json_response(profile_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile extraction failed: {str(e)}")

    # Step 2: Generate search queries (experience-level-aware)
    try:
        query_prompt = _build_search_queries_prompt(profile, experience_level=experience_level)
        query_text = call_ai(query_prompt, max_tokens=1024)
        query_result = clean_json_response(query_text)
        search_queries = query_result.get("search_queries", [])
    except Exception:
        search_queries = _extract_search_queries_from_resume(resume_text, max_queries=5,
                                                              experience_level=experience_level)

    if target_role.strip():
        search_queries = [target_role.strip()] + [q for q in search_queries if q.lower() != target_role.strip().lower()]
        # Add entry-level variant for freshers
        if experience_level in ("fresher", "junior"):
            junior_query = f"Junior {target_role.strip()}"
            if junior_query not in search_queries:
                search_queries.insert(1, junior_query)
            entry_query = f"Entry Level {target_role.strip()}"
            if entry_query not in search_queries:
                search_queries.insert(2, entry_query)

    if not search_queries:
        search_queries = _extract_search_queries_from_resume(resume_text, max_queries=5,
                                                              experience_level=experience_level)

    search_queries = search_queries[:8]  # Allow up to 8 queries for entry-level to find more jobs

    # Step 3: Search Adzuna
    all_raw_jobs, adzuna_errors = _smart_search_adzuna(search_queries, location)

    if not all_raw_jobs:
        return {
            "filename": file.filename,
            "candidate_profile": profile,
            "search_queries": search_queries,
            "jobs_found": 0,
            "matched_jobs": [],
            "message": "No jobs found. Try a different location or role.",
        }

    # Step 4: Deduplicate and filter (experience-level-aware)
    filtered = _filter_and_select_jobs(all_raw_jobs, max_jobs=MAX_RANK_JOBS,
                                       experience_level=experience_level)

    if not filtered:
        return {
            "filename": file.filename,
            "candidate_profile": profile,
            "search_queries": search_queries,
            "jobs_found": 0,
            "matched_jobs": [],
            "message": "No suitable jobs found after filtering.",
        }

    # Snapshot original data
    original_url_map = {str(j.get("id", "")): j.get("redirect_url", "") for j in filtered}
    original_meta_map = {
        str(j.get("id", "")): {
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "created": j.get("created", ""),
            "description": j.get("description", ""),
        }
        for j in filtered
    }

    # Step 5: AI matching (single call)
    try:
        match_prompt = _build_combined_recommend_prompt(resume_text, filtered)
        match_text = call_ai(match_prompt, max_tokens=4096)
        match_result = clean_json_response(match_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid response.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")

    # Extract AI profile (may be richer than step 1)
    cp = match_result.get("candidate_profile", {})
    if not isinstance(cp, dict):
        cp = {}

    # Build response profile
    response_profile = {
        "name": cp.get("name", profile.get("name", "Not specified")),
        "skills": cp.get("skills", profile.get("soft_skills", [])),
        "programming_languages": cp.get("programming_languages", profile.get("programming_languages", [])),
        "frameworks_and_tools": cp.get("frameworks_and_tools", []),
        "experience": cp.get("experience", profile.get("work_experience", [])),
        "target_roles": cp.get("target_roles", profile.get("target_roles", [])),
        # Merge enhanced profile fields
        "location": profile.get("location", "Not specified"),
        "email": profile.get("email", "Not specified"),
        "education": profile.get("education", []),
        "databases": profile.get("databases", []),
        "cloud_devops": profile.get("cloud_devops", []),
        "certifications": profile.get("certifications", []),
        "experience_level": experience_level or profile.get("experience_level", "Entry Level"),
    }

    # Sanitise matched jobs
    raw_matched = match_result.get("matched_jobs", [])
    if not isinstance(raw_matched, list):
        raw_matched = []

    sanitised = []
    for item in raw_matched:
        if not isinstance(item, dict):
            continue
        job_id = str(item.get("job_id", ""))
        meta = original_meta_map.get(job_id, {})
        redirect_url = _strip_markdown_url(original_url_map.get(job_id, item.get("redirect_url", "")))

        sanitised.append({
            "job_id": job_id,
            "title": str(item.get("title", "")),
            "company": str(item.get("company", "")),
            "location": str(item.get("location", "")),
            "match_score": int(item.get("match_score", 0)),
            "matched_skills": list(item.get("matched_skills", [])),
            "missing_skills": list(item.get("missing_skills", [])),
            "experience_match": str(item.get("experience_match", "Unknown")),
            "evidence": list(item.get("evidence", [])),
            "match_summary": str(item.get("match_summary", "")),
            "salary_min": meta.get("salary_min"),
            "salary_max": meta.get("salary_max"),
            "created": meta.get("created", ""),
            "redirect_url": redirect_url,
        })

    # Rank by match_score descending
    sanitised.sort(key=lambda x: x["match_score"], reverse=True)
    sanitised = sanitised[:MAX_RANK_JOBS]

    return {
        "filename": file.filename,
        "candidate_profile": response_profile,
        "search_queries": search_queries,
        "jobs_found": len(sanitised),
        "matched_jobs": sanitised,
        "_debug": {
            "queries": search_queries,
            "experience_level": experience_level,
            "total_jobs_from_adzuna": len(all_raw_jobs),
            "jobs_after_filter": len(filtered),
            "adzuna_errors": adzuna_errors if adzuna_errors else None,
        }
    }