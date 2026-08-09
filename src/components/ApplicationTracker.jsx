import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Building2,
  MapPin,
  ExternalLink,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Bookmark,
  Send,
  FileText,
  MessageSquare,
  Edit3,
  X,
  Check,
  BarChart3,
  Filter,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const STATUS_CONFIG = {
  Saved: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Bookmark },
  Applying: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Send },
  Applied: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle2 },
  Assessment: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Edit3 },
  Interview: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: MessageSquare },
  Rejected: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: X },
  Offer: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: Check },
};

const NEXT_STATUSES = {
  Saved: ['Applying', 'Applied'],
  Applying: ['Applied'],
  Applied: ['Assessment', 'Interview', 'Rejected'],
  Assessment: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Rejected: [],
  Offer: [],
};

// ============================================================
//  APPLICATION CARD
// ============================================================
const AppCard = ({ app, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.Saved;
  const StatusIcon = statusConf.icon;
  const score = app.match_score || 0;
  const scoreColor = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/applications/${app.app_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      onUpdate(app.app_id, data.application);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/applications/${app.app_id}`, { method: 'DELETE' });
      if (res.ok) onDelete(app.app_id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-white truncate">{app.job_title}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
              {app.company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{app.company}</span>}
              {app.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{app.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`px-2.5 py-1 rounded-lg ${statusConf.bg} ${statusConf.border} border flex items-center gap-1.5`}>
              <StatusIcon className={`w-3.5 h-3.5 ${statusConf.color}`} />
              <span className={`text-xs font-medium ${statusConf.color}`}>{app.status}</span>
            </div>
            <div className={`px-2 py-1 rounded text-sm font-bold ${scoreColor}`}>
              {score}%
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Found: {formatDate(app.date_found)}</span>
          {app.date_applied && <span className="flex items-center gap-1"><Send className="w-3 h-3" />Applied: {formatDate(app.date_applied)}</span>}
        </div>
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-3">
              {/* Match Summary */}
              {app.match_summary && (
                <p className="text-sm text-gray-300">{app.match_summary}</p>
              )}

              {/* Matched Skills */}
              {app.matched_skills?.length > 0 && (
                <div>
                  <span className="text-xs text-green-400 font-semibold">Matched Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {app.matched_skills.map((s, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-300">{s}</span>)}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {app.missing_skills?.length > 0 && (
                <div>
                  <span className="text-xs text-red-400 font-semibold">Missing Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {app.missing_skills.map((s, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-300">{s}</span>)}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {app.cover_letter && (
                <div>
                  <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1"><FileText className="w-3 h-3" />Cover Letter</span>
                  <div className="mt-1 bg-white/5 rounded-lg p-3 text-xs text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {app.cover_letter}
                  </div>
                </div>
              )}

              {/* Notes */}
              {app.notes && (
                <div>
                  <span className="text-xs text-amber-400 font-semibold">Notes</span>
                  <p className="text-sm text-gray-300 mt-1">{app.notes}</p>
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

        {app.job_url && (
          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 ml-2">
            <ExternalLink className="w-3.5 h-3.5" />Job Page
          </a>
        )}

        <div className="flex-1" />

        {/* Status Transition Buttons */}
        {NEXT_STATUSES[app.status]?.length > 0 && (
          <div className="flex items-center gap-1.5">
            {NEXT_STATUSES[app.status].map((nextStatus) => {
              const nextConf = STATUS_CONFIG[nextStatus];
              return (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={updating}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${nextConf.bg} ${nextConf.color} border ${nextConf.border} hover:opacity-80 transition-all disabled:opacity-50 flex items-center gap-1`}
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <nextConf.icon className="w-3 h-3" />}
                  {nextStatus}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
//  MAIN APPLICATION TRACKER COMPONENT
// ============================================================
const ApplicationTracker = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchApplications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/applications`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load applications');
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message === 'Failed to fetch'
        ? 'Cannot connect to backend. Make sure FastAPI is running.'
        : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdate = (app_id, updatedApp) => {
    setApplications(prev => prev.map(a => a.app_id === app_id ? updatedApp : a));
  };

  const handleDelete = (app_id) => {
    setApplications(prev => prev.filter(a => a.app_id !== app_id));
  };

  const filteredApps = statusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === statusFilter);

  // Stats
  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'Applied').length,
    interview: applications.filter(a => a.status === 'Interview').length,
    offer: applications.filter(a => a.status === 'Offer').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Application Tracker
          </h2>
          <p className="text-gray-500 mt-1">Track and manage all your job applications in one place.</p>
        </div>
        <button onClick={fetchApplications} disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-white/5' },
          { label: 'Applied', value: stats.applied, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Interview', value: stats.interview, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Offer', value: stats.offer, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border border-white/5 rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500" />
        {['all', 'Saved', 'Applying', 'Applied', 'Assessment', 'Interview', 'Rejected', 'Offer'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              statusFilter === status
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300 hover:bg-white/10'
            }`}
          >
            {status === 'all' ? 'All' : status} {status !== 'all' && `(${applications.filter(a => a.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-400">Loading applications...</p>
        </div>
      )}

      {/* Applications List */}
      {!isLoading && filteredApps.length > 0 && (
        <div className="space-y-4">
          {filteredApps.map((app, i) => (
            <motion.div
              key={app.app_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              <AppCard app={app} onUpdate={handleUpdate} onDelete={handleDelete} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredApps.length === 0 && (
        <div className="text-center py-16">
          <Briefcase className="w-16 h-16 mx-auto text-gray-700 mb-4" />
          <p className="text-lg font-semibold text-gray-400">
            {statusFilter !== 'all' ? `No ${statusFilter} applications` : 'No applications yet'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {statusFilter !== 'all'
              ? 'Try a different filter or apply to jobs from the Job Search Agent.'
              : 'Go to the Job Search Agent to find and apply for jobs.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ApplicationTracker;
