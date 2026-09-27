import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Clock, BookOpen, CheckCircle2, ChevronRight, Loader2, Sparkles,
  AlertCircle, Trophy, BarChart3, RotateCcw, ArrowRight, XCircle, BrainCircuit,
} from 'lucide-react';
import { PageHeader, ScoreRing } from './ui';
import { extractError } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const Timer = ({ seconds }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 120;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: isLow ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Clock className={`w-3.5 h-3.5 ${isLow ? 'text-white animate-soft-pulse' : 'text-white/40'}`} strokeWidth={1.5} />
      <span className="font-mono font-medium text-[13px] text-white">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
};

const AptitudeTest = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('setup');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage !== 'test') return;
    if (timeLeft <= 0) { finishTest(); return; }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  const startTest = async () => {
    setStage('loading'); setError('');
    try {
      const res = await fetch(`${API_URL}/aptitude/generate?count=20`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data));
      setQuestions(data.questions); setAnswers({}); setCurrentIndex(0); setTimeLeft(30 * 60); setStage('test');
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to backend. Make sure FastAPI is running.' : err.message);
      setStage('setup');
    }
  };

  const selectAnswer = (questionId, option) => setAnswers((prev) => ({ ...prev, [questionId]: option }));
  const goToQuestion = (index) => setCurrentIndex(index);
  const nextQuestion = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const prevQuestion = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const finishTest = useCallback(() => { setStage('result'); }, []);

  const getScore = () => {
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct) correct++; });
    return correct;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  /* ── SETUP ────────────────────────────────────────────────── */
  if (stage === 'setup') {
    return (
      <div className="max-w-[860px] mx-auto space-y-6">
        <PageHeader kicker="Aptitude Assessment" title="Aptitude Assessment." subtitle="Campus placement aptitude test based on TCS NQT pattern — 20 MCQs." />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Questions', value: '20', icon: BookOpen },
            { label: 'Duration', value: '30 min', icon: Clock },
            { label: 'Sections', value: '3', icon: BrainCircuit },
            { label: 'Type', value: 'MCQ', icon: CheckCircle2 },
          ].map((item) => (
            <div key={item.label} className="vex-card p-4 text-center">
              <item.icon className="w-5 h-5 mx-auto mb-2 text-white/50" strokeWidth={1.5} />
              <p className="text-[20px] font-normal text-white leading-none">{item.value}</p>
              <p className="text-[11px] text-white/40 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="vex-card p-6 space-y-4">
          <p className="text-[13px] font-medium text-white">Sections (TCS NQT Pattern)</p>
          {[
            { topic: 'Numerical Ability', count: '7 questions', desc: 'Percentages, Profit & Loss, Time & Work, Ratios, Data Interpretation' },
            { topic: 'Verbal Ability', count: '7 questions', desc: 'Reading Comprehension, Sentence Correction, Synonyms, Para-jumbles' },
            { topic: 'Reasoning Ability', count: '6 questions', desc: 'Coding-Decoding, Series, Blood Relations, Seating, Syllogisms' },
          ].map(({ topic, count, desc }) => (
            <div key={topic} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-white/80">{topic}</span>
                <span className="text-[11px] text-white/40">{count}</span>
              </div>
              <p className="text-[12px] text-white/40 pl-1">{desc}</p>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <AlertCircle className="w-4 h-4 text-white/70" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">Couldn't start test</p>
                <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={startTest} className="vex-btn-pill-primary w-full py-3.5 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" strokeWidth={1.5} />
          Start Aptitude Test
        </button>
      </div>
    );
  }

  /* ── LOADING ──────────────────────────────────────────────── */
  if (stage === 'loading') {
    return (
      <div className="max-w-[860px] mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-full animate-spin" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
          <div>
            <h3 className="text-[18px] font-normal text-white">Generating Your Test…</h3>
            <p className="text-[13px] text-white/40 mt-1">AI is creating 20 campus placement questions for you</p>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── RESULT ───────────────────────────────────────────────── */
  if (stage === 'result') {
    const score = getScore();
    const total = questions.length;
    const pct = Math.round((score / total) * 100);

    return (
      <div className="max-w-[860px] mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Trophy className="w-8 h-8 text-white" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-[26px] font-normal text-white tracking-tight">Test Complete</h2>
          <p className="text-[14px] text-white/40">Campus Placement Aptitude Test</p>
        </motion.div>

        {/* Score ring + stats */}
        <div className="vex-card p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing value={pct} max={100} size={120} label="Accuracy" />
            <div className="grid grid-cols-2 gap-4 flex-1 w-full">
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{score}/{total}</p><p className="text-[11px] text-white/40 mt-1.5">Score</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{score}</p><p className="text-[11px] text-white/40 mt-1.5">Correct</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{answeredCount - score}</p><p className="text-[11px] text-white/40 mt-1.5">Incorrect</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{total - answeredCount}</p><p className="text-[11px] text-white/40 mt-1.5">Unanswered</p></div>
            </div>
          </div>
        </div>

        {/* Performance summary */}
        <div className="vex-card p-5 space-y-4">
          <h3 className="text-[13px] font-medium text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-white/50" strokeWidth={1.5} />
            Performance Summary
          </h3>
          {['Numerical Ability', 'Verbal Ability', 'Reasoning Ability'].map((topic) => {
            const topicQs = questions.filter((q) => q.topic === topic);
            const topicCorrect = topicQs.filter((q) => answers[q.id] === q.correct).length;
            const topicPct = topicQs.length ? (topicCorrect / topicQs.length) * 100 : 0;
            return (
              <div key={topic} className="flex items-center gap-3">
                <span className="text-[12px] w-48 text-white/60">{topic}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${topicPct}%` }} transition={{ duration: 0.7 }} />
                </div>
                <span className="text-[12px] text-white/40 w-12 text-right">{topicCorrect}/{topicQs.length}</span>
              </div>
            );
          })}
        </div>

        {/* Review */}
        <details className="vex-card overflow-hidden">
          <summary className="px-5 py-4 text-[13px] font-medium text-white/50 cursor-pointer hover:text-white transition-colors">
            Review All Answers ({total} questions)
          </summary>
          <div className="px-5 pb-5 space-y-3 max-h-[500px] overflow-y-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 text-white/70 mt-0.5 flex-shrink-0" strokeWidth={2} /> : <XCircle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" strokeWidth={2} />}
                    <p className="text-[13px] text-white flex-1 leading-relaxed"><span className="text-white/40">Q{i + 1}.</span> {q.question}</p>
                  </div>
                  <div className="ml-6 space-y-1 text-[12px]">
                    {userAns && !isCorrect && <p className="text-white/40">Your answer: {userAns}. {q.options[userAns]}</p>}
                    <p className="text-white/70">Correct: {q.correct}. {q.options[q.correct]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        <div className="flex gap-3">
          <button onClick={() => { setStage('setup'); setQuestions([]); setAnswers({}); }} className="vex-btn-secondary flex-1 py-3 text-[13px] flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} /> Retake Test
          </button>
          <button onClick={() => navigate('/dashboard/coding')} className="vex-btn-primary flex-1 py-3 text-[13px] flex items-center justify-center gap-2">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ── TEST ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Sidebar — question navigator */}
      <div className="w-full lg:w-56 flex-shrink-0 vex-card p-4 flex flex-col">
        <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-3">Questions</p>
        <div className="grid grid-cols-10 lg:grid-cols-5 gap-1.5 mb-4">
          {questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = i === currentIndex;
            return (
              <button key={q.id} onClick={() => goToQuestion(i)} className="w-7 h-7 rounded-md text-[11px] font-medium flex items-center justify-center transition-all"
                style={{
                  background: isCurrent ? '#FFFFFF' : isAnswered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                  color: isCurrent ? '#000000' : isAnswered ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${isCurrent ? '#FFFFFF' : isAnswered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-auto space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/40">Answered</span>
            <span className="text-white font-medium">{answeredCount}/{questions.length}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full bg-white rounded-full" animate={{ width: `${(answeredCount / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between pb-4 mb-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-white">Question {currentIndex + 1} of {questions.length}</span>
            {currentQ && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg text-white/60 font-medium" style={{ background: 'rgba(255,255,255,0.06)' }}>{currentQ.topic}</span>
            )}
          </div>
          <Timer seconds={timeLeft} />
        </div>

        {currentQ && (
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={currentQ.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="space-y-5">
                <div className="vex-card p-6">
                  <p className="text-[17px] text-white leading-relaxed">{currentQ.question}</p>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(currentQ.options).map(([key, value]) => {
                    const isSelected = answers[currentQ.id] === key;
                    return (
                      <button key={key} onClick={() => selectAnswer(currentQ.id, key)} className="w-full text-left p-4 rounded-xl flex items-center gap-3.5 transition-all"
                        style={{
                          background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-medium flex-shrink-0 transition-all"
                          style={{ background: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.06)', color: isSelected ? '#000000' : 'rgba(255,255,255,0.6)' }}>
                          {key}
                        </span>
                        <span className="text-[14px] text-white/80">{value}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-white ml-auto flex-shrink-0" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-4 mt-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={prevQuestion} disabled={currentIndex === 0} className="vex-btn-secondary px-4 py-2 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
          {currentIndex === questions.length - 1 ? (
            <button onClick={finishTest} className="vex-btn-primary px-5 py-2 text-[13px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Submit & Finish
            </button>
          ) : (
            <button onClick={nextQuestion} className="vex-btn-primary px-5 py-2 text-[13px] flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;
