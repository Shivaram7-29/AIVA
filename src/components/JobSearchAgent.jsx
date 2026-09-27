import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Search,
  MapPin,
  Target,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
  Zap,
  User,
  GraduationCap,
  Code,
  Database,
  Cloud,
  Send,
  FileCheck,
  RotateCcw,
  Bot,
  MessageSquare,
  Bookmark,
} from 'lucide-react';
import { PageHeader, ErrorBanner, LoadingState, EmptyState, MiniScoreRing } from './ui';
import { extractError } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ── Step Indicator (monochrome) ──────────────────────────────── */
const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-medium transition-all"
          style={{
            background: i === currentStep ? 'rgba(255,255,255,0.1)' : i < currentStep ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: `1px solid ${i === currentStep ? 'rgba(255,255,255,0.2)' : i < currentStep ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
            color: i === currentStep ? '#FFFFFF' : i < currentStep ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
          }}
        >
          {i < currentStep ? (
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
          ) : i === currentStep ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">
              {i + 1}
            </span>
          )}
          <span>{step}</span>
        </div>
        {i < steps.length - 1 && <div className="w-3 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />}
      </React.Fragment>
    ))}
  </div>
);

/* ── Candidate Profile Card ──────────────────────────────────── */
const CandidateProfileCard = ({ profile }) => {
  const [expanded, setExpanded] = useState(false);
  if (!profile) return null;

  const profileSkills = [
    { label: 'Education', icon: GraduationCap, items: profile.education?.map(e => typeof e === 'string' ? e : `${e.degree} in ${e.branch} — ${e.institution} (${e.year})`) || [] },
    { label: 'Languages', icon: Code, items: profile.programming_languages || [] },
    { label: 'Frameworks & Tools', icon: Zap, items: profile.frameworks_and_tools || profile.frameworks || [] },
    { label: 'Databases', icon: Database, items: profile.databases || [] },
    { label: 'Cloud & DevOps', icon: Cloud, items: profile.cloud_devops || [] },
    { label: 'Target Roles', icon: Target, items: profile.target_roles || [] },
  ];

  return (
    <div className="vex-card-solid overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] text-left transition-colors"
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <User className="w-[18px] h-[18px] text-white/60" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[14px] font-medium text-white block">{profile.name || 'Candidate Profile'}</span>
          <span className="text-[11px] text-white/40">
            {profile.programming_languages?.length || 0} languages · {profile.target_roles?.length || 0} target roles
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 space-y-4">
              {profileSkills.map(({ label, icon: Icon, items }) => (
                items.length > 0 && (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
                      <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-6">
                      {items.map((s, i) => <span key={i} className="skill-pill">{s}</span>)}
                    </div>
                  </div>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Job Card — dark glass, monochrome ring ─────────────────── */
const JobCard = ({ job, onApply }) => {
  const [expanded, setExpanded] = useState(false);
  const score = job.match_score || 0;

  const formatSalary = (min, max) => {
    if (!min && !max) return null;
    const fmt = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${Math.round(n / 1000)}K`);
    if (min && max) return `₹${fmt(min)} – ₹${fmt(max)}`;
    if (min) return `₹${fmt(min)}+`;
    return `up to ₹${fmt(max)}`;
  };
  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <motion.div layout className="vex-card overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-medium text-white truncate tracking-tight">{job.title}</h4>
            <div className="flex items-center gap-3 mt-1.5 text-[13px] text-white/40 flex-wrap">
              {job.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {job.company}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {job.location}
                </span>
              )}
              {salary && (
                <span className="flex items-center gap-1 text-white/60">
                  <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {salary}
                </span>
              )}
            </div>
          </div>
          <MiniScoreRing value={score} size={52} stroke={4} />
        </div>

        {job.match_summary && (
          <p className="text-[12px] text-white/40 mt-3 line-clamp-2 leading-relaxed">{job.match_summary}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.matched_skills?.slice(0, 5).map((skill, i) => <span key={i} className="skill-pill">{skill}</span>)}
          {job.missing_skills?.slice(0, 3).map((skill, i) => <span key={i} className="skill-pill-missing">{skill}</span>)}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {job.experience_match && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white/40" strokeWidth={1.5} />
                  <span className="text-[12px] text-white/40">Experience:</span>
                  <span className="text-[12px] font-medium text-white/80">{job.experience_match}</span>
                </div>
              )}
              {job.matched_skills?.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Matched Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.matched_skills.map((s, i) => <span key={i} className="skill-pill">{s}</span>)}
                  </div>
                </div>
              )}
              {job.missing_skills?.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Missing Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.missing_skills.map((s, i) => <span key={i} className="skill-pill-missing">{s}</span>)}
                  </div>
                </div>
              )}
              {job.evidence?.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Resume Evidence</span>
                  <ul className="mt-1 space-y-1">
                    {job.evidence.map((e, i) => (
                      <li key={i} className="text-[12px] text-white/50 flex gap-2">
                        <CheckCircle2 className="w-3 h-3 text-white/60 mt-0.5 flex-shrink-0" strokeWidth={2} />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] text-white/50 hover:text-white flex items-center gap-1 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less' : 'Details'}
        </button>
        {job.redirect_url && (
          <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/60 hover:text-white flex items-center gap-1 ml-2 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            View Job
          </a>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onApply(job)}
          className="vex-btn-primary px-4 py-2 text-[12px] flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
          Apply
        </button>
      </div>
    </motion.div>
  );
};

/* ── Application Modal ─────────────────────────────────────── */
const ApplicationModal = ({ job, resumeFile, onClose, onTracked }) => {
  const [step, setStep] = useState('preparing');
  const [prep, setPrep] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [agentReview, setAgentReview] = useState(null);
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  const [missingValues, setMissingValues] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);

  React.useEffect(() => {
    if (step === 'preparing') prepareApplication();
  }, []);

  const prepareApplication = async () => {
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('job', JSON.stringify(job));
      const res = await fetch(`${API_URL}/application/prepare`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Failed to prepare application'));
      setPrep(data);

      const clForm = new FormData();
      clForm.append('file', resumeFile);
      clForm.append('job', JSON.stringify(job));
      const clRes = await fetch(`${API_URL}/application/cover-letter`, { method: 'POST', body: clForm });
      const clData = await clRes.json();
      if (clRes.ok) setCoverLetter(clData.cover_letter || '');
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  };

  const handleConfirmApply = async () => {
    setStep('confirming');
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: job.title, company: job.company, job_url: job.redirect_url || '',
          job_id: job.job_id || '', location: job.location || '', match_score: job.match_score || 0,
          matched_skills: job.matched_skills || [], missing_skills: job.missing_skills || [],
          experience_match: job.experience_match || '', match_summary: job.match_summary || '',
          cover_letter: coverLetter, application_answers: prep?.application_answers || {},
          salary_min: job.salary_min || null, salary_max: job.salary_max || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Failed to save application'));
      setStep('done');
      if (onTracked) onTracked(data);
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  };

  const startBrowserAgent = async () => {
    setError('');
    setStep('detecting');
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('job', JSON.stringify(job));
      formData.append('prepared', JSON.stringify({ ...prep, resume_filename: resumeFile?.name || 'resume.pdf' }));
      const res = await fetch(`${API_URL}/application/agent/start`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Browser agent could not open this application page'));
      setAgentReview(data);
      setStep('agentReview');
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  };

  const continueManually = async () => {
    const url = agentReview?.external_url || prep?.application_url || job.redirect_url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    if (agentReview?.session_id) {
      try {
        await fetch(`${API_URL}/application/agent/${agentReview.session_id}/continue-manually`, { method: 'POST' });
      } catch (err) { console.warn('Could not close browser agent session:', err); }
    }
    onClose();
  };

  const submitThroughBrowserAgent = async () => {
    if (!agentReview?.session_id) return;
    setAgentSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/application/agent/${agentReview.session_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, values: missingValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'The application could not be submitted'));
      setSubmissionResult(data);
      setStep('submitted');
      if (onTracked) onTracked(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAgentSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && step !== 'confirming' && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="w-full max-w-[640px] rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="px-6 h-16 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Bot className="w-[18px] h-[18px] text-white/70" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-medium text-white">Application Agent</h3>
            <p className="text-[12px] text-white/40">{job.title} at {job.company}</p>
          </div>
          {step !== 'confirming' && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.01)' }}>
          {step === 'preparing' && <LoadingState message="AI is preparing your application…" subMessage="Mapping your resume to form fields" />}
          {step === 'detecting' && <LoadingState message="Opening the application page…" subMessage="Detecting standard form fields safely" />}
          {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
          {step === 'review' && prep && (
            <>
              <div className="vex-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                  <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Application Information</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(prep.form_fields || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-[10px] text-white/40 uppercase">{key.replace(/_/g, ' ')}</span>
                      <p className="text-[13px] text-white mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              {prep.application_answers && Object.keys(prep.application_answers).length > 0 && (
                <div className="vex-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                    <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">AI-Generated Responses</h4>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(prep.application_answers).map(([key, value]) => (
                      <div key={key} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-[10px] text-white/40 uppercase">{key.replace(/_/g, ' ')}</span>
                        <p className="text-[13px] text-white/70 mt-1 leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {coverLetter && (
                <div className="vex-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                    <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Cover Letter</h4>
                  </div>
                  <div className="rounded-lg px-4 py-3 text-[13px] text-white/70 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {coverLetter}
                  </div>
                </div>
              )}
              {prep.information_gaps?.length > 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[12px] font-medium text-white/70 mb-1">Information Gaps — You may need to fill these manually:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {prep.information_gaps.map((gap, i) => <span key={i} className="skill-pill">{gap}</span>)}
                  </div>
                </div>
              )}
              {prep.application_url && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ExternalLink className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                  <div className="flex-1">
                    <p className="text-[12px] text-white font-medium">Application Page</p>
                    <a href={prep.application_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/60 hover:text-white break-all transition-colors">{prep.application_url}</a>
                  </div>
                </div>
              )}
              {prep.application_url && (
                <div className="vex-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                    <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Browser Application Agent</h4>
                  </div>
                  <p className="text-[12px] text-white/45 leading-relaxed">
                    The agent can detect and fill common fields, upload your resume, and pause for CAPTCHA, login, MFA, or anything it cannot safely determine. It will never submit without your confirmation.
                  </p>
                  <button onClick={startBrowserAgent} className="vex-btn-secondary mt-4 px-4 py-2 text-[12px] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Detect & Fill Form
                  </button>
                </div>
              )}
            </>
          )}
          {step === 'agentReview' && agentReview && (
            <>
              <div className="vex-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                  <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Application Review</h4>
                </div>
                <p className="text-[12px] text-white/45">
                  {agentReview.form_detected ? 'The agent detected a standard form and filled the fields it could verify.' : 'No standard form was detected on this page.'}
                </p>
                {agentReview.external_url && <p className="text-[11px] text-white/35 mt-2 break-all">{agentReview.external_url}</p>}
              </div>

              {agentReview.fields?.length > 0 && (
                <div className="vex-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                    <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Mapped Fields</h4>
                  </div>
                  <div className="space-y-2">
                    {agentReview.fields.map((field) => (
                      <div key={field.field_id} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div>
                          <p className="text-[12px] text-white/70">{field.label}{field.required ? ' *' : ''}</p>
                          <p className="text-[11px] text-white/35">{field.source || 'Not mapped'}{field.fill_status ? ` · ${field.fill_status}` : ''}</p>
                        </div>
                        <p className="text-[12px] text-white/60 text-right max-w-[220px] truncate">{field.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agentReview.missing_fields?.length > 0 && (
                <div className="vex-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                    <h4 className="text-[13px] font-medium text-white uppercase tracking-wider">Missing Information</h4>
                  </div>
                  <p className="text-[12px] text-white/45 mb-3">These required values were not found in your profile. Add them here or continue manually.</p>
                  <div className="space-y-3">
                    {agentReview.missing_fields.map((field) => (
                      <label key={field.field_id} className="block">
                        <span className="text-[11px] text-white/50">{field.label}</span>
                        <input
                          value={missingValues[field.field_id] || ''}
                          onChange={(e) => setMissingValues((prev) => ({ ...prev, [field.field_id]: e.target.value }))}
                          placeholder={field.reason}
                          className="vex-input mt-1 w-full"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {agentReview.warnings?.length > 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[12px] font-medium text-white/70 mb-1">Manual intervention required</p>
                  {agentReview.warnings.map((warning, i) => <p key={i} className="text-[12px] text-white/45 mt-1">{warning}</p>)}
                </div>
              )}
            </>
          )}
          {step === 'confirming' && <LoadingState message="Saving your application…" subMessage="Adding to your tracker" />}
          {step === 'submitted' && submissionResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="w-12 h-12 text-white/80" strokeWidth={1.5} />
              <p className="text-[18px] font-medium text-white">{submissionResult.status}</p>
              <p className="text-[13px] text-white/45 text-center max-w-md">{submissionResult.message}</p>
              {submissionResult.verification_url && <a href={submissionResult.verification_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/60 hover:text-white break-all text-center">{submissionResult.verification_url}</a>}
            </div>
          )}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={1.5} />
              </motion.div>
              <p className="text-[18px] font-medium text-white">Application Saved!</p>
              <p className="text-[13px] text-white/40 text-center max-w-md">Your application to {job.company} for {job.title} has been tracked.</p>
              {job.redirect_url && (
                <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="vex-btn-primary mt-2 px-5 py-2.5 text-[13px] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Complete Application on Website
                </a>
              )}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111114' }}>
            <button onClick={onClose} className="vex-btn-secondary flex-1 py-2.5 text-[13px]">Cancel</button>
            {prep?.application_url && (
              <a href={prep.application_url} target="_blank" rel="noopener noreferrer" className="vex-btn-secondary px-5 py-2.5 text-[13px] flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Open Job Page
              </a>
            )}
            <button onClick={handleConfirmApply} className="vex-btn-primary flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2">
              <Bookmark className="w-4 h-4" /> Save Application
            </button>
          </div>
        )}
        {step === 'agentReview' && (
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111114' }}>
            <button onClick={continueManually} className="vex-btn-secondary flex-1 py-2.5 text-[13px]">Continue Manually</button>
            <button
              onClick={submitThroughBrowserAgent}
              disabled={agentSubmitting || agentReview.warnings?.length > 0 || agentReview.missing_fields?.some((field) => !missingValues[field.field_id]?.trim())}
              className="vex-btn-primary flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {agentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirm & Submit
            </button>
          </div>
        )}
        {step === 'submitted' && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111114' }}>
            <button onClick={onClose} className="vex-btn-primary w-full py-2.5 text-[13px]">Close</button>
          </div>
        )}
        {step === 'done' && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111114' }}>
            <button onClick={onClose} className="vex-btn-primary w-full py-2.5 text-[13px]">Close</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ── MAIN ───────────────────────────────────────────────────── */
const JobSearchAgent = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [searchQueries, setSearchQueries] = useState([]);
  const [location, setLocation] = useState('India');
  const [targetRole, setTargetRole] = useState('');
  const [applyingJob, setApplyingJob] = useState(null);
  const fileInputRef = useRef(null);

  const steps = ['Upload', 'AI Analysis', 'Job Search', 'AI Matching', 'Results'];

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files[0]); };
  const handleFileSelect = (e) => validateAndSetFile(e.target.files[0]);

  const validateAndSetFile = (selectedFile) => {
    setError(''); setProfile(null); setMatchedJobs([]); setCurrentStep(0);
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; }
    if (selectedFile.size > 5 * 1024 * 1024) { setError('File size must be under 5MB.'); return; }
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null); setError(''); setProfile(null); setMatchedJobs([]); setCurrentStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* Pipeline call — unchanged */
  const runPipeline = async () => {
    if (!file) return;
    setIsLoading(true); setError(''); setCurrentStep(1);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('location', location);
      if (targetRole) formData.append('target_role', targetRole);

      setCurrentStep(1);
      await new Promise((r) => setTimeout(r, 500));
      setCurrentStep(2);

      const response = await fetch(`${API_URL}/agent/run`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(extractError(data, 'Pipeline failed'));

      setCurrentStep(3);
      await new Promise((r) => setTimeout(r, 300));
      setCurrentStep(4);

      setProfile(data.candidate_profile || {});
      setMatchedJobs(data.matched_jobs || []);
      setSearchQueries(data.search_queries || []);
      try {
        window.localStorage.setItem('placementai_candidate_profile', JSON.stringify(data.candidate_profile || {}));
      } catch {
        // Job search remains usable even when browser storage is unavailable.
      }

      if (data.matched_jobs?.length === 0 && data.message) setError(data.message);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to backend. Make sure FastAPI is running on http://127.0.0.1:8000' : err.message);
      setCurrentStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (job) => setApplyingJob(job);
  const handleAppTracked = () => {};
  const resetAll = () => { removeFile(); setCurrentStep(0); };

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      <PageHeader
        kicker="Job Search Agent"
        title="Find your next opportunity."
        subtitle="Discover roles matched to your skills and experience."
      />

      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Step 0: Upload */}
      {currentStep === 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-white/40 mb-1.5">Job Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={1.5} />
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bangalore, India, Remote" className="vex-input pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-white/40 mb-1.5">Target Role (optional)</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={1.5} />
                <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Python Developer, ML Engineer..." className="vex-input pl-10" />
              </div>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-white/30">Quick roles:</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {['Software Engineer', 'Python Developer', 'Data Scientist', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'ML Engineer', 'Data Analyst', 'Mobile Developer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setTargetRole(role)}
                  className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: targetRole === role ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: targetRole === role ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${targetRole === role ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <motion.div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className="relative rounded-2xl px-8 py-14 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${isDragging ? 'rgba(255,255,255,0.3)' : file ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}`,
              background: isDragging ? 'rgba(255,255,255,0.04)' : file ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.015)',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <UploadIcon className="w-6 h-6 text-white/50" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[16px] font-medium text-white">{isDragging ? 'Drop your resume here' : 'Upload your resume'}</p>
                    <p className="text-[13px] text-white/40 mt-1">Drag & drop, or click to browse · PDF only · Max 5MB</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <p className="text-[15px] font-medium text-white">Resume ready!</p>
                  <p className="text-[12px] text-white/40">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="vex-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <FileText className="w-5 h-5 text-white/60" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-white truncate">{file.name}</p>
                    <p className="text-[12px] text-white/40">{(file.size / 1024).toFixed(1)} KB · PDF</p>
                  </div>
                  <button onClick={removeFile} className="p-2 rounded-lg text-white/40 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <button onClick={runPipeline} className="vex-btn-pill-primary w-full py-3.5 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  Find My Best Jobs
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Loading */}
      {currentStep >= 1 && currentStep <= 3 && isLoading && (
        <LoadingState
          message={currentStep === 1 ? 'Analyzing your resume with AI…' : currentStep === 2 ? 'Searching for matching jobs…' : 'AI is matching and ranking jobs…'}
          subMessage={currentStep === 1 ? 'Extracting skills, experience, and target roles' : currentStep === 2 ? 'Querying multiple job boards with diverse search terms' : 'Evaluating each job against your complete resume'}
        />
      )}

      {/* Error */}
      <AnimatePresence>
        {error && currentStep !== 0 && (
          <ErrorBanner title="Something went wrong. Please try again." message={error} onDismiss={() => setError('')} onRetry={resetAll} />
        )}
      </AnimatePresence>

      {/* Results */}
      {currentStep === 4 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <CandidateProfileCard profile={profile} />

          {searchQueries.length > 0 && (
            <div className="vex-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-white/40" strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Search Queries Used</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {searchQueries.map((q, i) => <span key={i} className="skill-pill">{q}</span>)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-white/50" strokeWidth={1.5} />
              <h3 className="text-[18px] font-medium tracking-tight text-white">Recommended for you</h3>
              <span className="text-[13px] text-white/40">({matchedJobs.length} found)</span>
            </div>
            <button onClick={resetAll} className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              New Search
            </button>
          </div>

          {matchedJobs.length > 0 ? (
            <div className="space-y-3">
              {matchedJobs.map((job, i) => (
                <motion.div key={job.job_id || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}>
                  <JobCard job={job} onApply={handleApply} />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No matching opportunities found."
              description="Try a different location or target role, or run a new search."
              action={
                <button onClick={resetAll} className="vex-btn-secondary inline-flex items-center gap-1.5 text-[13px] px-4 py-2">
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Start new search
                </button>
              }
            />
          )}

          <div className="text-center text-[11px] text-white/30">
            Job listings powered by{' '}
            <a href="https://www.adzuna.in/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">Adzuna</a>
          </div>

          <button onClick={resetAll} className="vex-btn-secondary w-full py-3 text-[13px]">Upload Another Resume</button>
        </motion.div>
      )}

      {/* How It Works */}
      {currentStep === 0 && !file && (
        <div className="vex-card p-5 flex gap-3">
          <Sparkles className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-[13px] text-white/50 leading-relaxed">
            <p className="font-medium text-white/70 mb-1">How it works</p>
            Upload Resume → AI analyzes your skills & experience → Searches real jobs with multiple queries → AI matches & ranks every job → Review results → Apply with AI-prepared applications
          </div>
        </div>
      )}

      <AnimatePresence>
        {applyingJob && (
          <ApplicationModal job={applyingJob} resumeFile={file} onClose={() => setApplyingJob(null)} onTracked={handleAppTracked} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSearchAgent;
