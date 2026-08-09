import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  BrainCircuit,
  Code,
  Target,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Video,
  Monitor,
  Maximize2,
  Minimize2,
} from 'lucide-react';


import InteractiveAvatar from './InteractiveAvatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const interviewTypes = [
  { id: 'HR', label: 'HR Round', icon: Users, color: 'from-pink-500 to-rose-600', desc: 'Behavioral & soft skills', tag: 'Round 1' },
  { id: 'Technical', label: 'Technical', icon: BrainCircuit, color: 'from-indigo-500 to-blue-600', desc: 'Core CS concepts', tag: 'Round 2' },
  { id: 'Coding', label: 'Coding', icon: Code, color: 'from-emerald-500 to-teal-600', desc: 'Problem solving & DSA', tag: 'Round 3' },
];


// ============================================================
//  SCORE BAR
// ============================================================
const ScoreBar = ({ score, max = 10 }) => {
  const pct = (score / max) * 100;
  const color = score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-sm font-bold ${score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
        {score}/{max}
      </span>
    </div>
  );
};

// ============================================================
//  TEXT-TO-SPEECH HOOK
// ============================================================
const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;   // Professional rate
    utterance.pitch = 1.0; // Natural pitch for male voice

    // Pick a professional male English voice
    const voices = window.speechSynthesis.getVoices();

    // Priority order: known deep male voices
    const maleNames = ['Microsoft Mark', 'Microsoft David', 'Google UK English Male', 'Daniel', 'James', 'David', 'Mark', 'Alex'];
    const preferred =
      voices.find(v => maleNames.some(n => v.name.includes(n)) && v.lang.startsWith('en')) ||
      voices.find(v => v.name.toLowerCase().includes('male') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoice = () => {
    if (voiceEnabled) stop();
    setVoiceEnabled(v => !v);
  };

  useEffect(() => {
    // Preload voices
    window.speechSynthesis?.getVoices();
    return () => window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop, isSpeaking, voiceEnabled, toggleVoice };
};

// ============================================================
//  SPEECH RECOGNITION HOOK
// ============================================================
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let t = '';
      for (let i = 0; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      setTranscript(t);
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = () => setTranscript('');

  return { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript };
};

// ============================================================
//  MAIN AI INTERVIEW COMPONENT
// ============================================================
const AIInterview = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('setup');
  const [role, setRole] = useState('Software Engineer');
  const [type, setType] = useState('Technical');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [scores, setScores] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [connectionAnim, setConnectionAnim] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fsContainerRef = useRef(null);

  // ── Fullscreen helpers ─────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  }, []);

  // Track native fullscreen changes (e.g. user presses ESC)
  useEffect(() => {
    const handler = () => {
      const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFs);
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useSpeech();
  const { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript } = useSpeechRecognition();

  // Sync transcript to input
  useEffect(() => {
    if (transcript) setUserInput(transcript);
  }, [transcript]);

  // Start interview — load first question
  const startInterview = async () => {
    setIsLoading(true);
    setConnectionAnim(true);
    try {
      const res = await fetch(`${API_URL}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interview_type: type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setCurrentQuestion(data);
      setQuestionCount(1);
      setScores([]);
      setFeedbacks([]);
      setShowFeedback(null);
      setConnectionAnim(false);
      setStage('interview');
      speak(data.question);
    } catch (err) {
      setConnectionAnim(false);
      // error recovery
      alert('Error: ' + err.message);
    } finally { setIsLoading(false); }
  };

  // Submit answer
  const submitAnswer = async () => {
    const answer = userInput.trim();
    if (!answer || isLoading) return;
    if (isListening) stopListening();
    stop();
    setUserInput('');
    resetTranscript();
    setIsLoading(true);
    setShowFeedback(null);

    try {
      // Prepare history to send
      const history = feedbacks.map(item => ({
        question: item.question,
        answer: item.answer
      }));

      const payload = {
        role,
        interview_type: type,
        question: currentQuestion.question,
        answer,
        question_number: currentQuestion.question_number || questionCount,
        history
      };

      const res = await fetch(`${API_URL}/interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setScores(prev => [...prev, data.feedback.score]);
      setFeedbacks(prev => [...prev, { ...data.feedback, question: currentQuestion.question, answer }]);
      setShowFeedback(data.feedback);

      // Human-like pause before giving feedback
      setIsThinking(true);
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      setIsThinking(false);

      // Build full spoken feedback:
      // Score → Verdict → What you did well → Improvements → Model Answer
      const weaknessPart = data.feedback.weaknesses?.length
        ? `Here is what you can improve: ${data.feedback.weaknesses.join('. ')}.`
        : '';
      const strengthPart = data.feedback.strengths?.length
        ? `What you did well: ${data.feedback.strengths.join('. ')}.`
        : '';
      const modelAnswerPart = data.feedback.better_answer
        ? `Here is a stronger answer you should remember: ${data.feedback.better_answer}`
        : '';

      const feedbackText = [
        `You scored ${data.feedback.score} out of 10. ${data.feedback.verdict}.`,
        strengthPart,
        weaknessPart,
        modelAnswerPart,
      ].filter(Boolean).join(' ');

      speak(feedbackText);

      // Estimate how long the speech will take (~130 words per minute)
      const wordCount = feedbackText.split(/\s+/).length;
      const speechDurationMs = Math.max(6000, (wordCount / 130) * 60 * 1000);

      if (questionCount >= 5) {
        setTimeout(() => setStage('finished'), speechDurationMs + 2000);
      } else {
        // Wait for speech to finish, then think, then ask next question
        setTimeout(() => {
          setShowFeedback(null);
          setIsThinking(true);
          setTimeout(() => {
            setIsThinking(false);
            setCurrentQuestion(data.next_question);
            setQuestionCount(c => c + 1);
            speak(data.next_question.question);
          }, 1500 + Math.random() * 1000);
        }, speechDurationMs + 1000);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally { setIsLoading(false); }
  };

  const toggleMic = () => {
    if (isListening) { stopListening(); }
    else { resetTranscript(); startListening(); }
  };

  const endInterview = () => { stop(); if (isListening) stopListening(); setStage('finished'); };
  const resetInterview = () => { stop(); setStage('setup'); setCurrentQuestion(null); setQuestionCount(0); setScores([]); setFeedbacks([]); setShowFeedback(null); setUserInput(''); };
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

  // ============ SETUP ============
  if (stage === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 p-8">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              <img src="/ai-interviewer.png" alt="AI Interviewer" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 justify-center md:justify-start">
                <Mic className="w-6 h-6 text-indigo-400" /> AI Mock Interview
              </h2>
              <p className="text-gray-400 mt-2 leading-relaxed">
                Face-to-face with our AI interviewer. It <strong className="text-indigo-400">speaks questions aloud</strong> and you can
                reply by <strong className="text-green-400">voice or text</strong>. Real interview experience!
              </p>
              <div className="flex gap-3 mt-4 justify-center md:justify-start">
                <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">🎙️ Voice Input</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">🔊 AI Speaks</span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">📊 Live Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Target Role</label>
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
          <div className="flex flex-wrap gap-2 mt-2">
            {['Software Engineer', 'Data Scientist', 'ML Engineer', 'Full Stack Developer', 'Backend Developer'].map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${role === r ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300'}`}
              >{r}</button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Interview Round</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {interviewTypes.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`relative p-5 rounded-xl border text-left transition-all duration-300 ${type === t.id
                  ? 'border-indigo-500/50 bg-indigo-500/10 scale-[1.02] shadow-[0_0_20px_rgba(79,70,229,0.15)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'}`}
              >
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-medium">{t.tag}</span>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${t.color} flex items-center justify-center mt-3 mb-2`}>
                  <t.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-semibold text-sm">{t.label}</p>
                <p className="text-gray-500 text-xs mt-1">{t.desc}</p>
                {type === t.id && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startInterview} disabled={isLoading || !role.trim()}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.25)] disabled:opacity-70">
          {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Connecting...</> : <><Video className="w-5 h-5" />Join Interview</>}
        </button>

        {/* Connection Animation Overlay */}
        <AnimatePresence>
          {connectionAnim && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#0B0F19]/95 flex items-center justify-center"
            >
              <div className="text-center space-y-6">
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"
                />
                <div>
                  <p className="text-white text-lg font-semibold">Connecting to Interview</p>
                  <p className="text-gray-500 text-sm mt-1">Setting up your session with the AI interviewer…</p>
                </div>
                <div className="flex justify-center gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============ FINISHED ============
  if (stage === 'finished') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Interview Complete!</h2>
          <p className="text-gray-400">{type} Interview · {role}</p>
        </motion.div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Target className="w-5 h-5 text-indigo-400" /> Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-indigo-400">{avgScore}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Score</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-green-400">{scores.filter(s => s >= 7).length}</p>
              <p className="text-xs text-gray-500 mt-1">Good Answers</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-yellow-400">{scores.length}</p>
              <p className="text-xs text-gray-500 mt-1">Questions</p>
            </div>
          </div>
          {scores.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8">Q{i + 1}</span>
              <ScoreBar score={s} />
            </div>
          ))}
        </div>

        {/* Detailed Review */}
        <details className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <summary className="px-5 py-4 text-sm font-semibold text-gray-400 cursor-pointer hover:text-white transition-colors">
            Review All Answers ({feedbacks.length} questions)
          </summary>
          <div className="px-5 pb-5 space-y-4 max-h-[500px] overflow-y-auto">
            {feedbacks.map((fb, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-200"><span className="text-indigo-400 font-semibold">Q{i + 1}:</span> {fb.question}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-500">Your answer:</span> {fb.answer}</p>
                <div className="flex items-center gap-2">
                  <ScoreBar score={fb.score} />
                  <span className="text-xs text-gray-500">{fb.verdict}</span>
                </div>
                {fb.better_answer && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3">
                    <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1 mb-1"><Lightbulb className="w-3 h-3" /> Model Answer</p>
                    <p className="text-xs text-gray-300">{fb.better_answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>

        <div className="flex gap-3">
          <button onClick={resetInterview}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> New Interview
          </button>
        </div>
      </div>
    );
  }

  // ============ VIDEO CALL STYLE INTERVIEW ============
  return (
    <div
      ref={fsContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '85vh',
        background: '#080b14',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        gap: '12px',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Main Video Area */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* AI Interviewer — Large Video Feed */}
        <div className="flex-1 relative bg-black/40 rounded-2xl overflow-hidden border border-white/10" style={{ boxShadow: '0 0 60px rgba(79,70,229,0.08)' }}>
          <InteractiveAvatar isSpeaking={isSpeaking} isListening={isListening} state={isThinking ? 'thinking' : 'idle'} />

          {/* Thinking Overlay */}
          <AnimatePresence>
            {isThinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
              >
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-300 font-medium">AI is thinking…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Question Overlay */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={questionCount}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">Question {questionCount}/5</span>
              {currentQuestion?.topic && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{currentQuestion.topic}</span>
              )}
              {currentQuestion?.difficulty && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  currentQuestion.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' : currentQuestion.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                }`}>{currentQuestion.difficulty}</span>
              )}
            </div>
            <p className="text-white text-sm leading-relaxed max-w-2xl">{currentQuestion?.question}</p>
          </motion.div>

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 flex gap-2 z-20">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-gray-300 font-medium">LIVE</span>
            </div>
            {/* Voice toggle */}
            <button onClick={toggleVoice}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all ${voiceEnabled ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}>
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {/* Fullscreen toggle */}
            <button onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="p-2 rounded-lg backdrop-blur-sm bg-white/10 text-white hover:bg-white/20 transition-all">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right Panel — Feedback + Info */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">

          {/* Score Progress */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Progress</p>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={`flex-1 h-2 rounded-full ${
                  n < questionCount ? 'bg-green-500' : n === questionCount ? 'bg-indigo-500' : 'bg-white/5'
                }`} />
              ))}
            </div>
            {scores.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Avg Score</span>
                <span className="text-indigo-400 font-bold">{avgScore}/10</span>
              </div>
            )}
          </div>

          {/* Live Feedback Card */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 flex-1 overflow-y-auto"
              >
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Feedback</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    showFeedback.score >= 8 ? 'text-green-400 bg-green-500/10' : showFeedback.score >= 5 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'
                  }`}>{showFeedback.verdict}</span>
                  <span className="text-sm font-bold text-white">{showFeedback.score}/10</span>
                </div>
                <ScoreBar score={showFeedback.score} />
                {showFeedback.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-400 flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3" /> Strengths</p>
                    {showFeedback.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-0.5"><CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />{s}</p>
                    ))}
                  </div>
                )}
                {showFeedback.weaknesses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-1"><TrendingDown className="w-3 h-3" /> Improve</p>
                    {showFeedback.weaknesses.map((w, i) => (
                      <p key={i} className="text-xs text-gray-400 flex gap-1.5 mb-0.5"><XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />{w}</p>
                    ))}
                  </div>
                )}
                {showFeedback.better_answer && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3">
                    <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1 mb-1"><Lightbulb className="w-3 h-3" /> Model Answer</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{showFeedback.better_answer}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!showFeedback && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mic className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Answer the question to<br/>see AI feedback here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="flex-shrink-0 pt-2 border-t border-white/10">
        <div className="flex items-center gap-3">
          {/* Mic toggle */}
          <button onClick={toggleMic}
            className={`p-3 rounded-xl transition-all ${isListening
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'}`}>
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => { setUserInput(e.target.value); setTranscript(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(); }}
              disabled={isLoading || isSpeaking}
              placeholder={isListening ? '🎙️ Speak now...' : 'Type your answer or click mic to speak...'}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 pr-12"
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-[2px]">
                {[0, 1, 2, 3].map(i => (
                  <motion.div key={i} className="w-1 bg-red-400 rounded-full"
                    animate={{ height: [4, 14, 4] }}
                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Send */}
          <button onClick={submitAnswer} disabled={isLoading || !userInput.trim() || isSpeaking}
            className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white transition-all hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>

          {/* End call */}
          <button onClick={endInterview}
            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20">
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInterview;
