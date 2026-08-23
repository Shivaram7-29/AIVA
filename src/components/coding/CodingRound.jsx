import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Loader2,
  Sparkles,
  AlertCircle,
  ListChecks,
  Clock,
  Layers,
} from 'lucide-react';

import ProblemList from './ProblemList';
import ProblemPanel from './ProblemPanel';
import CodeEditor, { LANGUAGES } from './CodeEditor';
import ConsolePanel from './ConsolePanel';
import CodingResult from './CodingResult';
import CodingTimer from './CodingTimer';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const DEFAULT_LANGUAGE = 'python';
const SAVE_DEBOUNCE_MS = 1000;

const CodingRound = () => {
  // stage: 'setup' | 'loading' | 'active' | 'finishing' | 'result'
  const [stage, setStage] = useState('setup');
  const [error, setError] = useState('');
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const [currentId, setCurrentId] = useState(null);
  const [problemCache, setProblemCache] = useState({});     // id -> full detail
  const [codeState, setCodeState] = useState({});           // id -> { language, code }
  const [statusByQuestion, setStatusByQuestion] = useState({}); // id -> 'unanswered' | 'answered' | 'submitted'
  const [loadingProblem, setLoadingProblem] = useState(false);

  const [runResults, setRunResults] = useState({});      // id -> run result
  const [submitResults, setSubmitResults] = useState({}); // id -> submit result
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [result, setResult] = useState(null);

  const saveTimerRef = useRef(null);
  const finishedRef = useRef(false);

  // ------------------------------------------------------------
  //  On mount: resume an already-active round (refresh-safe)
  // ------------------------------------------------------------
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch(`${API_URL}/coding/status`);
        if (!res.ok) {
          setCheckingExisting(false);
          return;
        }
        const status = await res.json();
        if (status.status === 'active') {
          const listRes = await fetch(`${API_URL}/coding/problems`);
          const listData = await listRes.json();
          setQuestions(listData.questions);
          setSecondsRemaining(status.seconds_remaining);
          await hydrateSubmittedStatus();
          setStage('active');
          if (listData.questions.length > 0) {
            selectQuestion(listData.questions[0].id, listData.questions);
          }
        }
      } catch {
        // Backend unreachable — stay on setup screen, user can retry Start
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateSubmittedStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/coding/result`);
      if (!res.ok) return;
      const data = await res.json();
      const statusMap = {};
      data.question_results.forEach((q) => {
        if (q.status !== 'not_attempted') statusMap[q.question_id] = 'submitted';
      });
      setStatusByQuestion((prev) => ({ ...statusMap, ...prev }));
    } catch {
      // non-critical hydration — ignore
    }
  };

  // ------------------------------------------------------------
  //  Start round
  // ------------------------------------------------------------
  const startRound = async () => {
    setStage('loading');
    setError('');
    try {
      const res = await fetch(`${API_URL}/coding/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start coding round.');

      setQuestions(data.questions);
      setSecondsRemaining(data.seconds_remaining);
      setStage('active');
      if (data.questions.length > 0) {
        selectQuestion(data.questions[0].id, data.questions);
      }
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to backend. Make sure FastAPI is running.'
          : err.message
      );
      setStage('setup');
    }
  };

  // ------------------------------------------------------------
  //  Question selection + loading (problem detail + saved code)
  // ------------------------------------------------------------
  const selectQuestion = useCallback(async (id, questionList = questions) => {
    flushPendingSave();
    setCurrentId(id);

    if (!problemCache[id]) {
      setLoadingProblem(true);
      try {
        const res = await fetch(`${API_URL}/coding/problems/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to load question.');
        setProblemCache((prev) => ({ ...prev, [id]: data }));

        if (!codeState[id]) {
          // Try to restore previously saved progress; otherwise use starter code
          let restored = null;
          try {
            const progRes = await fetch(`${API_URL}/coding/progress/${id}`);
            if (progRes.ok) {
              const prog = await progRes.json();
              if (prog.code) restored = prog;
            }
          } catch {
            // ignore — fall back to starter code
          }

          if (restored) {
            setCodeState((prev) => ({ ...prev, [id]: restored }));
            setStatusByQuestion((prev) => ({ ...prev, [id]: prev[id] === 'submitted' ? 'submitted' : 'answered' }));
          } else {
            setCodeState((prev) => ({
              ...prev,
              [id]: {
                language: DEFAULT_LANGUAGE,
                code: data.starter_code?.[DEFAULT_LANGUAGE] || '',
              },
            }));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProblem(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemCache, codeState, questions]);

  // ------------------------------------------------------------
  //  Code + language changes (debounced auto-save)
  // ------------------------------------------------------------
  const flushPendingSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const persistCode = async (id, language, code) => {
    try {
      await fetch(`${API_URL}/coding/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: id, language, code }),
      });
    } catch {
      // best-effort; user can still Run/Submit which also save
    }
  };

  const handleCodeChange = (newCode) => {
    if (!currentId) return;
    setCodeState((prev) => ({
      ...prev,
      [currentId]: { ...prev[currentId], code: newCode },
    }));
    setStatusByQuestion((prev) => ({
      ...prev,
      [currentId]: prev[currentId] === 'submitted' ? 'submitted' : 'answered',
    }));

    flushPendingSave();
    saveTimerRef.current = setTimeout(() => {
      const lang = codeState[currentId]?.language || DEFAULT_LANGUAGE;
      persistCode(currentId, lang, newCode);
    }, SAVE_DEBOUNCE_MS);
  };

  const handleLanguageChange = (newLang) => {
    if (!currentId) return;
    flushPendingSave();
    const problem = problemCache[currentId];
    const existingCode = codeState[currentId]?.code || '';
    // Only swap in starter code if the candidate hasn't written anything yet for this language
    const nextCode = existingCode.trim()
      ? existingCode
      : problem?.starter_code?.[newLang] || '';

    setCodeState((prev) => ({ ...prev, [currentId]: { language: newLang, code: nextCode } }));
    persistCode(currentId, newLang, nextCode);
  };

  // ------------------------------------------------------------
  //  Run / Submit
  // ------------------------------------------------------------
  const handleRun = async () => {
    if (!currentId) return;
    flushPendingSave();
    const { language, code } = codeState[currentId] || {};
    setIsRunning(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/coding/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: currentId, language, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Run failed.');
      setRunResults((prev) => ({ ...prev, [currentId]: data }));
      setSubmitResults((prev) => ({ ...prev, [currentId]: null }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentId) return;
    flushPendingSave();
    const { language, code } = codeState[currentId] || {};
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/coding/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: currentId, language, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed.');
      setSubmitResults((prev) => ({ ...prev, [currentId]: data }));
      if (data.status !== 'provider_not_configured' && data.status !== 'provider_error') {
        setStatusByQuestion((prev) => ({ ...prev, [currentId]: 'submitted' }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  //  Timer resync + expiry
  // ------------------------------------------------------------
  const resyncTimer = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/coding/status`);
      if (!res.ok) return;
      const data = await res.json();
      setSecondsRemaining(data.seconds_remaining);
      if (data.status !== 'active' && !finishedRef.current) {
        handleFinish();
      }
    } catch {
      // ignore transient network errors, next resync will retry
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    flushPendingSave();
    setStage('finishing');
    try {
      await fetch(`${API_URL}/coding/finish`, { method: 'POST' });
      const res = await fetch(`${API_URL}/coding/result`);
      const data = await res.json();
      setResult(data);
      setStage('result');
    } catch (err) {
      setError('Could not finalize the round. Please check your connection and try again.');
      setStage('active');
      finishedRef.current = false;
    }
  }, []);

  const handleRestart = () => {
    window.location.href = '/dashboard';
  };

  const currentProblem = currentId ? problemCache[currentId] : null;
  const currentCode = currentId ? codeState[currentId] : null;

  // ============================================================
  //  SETUP SCREEN
  // ============================================================
  if (stage === 'setup') {
    if (checkingExisting) {
      return (
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code className="w-6 h-6 text-indigo-400" />
            Coding Round
          </h2>
          <p className="text-gray-500 mt-1">
            Solve real coding problems under a timed test environment — just like an actual placement assessment.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Questions', value: '8', icon: ListChecks, color: 'text-indigo-400' },
            { label: 'Duration', value: '60 min', icon: Clock, color: 'text-cyan-400' },
            { label: 'Languages', value: LANGUAGES.length.toString(), icon: Layers, color: 'text-purple-400' },
            { label: 'Type', value: 'Coding', icon: Code, color: 'text-green-400' },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
          <p className="text-sm font-semibold text-white">Before you start</p>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
            <li>The timer starts as soon as you click Start and is tracked on the server — refreshing won't reset it.</li>
            <li>Your code is saved automatically as you type and when you navigate between questions.</li>
            <li>Run Code checks sample test cases only. Submit Code evaluates all test cases and locks in your score.</li>
          </ul>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={startRound}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)]"
        >
          <Sparkles className="w-5 h-5" /> Start Coding Round
        </button>
      </div>
    );
  }

  // ============================================================
  //  LOADING / FINISHING SCREEN
  // ============================================================
  if (stage === 'loading' || stage === 'finishing') {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-white">
            {stage === 'loading' ? 'Starting Coding Round…' : 'Finalizing Your Result…'}
          </h3>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  //  RESULT SCREEN
  // ============================================================
  if (stage === 'result' && result) {
    return <CodingResult result={result} onRestart={handleRestart} />;
  }

  // ============================================================
  //  ACTIVE ROUND
  // ============================================================
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" /> Coding Round
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <CodingTimer secondsRemaining={secondsRemaining} onResync={resyncTimer} onExpire={handleFinish} />
          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold transition-all"
          >
            Finish Round
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm mb-4 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <ProblemList
          questions={questions}
          currentId={currentId}
          statusByQuestion={statusByQuestion}
          onSelect={(id) => selectQuestion(id)}
        />

        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-[42%] min-w-[320px] bg-white/[0.02] border border-white/10 rounded-xl p-5 overflow-hidden flex flex-col">
            <ProblemPanel problem={currentProblem} loading={loadingProblem} />
          </div>

          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <CodeEditor
              language={currentCode?.language || DEFAULT_LANGUAGE}
              code={currentCode?.code || ''}
              onLanguageChange={handleLanguageChange}
              onCodeChange={handleCodeChange}
              disabled={loadingProblem}
            />
            <ConsolePanel
              runResult={currentId ? runResults[currentId] : null}
              submitResult={currentId ? submitResults[currentId] : null}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              onRun={handleRun}
              onSubmit={handleSubmit}
              disabled={loadingProblem || !currentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingRound;
