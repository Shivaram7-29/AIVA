import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle2, XCircle, Circle, Clock, RotateCcw } from 'lucide-react';

const statusStyle = {
  passed: { label: 'Accepted', color: 'text-green-400', icon: CheckCircle2 },
  partial: { label: 'Partial', color: 'text-yellow-400', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-400', icon: XCircle },
  runtime_error: { label: 'Runtime Error', color: 'text-orange-400', icon: XCircle },
  compilation_error: { label: 'Compilation Error', color: 'text-orange-400', icon: XCircle },
  time_limit_exceeded: { label: 'Time Limit Exceeded', color: 'text-yellow-400', icon: XCircle },
  not_attempted: { label: 'Not Attempted', color: 'text-gray-500', icon: Circle },
};

const formatTime = (seconds) => {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const CodingResult = ({ result, onRestart }) => {
  const pct = result.max_possible_score
    ? Math.round((result.total_score / result.max_possible_score) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-6">
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
            pct >= 70 ? 'bg-green-500/20' : pct >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20'
          }`}
        >
          <Trophy className={`w-10 h-10 ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <h2 className="text-2xl font-bold text-white">Coding Round Complete!</h2>
        <p className="text-gray-400">Here's how you performed</p>
      </motion.div>

      {/* Score Summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className={`text-3xl font-bold ${pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {result.total_score}/{result.max_possible_score}
            </p>
            <p className="text-xs text-gray-500 mt-1">Score</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-indigo-400">{pct}%</p>
            <p className="text-xs text-gray-500 mt-1">Percentage</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{result.questions_attempted}/{result.questions_total}</p>
            <p className="text-xs text-gray-500 mt-1">Attempted</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">{result.questions_completed}</p>
            <p className="text-xs text-gray-500 mt-1">Fully Solved</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-white/5 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          Time taken: {formatTime(result.time_taken_seconds)}
        </div>
      </div>

      {/* Question-wise Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Question-wise Performance</h3>
        {result.question_results.map((q, i) => {
          const meta = statusStyle[q.status] || statusStyle.not_attempted;
          const Icon = meta.icon;
          return (
            <div
              key={q.question_id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">
                    {i + 1}. {q.title}
                  </p>
                  <p className={`text-xs ${meta.color}`}>{meta.label}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-white">{q.score}/{q.max_score}</p>
                <p className="text-xs text-gray-500">{q.test_cases_passed}/{q.total_test_cases} tests</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onRestart}
        className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" /> Back to Dashboard
      </button>
    </div>
  );
};

export default CodingResult;
