import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Send, Loader2, Sparkles, CheckCircle2, XCircle, Lightbulb,
  RotateCcw, Award, TrendingUp, TrendingDown, Users, BrainCircuit, Code,
  Volume2, VolumeX, PhoneOff, Video, Maximize2, Minimize2,
} from 'lucide-react';
import { PageHeader, ScoreRing } from './ui';
import { extractError } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const TOTAL_QUESTIONS = 8;
const PROFILE_STORAGE_KEY = 'placementai_candidate_profile';

const readCandidateProfile = () => {
  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const profile = stored ? JSON.parse(stored) : {};
    return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  } catch {
    return {};
  }
};

const FLOW = Object.freeze({
  QUESTION_SPEAKING: 'QUESTION_SPEAKING',
  WAITING_FOR_ANSWER: 'WAITING_FOR_ANSWER',
  ANSWER_SUBMITTED: 'ANSWER_SUBMITTED',
  EVALUATING: 'EVALUATING',
  FEEDBACK_DISPLAYED: 'FEEDBACK_DISPLAYED',
  BETTER_ANSWER_SPEAKING: 'BETTER_ANSWER_SPEAKING',
  SHORT_PAUSE: 'SHORT_PAUSE',
  NEXT_QUESTION_GENERATION: 'NEXT_QUESTION_GENERATION',
});

const interviewTypes = [
  { id: 'HR', label: 'HR Round', icon: Users, desc: 'Behavioral & soft skills', tag: 'Round 1' },
  { id: 'Technical', label: 'Technical', icon: BrainCircuit, desc: 'Core CS concepts', tag: 'Round 2' },
  { id: 'Coding', label: 'Coding', icon: Code, desc: 'Problem solving & DSA', tag: 'Round 3' },
];

const interviewers = [
  { id: 'male', label: 'Male', name: 'Arjun Mehta', title: 'Senior Interviewer' },
];


const ScoreBar = ({ score, max = 10 }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <Motion.div
        className="h-full rounded-full bg-white"
        initial={{ width: 0 }}
        animate={{ width: `${(Number(score) / max) * 100}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
    <span className="text-[12px] font-medium text-white/70">{score}/{max}</span>
  </div>
);

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const speechIdRef = useRef(0);
  const completionRef = useRef(null);
  const keepAliveRef = useRef(null);

  const clearKeepAlive = () => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const speak = useCallback((text, onComplete) => {
    clearKeepAlive();
    const speechId = speechIdRef.current + 1;
    speechIdRef.current = speechId;
    completionRef.current = onComplete;
    let completed = false;

    const complete = () => {
      if (completed) return;
      completed = true;
      clearKeepAlive();
      if (speechIdRef.current !== speechId) return;
      completionRef.current = null;
      setIsSpeaking(false);
      onComplete?.();
    };

    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      complete();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => voice.lang.startsWith('en')) || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);

    // Progression relies strictly on the actual speech completion event
    utterance.onend = () => {
      complete();
    };

    utterance.onerror = (event) => {
      clearKeepAlive();
      setIsSpeaking(false);
      completionRef.current = null;
      // Do not advance if speech was canceled, interrupted, or failed
      if (event?.error === 'canceled' || event?.error === 'interrupted') {
        return;
      }
      console.warn('[TTS] Speech synthesis error:', event?.error);
    };

    // Chromium keep-alive: prevents long feedback utterances (>14s) from stalling
    keepAliveRef.current = window.setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (!window.speechSynthesis.speaking) {
          clearKeepAlive();
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 10000);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stop = useCallback(() => {
    clearKeepAlive();
    completionRef.current = null;
    speechIdRef.current += 1;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleVoice = () => {
    if (voiceEnabled) stop();
    setVoiceEnabled((enabled) => !enabled);
  };

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => {
      clearKeepAlive();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking, voiceEnabled, toggleVoice };
};


const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let text = '';
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, setTranscript };
};

const FeedbackCard = ({ feedback }) => {
  if (!feedback) return null;
  return (
    <div className="liquid-glass rounded-xl p-4 space-y-3 overflow-y-auto dark-scroll">
      <p className="text-[11px] font-medium text-white/60 flex items-center gap-1">
        <Sparkles className="w-3 h-3" strokeWidth={2} /> AI evaluation
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium text-white/80" style={{ background: 'rgba(255,255,255,0.1)' }}>
          {feedback.verdict}
        </span>
        <span className="text-[13px] font-medium text-white">{feedback.score}/10</span>
      </div>
      <ScoreBar score={feedback.score} />
      <div className="flex items-center gap-2 text-[11px] text-white/60">
        {feedback.acceptable
          ? <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />
          : <XCircle className="w-3.5 h-3.5 text-white/60" />}
        {feedback.acceptable ? 'Answer is acceptable' : 'Answer needs more development'}
      </div>
      {feedback.strengths?.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-white/60 flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3" strokeWidth={2} /> Good
          </p>
          {feedback.strengths.map((strength, index) => (
            <p key={index} className="text-[11px] text-white/60 flex gap-1.5 mb-0.5">
              <CheckCircle2 className="w-3 h-3 text-white/70 mt-0.5 flex-shrink-0" strokeWidth={2} />{strength}
            </p>
          ))}
        </div>
      )}
      {feedback.weaknesses?.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-white/60 flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3" strokeWidth={2} /> Improve
          </p>
          {feedback.weaknesses.map((weakness, index) => (
            <p key={index} className="text-[11px] text-white/60 flex gap-1.5 mb-0.5">
              <XCircle className="w-3 h-3 text-white/50 mt-0.5 flex-shrink-0" strokeWidth={2} />{weakness}
            </p>
          ))}
        </div>
      )}
      {feedback.better_answer && (
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[11px] font-medium text-white/70 flex items-center gap-1 mb-1">
            <Lightbulb className="w-3 h-3" strokeWidth={2} /> Better way to answer
          </p>
          <p className="text-[11px] text-white/70 leading-relaxed">{feedback.better_answer}</p>
        </div>
      )}
      {feedback.actionable_feedback && (
        <p className="text-[11px] text-white/50 leading-relaxed">
          <span className="text-white/70 font-medium">Next time: </span>{feedback.actionable_feedback}
        </p>
      )}
    </div>
  );
};

const AIInterview = () => {
  const [stage, setStage] = useState('setup');
  const [flowState, setFlowState] = useState(FLOW.QUESTION_SPEAKING);
  const [role, setRole] = useState('Software Engineer');
  const [type, setType] = useState('Technical');
  const [interviewer, setInterviewer] = useState('male');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [scores, setScores] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resumeProfile] = useState(readCandidateProfile);
  const fsContainerRef = useRef(null);
  const advancingRef = useRef(false);
  const pauseTimerRef = useRef(null);
  const pendingFeedbackSpeechRef = useRef(null);

  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useSpeech();


  const { isListening, transcript, startListening, stopListening, setTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setUserInput(transcript);
  }, [transcript]);

  useEffect(() => () => {
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
  }, []);

  const showError = useCallback((message, title) => {
    setErrorState({ message, title });
    setIsLoading(false);
  }, []);

  const apiError = useCallback((err, fallback) => (
    err.message === 'Failed to fetch' ? fallback : err.message
  ), []);

  const finishInterview = useCallback(() => {
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = null;
    advancingRef.current = false;
    setCompleted(true);
    setStage('finished');
  }, []);

  const generateNextQuestion = useCallback(async ({ question, answer, evaluation, history, questionNumber, currentDifficulty }) => {
    setFlowState(FLOW.NEXT_QUESTION_GENERATION);
    setIsLoading(true);
    setErrorState(null);
    try {
      const response = await fetch(`${API_URL}/interview/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          interview_type: type,
          question_number: questionNumber,
          current_question: question,
          current_answer: answer,
          current_feedback: evaluation,
          current_difficulty: currentDifficulty || 'Easy',
          history: history.map((item) => ({
            question: item.question,
            answer: item.answer,
            score: item.score,
          })),
          candidate_profile: resumeProfile,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(extractError(data));
      if (!data.question) throw new Error('The AI did not return the next question. Please try again.');
      setCurrentQuestion(data);
      setQuestionCount(Number(data.question_number) || questionNumber + 1);
      setUserInput('');
      setTranscript('');
      setFeedback(null);
      advancingRef.current = false;
      setFlowState(FLOW.QUESTION_SPEAKING);
      speak(data.question, () => setFlowState(FLOW.WAITING_FOR_ANSWER));
    } catch (err) {
      advancingRef.current = false;
      setFlowState(FLOW.FEEDBACK_DISPLAYED);
      showError(apiError(err, 'The next question could not be loaded. Your evaluation is preserved.'), 'Could not load next question');
    } finally {
      setIsLoading(false);
    }
  }, [apiError, resumeProfile, role, setTranscript, showError, speak, type]);

  const advanceToNextOrFinish = useCallback((pending) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setFlowState(FLOW.SHORT_PAUSE);

    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      pauseTimerRef.current = null;
      const qNum = Number(pending.record?.questionNumber) || questionCount;
      if (qNum >= TOTAL_QUESTIONS) {
        finishInterview();
        return;
      }

      // Step 7: Speak transition message and strictly wait until it finishes
      speak("Alright, let's move on to the next question.", () => {
        // Step 8: Only after transition finishes should next question be generated/started
        generateNextQuestion({
          question: pending.record.question,
          answer: pending.record.answer,
          evaluation: pending.feedback,
          history: pending.history,
          questionNumber: qNum,
          currentDifficulty: pending.currentDifficulty,
        });
      });
    }, 1000);
  }, [finishInterview, generateNextQuestion, questionCount, speak]);

  useEffect(() => {
    if (flowState !== FLOW.FEEDBACK_DISPLAYED || !pendingFeedbackSpeechRef.current) return;
    const pending = pendingFeedbackSpeechRef.current;
    pendingFeedbackSpeechRef.current = null;
    setFlowState(FLOW.BETTER_ANSWER_SPEAKING);

    // Speak entire feedback and wait strictly for completion event (no racing timers)
    speak(pending.text, () => {
      advanceToNextOrFinish(pending);
    });
  }, [flowState, speak, advanceToNextOrFinish]);

  const startInterview = async () => {
    setIsLoading(true);
    setErrorState(null);
    try {
      const response = await fetch(`${API_URL}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interview_type: type, candidate_profile: resumeProfile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(extractError(data));
      if (!data.question) throw new Error('The AI did not return a question. Please try again.');
      setCurrentQuestion(data);
      setQuestionCount(Number(data.question_number) || 1);
      setScores([]);
      setFeedbacks([]);
      setFeedback(null);
      setUserInput('');
      setCompleted(false);
      advancingRef.current = false;
      setFlowState(FLOW.QUESTION_SPEAKING);
      setStage('interview');
      speak(data.question, () => setFlowState(FLOW.WAITING_FOR_ANSWER));
    } catch (err) {
      showError(apiError(err, 'Cannot connect to the interview backend. Make sure FastAPI is running.'), 'Could not start interview');
    } finally {
      setIsLoading(false);
    }
  };




  const submitAnswer = async () => {
    const answer = userInput.trim();
    if (!answer || isLoading || flowState !== FLOW.WAITING_FOR_ANSWER || !currentQuestion) return;
    if (isListening) stopListening();
    stop();
    setErrorState(null);
    advancingRef.current = false;
    setFlowState(FLOW.ANSWER_SUBMITTED);
    setFlowState(FLOW.EVALUATING);
    setIsLoading(true);

    try {
      const history = feedbacks.map((item) => ({
        question: item.question,
        answer: item.answer,
        score: item.score,
      }));
      const payload = {
        role,
        interview_type: type,
        question: currentQuestion.question,
        answer,
        question_number: currentQuestion.question_number || questionCount,
        history,
        candidate_profile: resumeProfile,
      };
      const response = await fetch(`${API_URL}/interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(extractError(data));
      if (!data.feedback) throw new Error('The AI did not return an evaluation. Please try again.');

      const nextFeedback = data.feedback;
      const completedRecord = { ...nextFeedback, question: currentQuestion.question, answer };
      setFeedback(nextFeedback);
      setScores((previous) => [...previous, Number(nextFeedback.score) || 0]);
      setFeedbacks((previous) => [...previous, completedRecord]);
      setFlowState(FLOW.FEEDBACK_DISPLAYED);

      const feedbackText = [
        `You scored ${nextFeedback.score} out of 10. ${nextFeedback.verdict}.`,
        nextFeedback.strengths?.length ? `What you did well: ${nextFeedback.strengths.join('. ')}.` : '',
        nextFeedback.weaknesses?.length ? `What to improve: ${nextFeedback.weaknesses.join('. ')}.` : '',
        nextFeedback.better_answer ? `A stronger answer would be: ${nextFeedback.better_answer}` : '',
      ].filter(Boolean).join(' ');
      const recordForHistory = {
        ...completedRecord,
        questionNumber: Number(currentQuestion.question_number) || questionCount,
      };
      pendingFeedbackSpeechRef.current = {
        text: feedbackText || 'Your answer has been evaluated.',
        record: recordForHistory,
        feedback: nextFeedback,
        history: [...feedbacks, recordForHistory],
        currentDifficulty: currentQuestion.difficulty || 'Easy',
      };
    } catch (err) {
      setFlowState(FLOW.WAITING_FOR_ANSWER);
      showError(apiError(err, 'The evaluation could not be completed. Your answer is still here—please retry.'), 'Could not evaluate answer');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (flowState !== FLOW.WAITING_FOR_ANSWER || isLoading) return;
    if (isListening) stopListening();
    else {
      setTranscript('');
      if (!startListening()) {
        showError('Speech recognition is not available in this browser. You can type your answer instead.', 'Voice input unavailable');
      }
    }
  };

  const endInterview = () => {
    stop();
    if (isListening) stopListening();
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = null;
    advancingRef.current = false;
    setCompleted(false);
    setStage('finished');
  };

  const resetInterview = () => {
    stop();
    if (isListening) stopListening();
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = null;
    advancingRef.current = false;
    setStage('setup');
    setFlowState(FLOW.QUESTION_SPEAKING);
    setCurrentQuestion(null);
    setQuestionCount(0);
    setScores([]);
    setFeedbacks([]);
    setFeedback(null);
    setUserInput('');
    setCompleted(false);
    setErrorState(null);
  };

  const enterFullscreen = () => {
    const element = fsContainerRef.current;
    if (element?.requestFullscreen) element.requestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  };

  const avgScore = scores.length
    ? (scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)
    : '0.0';
  const selectedInterviewer = interviewers.find((item) => item.id === interviewer) || interviewers[0];
  const hasResumeProfile = Object.entries(resumeProfile).some(([key, value]) => (
    key !== 'name' && ((Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value.trim() && value !== 'Not specified'))
  ));

  if (stage === 'setup') {
    return (
      <div className="max-w-[860px] mx-auto space-y-6">
        {errorState && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <XCircle className="w-4 h-4 text-white/70 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-white">{errorState.title}</p>
              <p className="text-[12px] text-white/50 mt-0.5">{errorState.message}</p>
            </div>
            <button onClick={() => setErrorState(null)} className="text-white/40 hover:text-white"><XCircle className="w-4 h-4" /></button>
          </div>
        )}

        <PageHeader kicker="AI Interview" title="Practice like the real thing." subtitle="A live-style interview where the interviewer controls the conversation." />

        <div className="liquid-glass rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-6 p-7 md:p-8">
            <div className="w-36 h-36 md:w-40 md:h-40 rounded-2xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={interviewer === 'female' ? '/interviewer-listening.png' : '/ai-interviewer.png'} alt={`${selectedInterviewer.name} interviewer`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                <span className="text-[11px] px-3 py-1 rounded-lg text-white/80" style={{ background: 'rgba(255,255,255,0.08)' }}>Voice Input</span>
                <span className="text-[11px] px-3 py-1 rounded-lg text-white/80" style={{ background: 'rgba(255,255,255,0.08)' }}>AI Speaks</span>
                <span className="text-[11px] px-3 py-1 rounded-lg text-white/80" style={{ background: 'rgba(255,255,255,0.08)' }}>Answer Feedback</span>
                <span className="text-[11px] px-3 py-1 rounded-lg text-white/80" style={{ background: hasResumeProfile ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)' }}>{hasResumeProfile ? 'Resume Context Ready' : 'Role-Based Interview'}</span>
              </div>
              <h3 className="text-[20px] font-normal tracking-tight text-white mt-4">{selectedInterviewer.name} — {selectedInterviewer.title}</h3>
              <p className="text-[14px] text-white/50 mt-2 leading-relaxed">The interviewer asks one question, waits for your answer, gives practical feedback, and continues naturally.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-white/40 mb-1.5">Target Role</label>
          <input type="text" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Software Engineer..." className="vex-input" />
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {['Software Engineer', 'Data Scientist', 'ML Engineer', 'Full Stack Developer', 'Backend Developer'].map((suggestion) => (
              <button key={suggestion} onClick={() => setRole(suggestion)} className="text-[12px] px-3 py-1.5 rounded-lg transition-all" style={{ background: role === suggestion ? 'rgba(255,255,255,0.1)' : 'transparent', color: role === suggestion ? '#FFFFFF' : 'rgba(255,255,255,0.5)', border: `1px solid ${role === suggestion ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-white/40 mb-3">Interview Round</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {interviewTypes.map((item) => (
              <button key={item.id} onClick={() => setType(item.id)} className="relative p-5 rounded-xl text-left transition-all" style={{ border: `1px solid ${type === item.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, background: type === item.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}>
                <span className="text-[10px] px-2 py-0.5 rounded-full text-white/50 font-medium" style={{ background: 'rgba(255,255,255,0.06)' }}>{item.tag}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mt-3 mb-2" style={{ background: 'rgba(255,255,255,0.08)' }}><item.icon className="w-5 h-5 text-white/80" strokeWidth={1.5} /></div>
                <p className="text-[14px] font-medium text-white tracking-tight">{item.label}</p>
                <p className="text-[12px] text-white/40 mt-0.5">{item.desc}</p>
                {type === item.id && <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-white" strokeWidth={2} />}
              </button>
            ))}
          </div>
        </div>



        <button onClick={startInterview} disabled={isLoading || !role.trim()} className="vex-btn-pill-primary w-full py-3.5 flex items-center justify-center gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><Video className="w-4 h-4" strokeWidth={1.5} /> Join Interview</>}
        </button>
      </div>
    );
  }

  if (stage === 'finished') {
    const strongAreas = feedbacks.flatMap((item) => item.strengths || []).slice(0, 3);
    const improveAreas = feedbacks.flatMap((item) => item.weaknesses || []).slice(0, 3);
    return (
      <div className="max-w-[860px] mx-auto space-y-5">
        <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3 py-6">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Award className="w-8 h-8 text-white" strokeWidth={1.5} /></div>
          <h2 className="text-[26px] font-normal text-white tracking-tight">{completed ? 'Interview Complete' : 'Interview Ended'}</h2>
          <p className="text-[14px] text-white/40">{type} Interview · {role}</p>
      </Motion.div>

        <div className="vex-card p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing value={avgScore} max={10} size={120} label="Overall Score" />
            <div className="grid grid-cols-2 gap-4 flex-1 w-full">
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{scores.filter((score) => score >= 7).length}</p><p className="text-[11px] text-white/40 mt-1.5">Good Answers</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{scores.filter((score) => score >= 8).length}</p><p className="text-[11px] text-white/40 mt-1.5">Strong Answers</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{scores.length}</p><p className="text-[11px] text-white/40 mt-1.5">Questions</p></div>
              <div className="text-center"><p className="text-[28px] font-normal text-white leading-none">{avgScore}</p><p className="text-[11px] text-white/40 mt-1.5">Average</p></div>
            </div>
          </div>
          {(strongAreas.length > 0 || improveAreas.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div><p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Strongest areas</p>{strongAreas.map((item, index) => <p key={index} className="text-[12px] text-white/60 mb-1">• {item}</p>)}</div>
              <div><p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Recommended preparation</p>{improveAreas.map((item, index) => <p key={index} className="text-[12px] text-white/60 mb-1">• {item}</p>)}</div>
            </div>
          )}
          <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-2">Question by question</p>
            {scores.map((score, index) => <div key={index} className="flex items-center gap-3"><span className="text-[11px] text-white/40 w-6">Q{index + 1}</span><ScoreBar score={score} /></div>)}
          </div>
        </div>

        <details className="vex-card overflow-hidden">
          <summary className="px-5 py-4 text-[13px] font-medium text-white/50 cursor-pointer hover:text-white transition-colors">Review all answers ({feedbacks.length})</summary>
          <div className="px-5 pb-5 space-y-3 max-h-[500px] overflow-y-auto">
            {feedbacks.map((item, index) => (
              <div key={index} className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-[13px] text-white"><span className="text-white/40 font-medium">Q{index + 1}:</span> {item.question}</p>
                <p className="text-[12px] text-white/50"><span className="text-white/30">Your answer:</span> {item.answer}</p>
                <div className="flex items-center gap-2"><ScoreBar score={item.score} /><span className="text-[11px] text-white/40">{item.verdict}</span></div>
                <FeedbackCard feedback={item} />
              </div>
            ))}
          </div>
        </details>
        <button onClick={resetInterview} className="vex-btn-secondary w-full py-3 text-[13px] flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" strokeWidth={1.5} /> Restart Interview</button>
      </div>
    );
  }

  const statusLabel = {
    [FLOW.QUESTION_SPEAKING]: 'Speaking',
    [FLOW.WAITING_FOR_ANSWER]: 'Your turn',
    [FLOW.ANSWER_SUBMITTED]: 'Answer submitted',
    [FLOW.EVALUATING]: 'Thinking',
    [FLOW.FEEDBACK_DISPLAYED]: 'Feedback ready',
    [FLOW.BETTER_ANSWER_SPEAKING]: 'Explaining better answer',
    [FLOW.SHORT_PAUSE]: 'One moment',
    [FLOW.NEXT_QUESTION_GENERATION]: 'Preparing next question',
  }[flowState] || (isSpeaking ? 'Speaking' : 'Listening');
  const answerEnabled = flowState === FLOW.WAITING_FOR_ANSWER && !isLoading && !isSpeaking;
  const interviewerImage = interviewer === 'female' ? '/interviewer-listening.png' : '/ai-interviewer.png';


  return (
    <div className="space-y-3">
      {errorState && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <XCircle className="w-4 h-4 text-white/70 mt-0.5" />
          <div className="flex-1"><p className="text-[13px] font-medium text-white">{errorState.title}</p><p className="text-[12px] text-white/50 mt-0.5">{errorState.message}</p></div>
          <button onClick={() => setErrorState(null)} className="text-white/40 hover:text-white"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      <div ref={fsContainerRef} className="relative w-full rounded-2xl overflow-hidden flex flex-col p-3 gap-3" style={{ minHeight: '85vh', background: '#000000' }}>
        <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
          <div className="flex-1 relative bg-black rounded-xl overflow-hidden min-h-[420px]" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
             <div className="absolute inset-0 z-0">
               <img src={interviewerImage} alt={`${selectedInterviewer.name} interviewer`} className="w-full h-full object-cover object-center" />
             </div>

            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 liquid-glass rounded-full px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-white" /><span className="text-[11px] text-white">{statusLabel}</span>
            </div>
            <AnimatePresence>
              {(flowState === FLOW.EVALUATING || flowState === FLOW.NEXT_QUESTION_GENERATION) && (
                <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                  <div className="flex items-center gap-2 liquid-glass rounded-full px-4 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-white" /><span className="text-[11px] text-white font-medium">AI is evaluating this answer…</span></div>
                </Motion.div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] px-2 py-0.5 rounded-lg text-white font-medium" style={{ background: 'rgba(255,255,255,0.15)' }}>Question {questionCount}/{TOTAL_QUESTIONS}</span>
                {currentQuestion?.topic && <span className="text-[11px] px-2 py-0.5 rounded-lg text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>{currentQuestion.topic}</span>}
                {currentQuestion?.difficulty && <span className="text-[11px] px-2 py-0.5 rounded-lg text-white font-medium" style={{ background: 'rgba(255,255,255,0.08)' }}>{currentQuestion.difficulty}</span>}
              </div>
              <p className="text-white text-[14px] leading-relaxed max-w-2xl">{currentQuestion?.question}</p>
            </div>
            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <button onClick={toggleVoice} className={`p-2 rounded-full liquid-glass transition-all ${voiceEnabled ? 'text-white' : 'text-white/50'}`} title={voiceEnabled ? 'Mute voice' : 'Enable voice'}>{voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>
              <button onClick={toggleFullscreen} className="p-2 rounded-full liquid-glass text-white hover:bg-white/20 transition-all" title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            </div>
          </div>

          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-3">
            <div className="liquid-glass rounded-xl p-4">
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-3">Progress · {selectedInterviewer.label} interviewer</p>
              <div className="flex gap-1.5 mb-3">{Array.from({ length: TOTAL_QUESTIONS }, (_, index) => <div key={index} className="flex-1 h-1.5 rounded-full" style={{ background: index < scores.length ? 'rgba(255,255,255,0.6)' : index === scores.length ? '#FFFFFF' : 'rgba(255,255,255,0.1)' }} />)}</div>

              {scores.length > 0 && <div className="flex items-center justify-between text-[11px]"><span className="text-white/40">Average score</span><span className="text-white font-medium">{avgScore}/10</span></div>}
            </div>
            {feedback ? <FeedbackCard feedback={feedback} /> : <div className="liquid-glass rounded-xl p-4 flex-1 min-h-[180px] flex items-center justify-center"><div className="text-center"><Mic className="w-7 h-7 text-white/30 mx-auto mb-2" strokeWidth={1.5} /><p className="text-[11px] text-white/40">{flowState === FLOW.EVALUATING ? 'Reviewing this answer…' : 'Answer the question to see AI feedback here'}</p></div></div>}
          </div>
        </div>

        <div className="flex-shrink-0 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <button onClick={toggleMic} disabled={!answerEnabled} className={`p-3 rounded-full transition-all ${isListening ? 'bg-white text-black animate-soft-pulse' : 'liquid-glass text-white/80 hover:text-white'} disabled:opacity-40`}><>{isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}</></button>
            <div className="flex-1 relative">
             <textarea rows={2} value={userInput} onChange={(event) => { setUserInput(event.target.value); setTranscript(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submitAnswer(); } }} disabled={!answerEnabled} placeholder={isListening ? 'Speak now…' : 'Type your answer or click mic to speak…'} className="w-full px-4 py-3 rounded-2xl text-white placeholder-white/40 focus:outline-none disabled:opacity-50 resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <button onClick={submitAnswer} disabled={!answerEnabled || !userInput.trim()} className="p-3 rounded-full bg-white text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
            <button onClick={endInterview} className="p-3 rounded-full text-white/70 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }} title="End interview"><PhoneOff className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInterview;