import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building2, MapPin, ExternalLink, RefreshCw, Trash2, Loader2,
  AlertCircle, ChevronDown, ChevronUp, Clock, Bookmark, Send, FileText,
  MessageSquare, Edit3, X, Check, Filter,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from './ui';
import { extractError } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* Monochrome status config — dots + labels, no bright colors */
const STATUS_CONFIG = {
  Saved:       { dot: 'rgba(255,255,255,0.3)',  icon: Bookmark },
  Applying:    { dot: 'rgba(255,255,255,0.5)',  icon: Send },
  Applied:     { dot: 'rgba(255,255,255,0.6)',  icon: Check },
  Assessment:  { dot: 'rgba(255,255,255,0.5)',  icon: Edit3 },
  Interview:   { dot: 'rgba(255,255,255,0.8)',  icon: MessageSquare },
  Submitted:   { dot: '#FFFFFF',                icon: Send },
  'Submitted - Verification Required': { dot: 'rgba(255,255,255,0.7)', icon: AlertCircle },
  Failed:      { dot: 'rgba(255,255,255,0.2)',  icon: AlertCircle },
  Rejected:    { dot: 'rgba(255,255,255,0.2)',  icon: X },
  Offer:       { dot: '#FFFFFF',                icon: Check },
};

const NEXT_STATUSES = {
  Saved: ['Applying', 'Applied'],
  Applying: ['Applied'],
  Applied: ['Assessment', 'Interview', 'Rejected'],
  Assessment: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Submitted: [],
  'Submitted - Verification Required': [],
  Failed: [],
  Rejected: [],
  Offer: [],
};

/* ── App Card ──────────────────────────────────────────────── */
const AppCard = ({ app, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.Saved;
  const StatusIcon = statusConf.icon;
  const score = app.match_score || 0;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/applications/${app.app_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data));
      onUpdate(app.app_id, data.application);
    } catch (err) { console.error('Status update failed:', err); }
    finally { setUpdating(false); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/applications/${app.app_id}`, { method: 'DELETE' });
      if (res.ok) onDelete(app.app_id);
    } catch (err) { console.error('Delete failed:', err); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  return (
    <div className="vex-card overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-medium text-white truncate tracking-tight">{app.job_title}</h4>
            <div className="flex items-center gap-3 mt-1 text-[12px] text-white/40 flex-wrap">
              {app.company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />{app.company}</span>}
              {app.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />{app.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="status-dot" style={{ background: statusConf.dot }} />
              <span className="text-[11px] font-medium text-white/70">{app.status}</span>
            </div>
            <div className="text-[14px] font-medium text-white">{score}%</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-white/30">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.5} />Found: {formatDate(app.date_found)}</span>
          {app.date_applied && <span className="flex items-center gap-1"><Send className="w-3 h-3" strokeWidth={1.5} />Applied: {formatDate(app.date_applied)}</span>}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {app.match_summary && <p className="text-[13px] text-white/60 leading-relaxed">{app.match_summary}</p>}
              {app.matched_skills?.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Matched Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">{app.matched_skills.map((s, i) => <span key={i} className="skill-pill">{s}</span>)}</div>
                </div>
              )}
              {app.missing_skills?.length > 0 && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Missing Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">{app.missing_skills.map((s, i) => <span key={i} className="skill-pill-missing">{s}</span>)}</div>
                </div>
              )}
              {app.cover_letter && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase flex items-center gap-1"><FileText className="w-3 h-3" />Cover Letter</span>
                  <div className="mt-1 rounded-lg p-3 text-[12px] text-white/60 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)' }}>{app.cover_letter}</div>
                </div>
              )}
              {app.notes && (
                <div>
                  <span className="text-[11px] text-white/40 font-medium uppercase">Notes</span>
                  <p className="text-[13px] text-white/60 mt-1">{app.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
        <button onClick={() => setExpanded(!expanded)} className="text-[12px] text-white/50 hover:text-white flex items-center gap-1 transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less' : 'Details'}
        </button>
        {app.job_url && (
          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-white/60 hover:text-white flex items-center gap-1 ml-2 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />Job Page
          </a>
        )}
        <div className="flex-1" />
        {NEXT_STATUSES[app.status]?.length > 0 && (
          <div className="flex items-center gap-1.5">
            {NEXT_STATUSES[app.status].map((nextStatus) => {
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={updating}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/70 hover:text-white flex items-center gap-1 disabled:opacity-50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <StatusIcon className="w-3 h-3" strokeWidth={2} />}
                  {nextStatus}
                </button>
              );
            })}
          </div>
        )}
        <button onClick={handleDelete} className="p-1.5 rounded-lg text-white/30 hover:text-white transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

/* ── MAIN ───────────────────────────────────────────────────── */
const ApplicationTracker = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchApplications = async () => {
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/applications`);
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Failed to load applications'));
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot connect to backend. Make sure FastAPI is running.' : err.message);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleUpdate = (app_id, updatedApp) => setApplications((prev) => prev.map((a) => (a.app_id === app_id ? updatedApp : a)));
  const handleDelete = (app_id) => setApplications((prev) => prev.filter((a) => a.app_id !== app_id));

  const filteredApps = statusFilter === 'all' ? applications : applications.filter((a) => a.status === statusFilter);

  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === 'Applied').length,
    interview: applications.filter((a) => a.status === 'Interview').length,
    offer: applications.filter((a) => a.status === 'Offer').length,
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      <PageHeader
        kicker="Applications"
        title="Your applications."
        subtitle="Track every opportunity from application to outcome."
        actions={
          <button onClick={fetchApplications} disabled={isLoading} className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Applied" value={stats.applied} />
        <StatCard label="Interview" value={stats.interview} />
        <StatCard label="Offer" value={stats.offer} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-white/30" strokeWidth={1.5} />
        {['all', 'Saved', 'Applying', 'Applied', 'Assessment', 'Interview', 'Submitted', 'Submitted - Verification Required', 'Failed', 'Rejected', 'Offer'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className="text-[12px] px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: statusFilter === status ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: statusFilter === status ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${statusFilter === status ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {status === 'all' ? 'All' : status}{' '}
            {status !== 'all' && `(${applications.filter((a) => a.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <AlertCircle className="w-4 h-4 text-white/70" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-white">Couldn't load applications</p>
              <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{error}</p>
              <button onClick={fetchApplications} className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/80 hover:text-white px-2.5 py-1 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <RefreshCw className="w-3 h-3" strokeWidth={2} /> Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
          <p className="text-[13px] text-white/40">Loading applications…</p>
        </div>
      )}

      {/* List */}
      {!isLoading && filteredApps.length > 0 && (
        <div className="space-y-3">
          {filteredApps.map((app, i) => (
            <motion.div key={app.app_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02, duration: 0.25 }}>
              <AppCard app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredApps.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={statusFilter !== 'all' ? `No ${statusFilter} applications` : 'No applications yet'}
          description={statusFilter !== 'all' ? 'Try a different filter or apply to jobs from the Job Search Agent.' : 'Go to the Job Search Agent to find and apply for jobs.'}
        />
      )}
    </div>
  );
};

export default ApplicationTracker;
