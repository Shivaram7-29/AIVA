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
  ChevronRight,
  Bot,
  MessageSquare,
  Bookmark,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ============================================================
//  STEP INDICATOR
// ============================================================
const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          i === currentStep ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
          i < currentStep ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          'bg-white/5 text-gray-500 border border-white/5'
        }`}>
          {i < currentStep ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           i === currentStep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
           <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
          <span>{step}</span>
        </div>
        {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600" />}
      </React.Fragment>
    ))}
  </div>
);

// ============================================================
//  CANDIDATE PROFILE DISPLAY
// ============================================================
const CandidateProfileCard = ({ profile }) => {
  const [expanded, setExpanded] = useState(false);
  if (!profile) return null;

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <User className="w-5 h-5 text-indigo-400" />
        <span className="text-sm font-semibold text-white flex-1 text-left">
          {profile.name || 'Candidate Profile'}
        </span>
        <span className="text-xs text-gray-500">
          {profile.programming_languages?.length || 0} languages · {profile.target_roles?.length || 0} target roles
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 space-y-4">
              {profile.education && profile.education.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-amber-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Education</span></div>
                  {profile.education.map((edu, i) => (
                    <p key={i} className="text-sm text-gray-300 ml-6">{typeof edu === 'string' ? edu : `${edu.degree} in ${edu.branch} — ${edu.institution} (${edu.year})`}</p>
                  ))}
                </div>
              )}
              {profile.programming_languages?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Code className="w-4 h-4 text-blue-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Languages</span></div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {profile.programming_languages.map((s, i) => <span key={i} className="px-2 py-1 rounded-lg text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20">{s}</span>)}
                  </div>
                </div>
              )}
              {(profile.frameworks_and_tools || profile.frameworks || [])?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-cyan-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Frameworks & Tools</span></div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {(profile.frameworks_and_tools || profile.frameworks || []).map((s, i) => <span key={i} className="px-2 py-1 rounded-lg text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{s}</span>)}
                  </div>
                </div>
              )}
              {(profile.databases || [])?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Database className="w-4 h-4 text-amber-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Databases</span></div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {profile.databases.map((s, i) => <span key={i} className="px-2 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">{s}</span>)}
                  </div>
                </div>
              )}
              {(profile.cloud_devops || [])?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Cloud className="w-4 h-4 text-green-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Cloud & DevOps</span></div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {profile.cloud_devops.map((s, i) => <span key={i} className="px-2 py-1 rounded-lg text-xs bg-green-500/10 text-green-300 border border-green-500/20">{s}</span>)}
                  </div>
                </div>
              )}
              {profile.target_roles?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-indigo-400" /><span className="text-xs font-semibold text-gray-400 uppercase">Target Roles</span></div>
                  <div className="flex flex-wrap gap-2 ml-6">
                    {profile.target_roles.map((s, i) => <span key={i} className="px-2 py-1 rounded-lg text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{s}</span>)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
//  JOB CARD
// ============================================================
const JobCard = ({ job, onApply, onResumeFile }) => {
  const [expanded, setExpanded] = useState(false);
  const score = job.match_score || 0;
  const scoreColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = score >= 75 ? 'bg-green-500/10' : score >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <motion.div
      layout
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
    >
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-white truncate">{job.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
              {job.company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.company}</span>}
              {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
            </div>
          </div>
          <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg ${scoreBg} ${scoreColor} font-bold text-lg`}>
            {score}%
          </div>
        </div>

        {/* Match summary */}
        {job.match_summary && (
          <p className="text-xs text-gray-400 mt-3 line-clamp-2">{job.match_summary}</p>
        )}

        {/* Quick skill tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.matched_skills?.slice(0, 5).map((skill, i) => (
            <span key={i} className="px-2 py-1 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">{skill}</span>
          ))}
          {job.missing_skills?.slice(0, 3).map((skill, i) => (
            <span key={i} className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">{skill}</span>
          ))}
        </div>
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-3">
              {/* Experience Match */}
              {job.experience_match && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Experience:</span>
                  <span className={`text-xs font-medium ${
                    job.experience_match === 'Strong' ? 'text-green-400' :
                    job.experience_match === 'Partial' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{job.experience_match}</span>
                </div>
              )}

              {/* Matched Skills */}
              {job.matched_skills?.length > 0 && (
                <div>
                  <span className="text-xs text-green-400 font-semibold">Matched Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.matched_skills.map((s, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-300">{s}</span>)}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {job.missing_skills?.length > 0 && (
                <div>
                  <span className="text-xs text-red-400 font-semibold">Missing Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {job.missing_skills.map((s, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-300">{s}</span>)}
                  </div>
                </div>
              )}

              {/* Evidence */}
              {job.evidence?.length > 0 && (
                <div>
                  <span className="text-xs text-indigo-400 font-semibold">Resume Evidence</span>
                  <ul className="mt-1 space-y-1">
                    {job.evidence.map((e, i) => <li key={i} className="text-[11px] text-gray-400 flex gap-2"><CheckCircle2 className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Salary */}
              {(job.salary_min || job.salary_max) && (
                <div className="text-xs text-gray-400">
                  Salary: {job.salary_min ? `₹${(job.salary_min/1000).toFixed(0)}K` : '—'} — {job.salary_max ? `₹${(job.salary_max/1000).toFixed(0)}K` : '—'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less' : 'Details'}
        </button>
        {job.redirect_url && (
          <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 ml-2">
            <ExternalLink className="w-3.5 h-3.5" />View Job
          </a>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onApply(job)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
        >
          <Send className="w-3.5 h-3.5" />Apply
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================
//  APPLICATION MODAL
// ============================================================
const ApplicationModal = ({ job, resumeFile, onClose, onTracked }) => {
  const [step, setStep] = useState('preparing'); // preparing | review | confirming | done
  const [prep, setPrep] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (step === 'preparing') {
      prepareApplication();
    }
  }, []);

  const prepareApplication = async () => {
    try {
      const formData = new FormData();
      formData.append('file', resumeFile);
      formData.append('job', JSON.stringify(job));

      const res = await fetch(`${API_URL}/application/prepare`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to prepare application');
      setPrep(data);

      // Also generate cover letter
      const clForm = new FormData();
      clForm.append('file', resumeFile);
      clForm.append('job', JSON.stringify(job));
      const clRes = await fetch(`${API_URL}/application/cover-letter`, { method: 'POST', body: clForm });
      const clData = await clRes.json();
      if (clRes.ok) setCoverLetter(clData.cover_letter || '');

      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('review'); // Show partial results
    }
  };

  const handleConfirmApply = async () => {
    setStep('confirming');
    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: job.title,
          company: job.company,
          job_url: job.redirect_url || '',
          job_id: job.job_id || '',
          location: job.location || '',
          match_score: job.match_score || 0,
          matched_skills: job.matched_skills || [],
          missing_skills: job.missing_skills || [],
          experience_match: job.experience_match || '',
          match_summary: job.match_summary || '',
          cover_letter: coverLetter,
          application_answers: prep?.application_answers || {},
          salary_min: job.salary_min || null,
          salary_max: job.salary_max || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save application');
      setStep('done');
      if (onTracked) onTracked(data);
    } catch (err) {
      setError(err.message);
      setStep('review');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && step !== 'confirming' && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-[#0d1224]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <Bot className="w-5 h-5 text-indigo-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Application Agent</h3>
            <p className="text-xs text-gray-500">{job.title} at {job.company}</p>
          </div>
          {step !== 'confirming' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'preparing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-gray-400">AI is preparing your application...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {step === 'review' && prep && (
            <>
              {/* Form Fields Preview */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2"><FileCheck className="w-4 h-4 text-green-400" />Application Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(prep.form_fields || {}).map(([key, value]) => (
                    <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-gray-500 uppercase">{key.replace(/_/g, ' ')}</span>
                      <p className="text-sm text-gray-300 mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI-Generated Answers */}
              {prep.application_answers && Object.keys(prep.application_answers).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-400" />AI-Generated Responses</h4>
                  {Object.entries(prep.application_answers).map(([key, value]) => (
                    <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-indigo-400 uppercase">{key.replace(/_/g, ' ')}</span>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cover Letter */}
              {coverLetter && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" />Cover Letter</h4>
                  <div className="bg-white/5 rounded-lg px-4 py-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {coverLetter}
                  </div>
                </div>
              )}

              {/* Information Gaps */}
              {prep.information_gaps?.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Information Gaps — You may need to fill these manually:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {prep.information_gaps.map((gap, i) => (
                      <span key={i} className="px-2 py-1 rounded text-xs bg-yellow-500/10 text-yellow-300">{gap}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Application URL */}
              {prep.application_url && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-indigo-400" />
                  <div className="flex-1">
                    <p className="text-xs text-indigo-300 font-medium">Application Page</p>
                    <a href={prep.application_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 break-all">
                      {prep.application_url}
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'confirming' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-sm text-gray-400">Saving your application...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <p className="text-lg font-semibold text-white">Application Saved!</p>
              <p className="text-sm text-gray-400 text-center">Your application to {job.company} for {job.title} has been tracked.</p>
              {job.redirect_url && (
                <a href={job.redirect_url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />Complete Application on Website
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all text-sm">
              Cancel
            </button>
            {prep?.application_url && (
              <a href={prep.application_url} target="_blank" rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-cyan-300 font-medium hover:bg-white/10 transition-all text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />Open Page
              </a>
            )}
            <button onClick={handleConfirmApply}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
              <Bookmark className="w-4 h-4" />Save Application
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-6 py-4 border-t border-white/5">
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all text-sm">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================================
//  MAIN JOB SEARCH AGENT COMPONENT
// ============================================================
const JobSearchAgent = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0); // 0=upload, 1=analyzing, 2=searching, 3=matching, 4=results
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [searchQueries, setSearchQueries] = useState([]);
  const [location, setLocation] = useState('India');
  const [targetRole, setTargetRole] = useState('');
  const [applyingJob, setApplyingJob] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const fileInputRef = useRef(null);

  const steps = ['Upload Resume', 'AI Analysis', 'Job Search', 'AI Matching', 'Results'];

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
    setFile(null); setError(''); setProfile(null); setMatchedJobs([]); setCurrentStep(0); setResumeText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runPipeline = async () => {
    if (!file) return;
    setIsLoading(true); setError(''); setCurrentStep(1);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('location', location);
      if (targetRole) formData.append('target_role', targetRole);

      // Step 1-2: Analyzing (show step 1)
      setCurrentStep(1);
      await new Promise(r => setTimeout(r, 500)); // Brief visual feedback

      // Step 2-3: Searching (show step 2)
      setCurrentStep(2);

      // Call the full pipeline endpoint
      const response = await fetch(`${API_URL}/agent/run`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Pipeline failed');

      // Step 3-4: Matching (show step 3)
      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 300));

      // Step 5: Results
      setCurrentStep(4);
      setProfile(data.candidate_profile || {});
      setMatchedJobs(data.matched_jobs || []);
      setSearchQueries(data.search_queries || []);

      if (data.matched_jobs?.length === 0 && data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Make sure FastAPI is running on http://127.0.0.1:8000'
        : err.message
      );
      setCurrentStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (job) => {
    setApplyingJob(job);
  };

  const handleAppTracked = (result) => {
    // Could show a toast notification here
  };

  const resetAll = () => {
    removeFile();
    setCurrentStep(0);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          AI Job Search Agent
        </h2>
        <p className="text-gray-500 mt-1">Upload your resume and let AI find, match, and help you apply to the best jobs.</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* ========== STEP 0: UPLOAD ========== */}
      {currentStep === 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Location & Target Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Job Location</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, India, Remote"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Target Role (optional)</label>
              <div className="relative">
                <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Python Developer, ML Engineer..."
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Quick Role Suggestions */}
          <div>
            <span className="text-xs text-gray-500">Quick roles:</span>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {['Software Engineer', 'Python Developer', 'Data Scientist', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'ML Engineer', 'Data Analyst', 'Mobile Developer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setTargetRole(role)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    targetRole === role
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300 hover:bg-white/10'
                  }`}
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
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
              : file ? 'border-green-500/30 bg-green-500/5 cursor-default'
              : 'border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-white/[0.07]'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${isDragging ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                    <UploadIcon className={`w-8 h-8 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-lg">{isDragging ? 'Drop your resume here!' : 'Drag & drop your resume'}</p>
                    <p className="text-gray-500 text-sm mt-1">or click to browse · PDF only · Max 5MB</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-green-400 font-medium">Resume ready!</p>
                  <p className="text-gray-500 text-sm">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* File Preview + Run Button */}
          <AnimatePresence>
            {file && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB · PDF</p>
                  </div>
                  <button onClick={removeFile} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <button onClick={runPipeline}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)]"
                >
                  <Sparkles className="w-5 h-5" />Find My Best Jobs
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ========== STEPS 1-3: LOADING STATES ========== */}
      {(currentStep >= 1 && currentStep <= 3) && isLoading && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">
                {currentStep === 1 && 'Analyzing your resume with AI...'}
                {currentStep === 2 && 'Searching for matching jobs...'}
                {currentStep === 3 && 'AI is matching and ranking jobs...'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {currentStep === 1 && 'Extracting skills, experience, and target roles'}
                {currentStep === 2 && 'Querying multiple job boards with diverse search terms'}
                {currentStep === 3 && 'Evaluating each job against your complete resume'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && currentStep !== 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== STEP 4: RESULTS ========== */}
      {currentStep === 4 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Card */}
          <CandidateProfileCard profile={profile} />

          {/* Search Queries */}
          {searchQueries.length > 0 && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Search Queries Used</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchQueries.map((q, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{q}</span>
                ))}
              </div>
            </div>
          )}

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xl font-bold text-white">Recommended Jobs</h3>
              <span className="text-sm text-gray-500">({matchedJobs.length} found)</span>
            </div>
            <button onClick={resetAll}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
              <RotateCcw className="w-3.5 h-3.5" />New Search
            </button>
          </div>

          {/* Job Cards */}
          {matchedJobs.length > 0 ? (
            <div className="space-y-4">
              {matchedJobs.map((job, i) => (
                <motion.div
                  key={job.job_id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <JobCard job={job} onApply={handleApply} onResumeFile={file} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No matching jobs found</p>
              <p className="text-sm mt-1">Try a different location or target role</p>
            </div>
          )}

          {/* Powered by Adzuna attribution */}
          <div className="text-center text-xs text-gray-600">
            Job listings powered by <a href="https://www.adzuna.in/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300">Adzuna</a>
          </div>

          {/* New Search Button */}
          <button onClick={resetAll}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all text-sm">
            Upload Another Resume
          </button>
        </motion.div>
      )}

      {/* ========== HOW IT WORKS ========== */}
      {currentStep === 0 && !file && (
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-indigo-400 mb-1">How it works</p>
            <p>Upload Resume → AI analyzes your skills & experience → Searches real jobs with multiple queries → AI matches & ranks every job → Review results → Apply with AI-prepared applications</p>
          </div>
        </div>
      )}

      {/* Application Modal */}
      <AnimatePresence>
        {applyingJob && (
          <ApplicationModal
            job={applyingJob}
            resumeFile={file}
            onClose={() => setApplyingJob(null)}
            onTracked={handleAppTracked}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobSearchAgent;
