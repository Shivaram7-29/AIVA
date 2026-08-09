import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Award,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code,
  BrainCircuit,
  Wrench,
  Database,
  Layers,
  FolderGit2,
  Target,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// ============================================================
//  SCORE RING — Animated circular progress indicator
// ============================================================
const ScoreRing = ({ score }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10', label: 'Excellent' };
    if (s >= 60) return { stroke: '#3b82f6', text: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Good' };
    if (s >= 40) return { stroke: '#f59e0b', text: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Average' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10', label: 'Needs Work' };
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-3xl font-bold ${color.text}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${color.bg} ${color.text}`}>
        {color.label}
      </span>
    </div>
  );
};

// ============================================================
//  SKILL BADGE
// ============================================================
const SkillBadge = ({ skill, variant = 'default' }) => {
  const styles = {
    default: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
    missing: 'bg-red-500/10 text-red-400 border-red-500/20',
    lang: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    ml: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    tool: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    db: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    other: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
  };

  return (
    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border ${styles[variant] || styles.default}`}>
      {skill}
    </span>
  );
};

// ============================================================
//  COLLAPSIBLE SECTION
// ============================================================
const Section = ({ icon: Icon, title, color, children, defaultOpen = true, badge }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm font-semibold text-white flex-1 text-left">{title}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-medium">{badge}</span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
//  SKILL CATEGORY ROW — renders a labeled row of skill badges
// ============================================================
const SkillCategory = ({ icon: Icon, label, skills, variant, color }) => {
  if (!skills || skills.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2 ml-6">
        {skills.map((skill, i) => (
          <SkillBadge key={i} skill={skill} variant={variant} />
        ))}
      </div>
    </div>
  );
};

// ============================================================
//  MAIN UPLOAD COMPONENT
// ============================================================
const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [targetRole, setTargetRole] = useState('Machine Learning Engineer');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files[0]); };
  const handleFileSelect = (e) => validateAndSetFile(e.target.files[0]);

  const validateAndSetFile = (selectedFile) => {
    setError(''); setAnalysis(null);
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; }
    if (selectedFile.size > 5 * 1024 * 1024) { setError('File size must be under 5MB.'); return; }
    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null); setError(''); setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const copyAnalysis = () => {
    navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Count total skills
  const getTotalSkills = (skills) => {
    if (!skills) return 0;
    if (Array.isArray(skills)) return skills.length;
    return Object.values(skills).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  };

  // ---------- API CALL ----------
  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true); setError(''); setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // IMPORTANT: backend reads target_role as a Form field, NOT a query param
      formData.append('target_role', targetRole);

      const response = await fetch(
        `${API_URL}/analyze`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Something went wrong.');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Make sure FastAPI is running on http://127.0.0.1:8000'
        : err.message
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper: Get role_fit color
  const getRoleFitStyle = (fit) => {
    if (!fit) return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' };
    const lower = fit.toLowerCase();
    if (lower.includes('strong')) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
    if (lower.includes('moderate')) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" />
          Resume Analyzer
        </h2>
        <p className="text-gray-500 mt-1">Upload your resume and get recruiter-level AI analysis.</p>
      </div>

      {/* Target Role — Free text input with quick suggestions */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Target Job Role</label>
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="e.g. Software Engineer, Data Analyst, Product Manager..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {['Software Engineer', 'Data Scientist', 'Full Stack Developer', 'ML Engineer', 'Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'Data Analyst', 'Product Manager', 'Cybersecurity Analyst', 'Cloud Engineer', 'Mobile Developer'].map((role) => (
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
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
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
              <p className="text-green-400 font-medium">File ready for analysis!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview */}
      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{file.name}</p>
              <p className="text-gray-500 text-sm">{formatSize(file.size)} · PDF</p>
            </div>
            <button onClick={removeFile} className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button */}
      <AnimatePresence>
        {file && !analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <button onClick={handleAnalyze} disabled={isAnalyzing}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.25)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Analyzing with AI...</>
              ) : (
                <><Sparkles className="w-5 h-5" />Analyze Resume</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== AI ANALYSIS RESULTS ========== */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="space-y-5"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xl font-bold text-white">AI Analysis Results</h3>
              </div>
              <button onClick={copyAnalysis}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {/* Score + Summary + Role Fit */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ScoreRing score={analysis.score} />
                <div className="flex-1 text-center md:text-left space-y-3">
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    Target: {targetRole}
                  </p>
                  <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>

                  {/* Role Fit Badge */}
                  {analysis.role_fit && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${getRoleFitStyle(analysis.role_fit).bg} ${getRoleFitStyle(analysis.role_fit).border}`}>
                      <Target className={`w-4 h-4 ${getRoleFitStyle(analysis.role_fit).text}`} />
                      <span className={`text-sm font-medium ${getRoleFitStyle(analysis.role_fit).text}`}>
                        {analysis.role_fit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categorized Skills */}
            <Section
              icon={Award}
              title="Detected Skills"
              color="text-indigo-400"
              badge={`${getTotalSkills(analysis.skills)} found`}
            >
              {typeof analysis.skills === 'object' && !Array.isArray(analysis.skills) ? (
                <div className="space-y-4">
                  <SkillCategory icon={Code} label="Programming Languages" skills={analysis.skills.programming_languages} variant="lang" color="text-blue-400" />
                  <SkillCategory icon={BrainCircuit} label="ML / AI" skills={analysis.skills.ml_ai} variant="ml" color="text-purple-400" />
                  <SkillCategory icon={Wrench} label="Tools & Frameworks" skills={analysis.skills.tools_frameworks} variant="tool" color="text-cyan-400" />
                  <SkillCategory icon={Database} label="Databases" skills={analysis.skills.databases} variant="db" color="text-amber-400" />
                  <SkillCategory icon={Layers} label="Others" skills={analysis.skills.others} variant="other" color="text-gray-400" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(analysis.skills) ? analysis.skills : []).map((s, i) => (
                    <SkillBadge key={i} skill={s} />
                  ))}
                </div>
              )}
            </Section>

            {/* Missing Skills */}
            <Section icon={TrendingDown} title="High-Impact Missing Skills" color="text-red-400"
              badge={`${analysis.missing_skills?.length || 0} gaps`}
            >
              <div className="flex flex-wrap gap-2">
                {analysis.missing_skills?.map((skill, i) => (
                  <SkillBadge key={i} skill={skill} variant="missing" />
                ))}
              </div>
            </Section>

            {/* Strengths */}
            <Section icon={TrendingUp} title="Key Strengths" color="text-green-400"
              badge={`${analysis.strengths?.length || 0}`}
            >
              <ul className="space-y-3">
                {analysis.strengths?.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Suggestions */}
            <Section icon={Lightbulb} title="Actionable Suggestions" color="text-yellow-400"
              badge={`${analysis.suggestions?.length || 0}`}
            >
              <ul className="space-y-3">
                {analysis.suggestions?.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-300">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Project Feedback */}
            {analysis.project_feedback && analysis.project_feedback.length > 0 && (
              <Section icon={FolderGit2} title="Project Feedback" color="text-cyan-400"
                badge={`${analysis.project_feedback.length}`}
              >
                <ul className="space-y-3">
                  {analysis.project_feedback.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                      <FolderGit2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={removeFile}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all">
                Upload Another Resume
              </button>
              <button onClick={() => navigate('/dashboard/aptitude')}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
                Start Aptitude Test →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How It Works */}
      {!analysis && !isAnalyzing && (
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-indigo-400 mb-1">How it works</p>
            <p>Upload your resume → Select target role → AI analyzes it → Get score, categorized skills, missing gaps, strengths, actionable suggestions, and project feedback.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;