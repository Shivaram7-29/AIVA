import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertCircle,
  Trophy,
  Target,
  BarChart3,
  RotateCcw,
  ArrowRight,
  XCircle,
  BrainCircuit,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ============================================================
//  TOPIC COLORS
// ============================================================
const topicStyle = {
  'Numerical Ability': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Verbal Ability': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Reasoning Ability': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const diffColor = {
  Easy: 'text-green-400 bg-green-500/10',
  Medium: 'text-yellow-400 bg-yellow-500/10',
  Hard: 'text-red-400 bg-red-500/10',
};

// ============================================================
//  TIMER COMPONENT
// ============================================================
const Timer = ({ seconds }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 120;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
      isLow ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'
    }`}>
      <Clock className={`w-4 h-4 ${isLow ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
      <span className={`font-mono font-bold text-sm ${isLow ? 'text-red-400' : 'text-white'}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

// ============================================================
//  MAIN APTITUDE TEST COMPONENT
// ============================================================
const AptitudeTest = () => {
  const navigate = useNavigate();

  // States
  const [stage, setStage] = useState('setup'); // setup | loading | test | result

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Timer
  useEffect(() => {
    if (stage !== 'test') return;
    if (timeLeft <= 0) {
      finishTest();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  // Generate questions
  const startTest = async () => {
    setStage('loading');
    setError('');

    try {
      const res = await fetch(
        `${API_URL}/aptitude/generate?count=20`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      setTimeLeft(30 * 60);
      setStage('test');
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Make sure FastAPI is running.'
        : err.message
      );
      setStage('setup');
    }
  };

  const selectAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const goToQuestion = (index) => setCurrentIndex(index);
  const nextQuestion = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const prevQuestion = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const finishTest = useCallback(() => {
    setStage('result');
    setShowResult(true);
  }, []);

  // Calculate score
  const getScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct) correct++;
    });
    return correct;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  // ============================================================
  //  SETUP SCREEN
  // ============================================================
  if (stage === 'setup') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Aptitude Test
          </h2>
          <p className="text-gray-500 mt-1">Campus placement aptitude test based on TCS NQT pattern — 20 MCQs.</p>
        </div>


        {/* Test Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Questions', value: '20', icon: BookOpen, color: 'text-indigo-400' },
            { label: 'Duration', value: '30 min', icon: Clock, color: 'text-cyan-400' },
            { label: 'Sections', value: '3', icon: BrainCircuit, color: 'text-purple-400' },
            { label: 'Type', value: 'MCQ', icon: CheckCircle2, color: 'text-green-400' },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Topics breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-white">Sections (TCS NQT Pattern)</p>
          {[
            { topic: 'Numerical Ability', count: '7 questions', desc: 'Percentages, Profit & Loss, Time & Work, Ratios, Data Interpretation' },
            { topic: 'Verbal Ability', count: '7 questions', desc: 'Reading Comprehension, Sentence Correction, Synonyms, Para-jumbles' },
            { topic: 'Reasoning Ability', count: '6 questions', desc: 'Coding-Decoding, Series, Blood Relations, Seating, Syllogisms' },
          ].map(({ topic, count, desc }) => {
            const ts = topicStyle[topic];
            return (
              <div key={topic} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${ts.text}`}>{topic}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </div>
                <p className="text-xs text-gray-600 pl-1">{desc}</p>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Start */}
        <button onClick={startTest}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)]"
        >
          <Sparkles className="w-5 h-5" /> Start Aptitude Test
        </button>
      </div>
    );
  }

  // ============================================================
  //  LOADING SCREEN
  // ============================================================
  if (stage === 'loading') {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-white">Generating Your Test...</h3>
          <p className="text-gray-500">AI is creating 20 campus placement questions for you</p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  //  RESULT SCREEN
  // ============================================================
  if (stage === 'result') {
    const score = getScore();
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const unanswered = total - answeredCount;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
            pct >= 70 ? 'bg-green-500/20' : pct >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}>
            <Trophy className={`w-10 h-10 ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`} />
          </div>
          <h2 className="text-2xl font-bold text-white">Test Complete!</h2>
          <p className="text-gray-400">Campus Placement Aptitude Test</p>
        </motion.div>

        {/* Score Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className={`text-3xl font-bold ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score}/{total}
              </p>
              <p className="text-xs text-gray-500 mt-1">Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-400">{pct}%</p>
              <p className="text-xs text-gray-500 mt-1">Percentage</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400">{score}</p>
              <p className="text-xs text-gray-500 mt-1">Correct</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{answeredCount - score}</p>
              <p className="text-xs text-gray-500 mt-1">Wrong</p>
            </div>
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Topic-wise Performance
          </h3>
          {Object.keys(topicStyle).map((topic) => {
            const topicQs = questions.filter((q) => q.topic === topic);
            const topicCorrect = topicQs.filter((q) => answers[q.id] === q.correct).length;
            const ts = topicStyle[topic];
            return (
              <div key={topic} className="flex items-center gap-3">
                <span className={`text-xs w-48 ${ts.text}`}>{topic}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${ts.bg.replace('/10', '/60')}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${topicQs.length ? (topicCorrect / topicQs.length) * 100 : 0}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">{topicCorrect}/{topicQs.length}</span>
              </div>
            );
          })}
        </div>

        {/* Review Answers */}
        <details className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <summary className="px-5 py-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white transition-colors">
            Review All Answers ({total} questions)
          </summary>
          <div className="px-5 pb-5 space-y-4 max-h-[500px] overflow-y-auto">
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${
                  isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5" />}
                    <p className="text-sm text-gray-200 flex-1">
                      <span className="text-gray-500">Q{i + 1}.</span> {q.question}
                    </p>
                  </div>
                  <div className="ml-6 space-y-1 text-xs">
                    {userAns && !isCorrect && (
                      <p className="text-red-400">Your answer: {userAns}. {q.options[userAns]}</p>
                    )}
                    <p className="text-green-400">Correct: {q.correct}. {q.options[q.correct]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </details>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { setStage('setup'); setQuestions([]); setAnswers({}); }}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retake Test
          </button>
          <button onClick={() => navigate('/dashboard/coding')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
            Continue to Coding Round →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  //  TEST SCREEN
  // ============================================================
  return (
    <div className="flex gap-6" style={{ height: 'calc(100vh - 140px)' }}>

      {/* LEFT: Question Navigator Sidebar */}
      <div className="w-56 flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Questions</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {questions.map((q, i) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]'
                    : isAnswered
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Answered</span>
            <span className="text-green-400 font-bold">{answeredCount}/{questions.length}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />
            <span>Unanswered</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Question Area */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Top Bar: Question Counter + Timer */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQ && (
              <>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  topicStyle[currentQ.topic]?.bg || 'bg-white/5'
                } ${topicStyle[currentQ.topic]?.text || 'text-gray-400'} font-medium`}>
                  {currentQ.topic}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${diffColor[currentQ.difficulty] || 'text-gray-400 bg-white/5'}`}>
                  {currentQ.difficulty}
                </span>
              </>
            )}
          </div>
          <Timer seconds={timeLeft} />
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Question Text */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <p className="text-lg text-white leading-relaxed">{currentQ.question}</p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {Object.entries(currentQ.options).map(([key, value]) => {
                    const isSelected = answers[currentQ.id] === key;
                    return (
                      <button
                        key={key}
                        onClick={() => selectAnswer(currentQ.id, key)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 group ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                        }`}
                      >
                        {/* Option Letter */}
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-gray-400 group-hover:bg-white/10'
                        }`}>
                          {key}
                        </span>
                        <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {value}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4 flex-shrink-0">
          <button onClick={prevQuestion} disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            ← Previous
          </button>

          {currentIndex === questions.length - 1 ? (
            <button onClick={finishTest}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              Submit & Finish <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={nextQuestion}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold transition-all flex items-center gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;
