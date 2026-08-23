import React from 'react';
import { CheckCircle2, Circle, Send } from 'lucide-react';

const diffColor = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-red-400',
};

// status per question: 'unanswered' | 'answered' | 'submitted'
const ProblemList = ({ questions, currentId, statusByQuestion, onSelect }) => {
  const answeredCount = Object.values(statusByQuestion).filter((s) => s !== 'unanswered').length;
  const submittedCount = Object.values(statusByQuestion).filter((s) => s === 'submitted').length;

  return (
    <div className="w-64 flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-xl p-4 flex flex-col">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Questions</p>

      <div className="space-y-1.5 overflow-y-auto flex-1">
        {questions.map((q, i) => {
          const status = statusByQuestion[q.id] || 'unanswered';
          const isCurrent = q.id === currentId;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(q.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                isCurrent
                  ? 'bg-indigo-500/15 border-indigo-500/40'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
              }`}
            >
              <span className="mt-0.5 flex-shrink-0">
                {status === 'submitted' ? (
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                ) : status === 'answered' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-600" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-gray-200 truncate">
                  {i + 1}. {q.title}
                </span>
                <span className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${diffColor[q.difficulty] || 'text-gray-500'}`}>
                    {q.difficulty}
                  </span>
                  <span className="text-xs text-gray-600">{q.topic}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Progress</span>
          <span className="text-green-400 font-bold">
            {answeredCount}/{questions.length}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
          <span className="flex items-center gap-1">
            <Send className="w-3 h-3 text-indigo-400" /> {submittedCount} submitted
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProblemList;
