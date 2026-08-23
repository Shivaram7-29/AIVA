import React from 'react';
import { Loader2 } from 'lucide-react';

const diffColor = {
  Easy: 'text-green-400 bg-green-500/10',
  Medium: 'text-yellow-400 bg-yellow-500/10',
  Hard: 'text-red-400 bg-red-500/10',
};

const ProblemPanel = ({ problem, loading }) => {
  if (loading || !problem) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto pr-1">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${diffColor[problem.difficulty] || 'text-gray-400 bg-white/5'}`}>
            {problem.difficulty}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/5 text-gray-400">
            {problem.topic}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/5 text-gray-500">
            {problem.max_score} pts
          </span>
        </div>
        <h2 className="text-xl font-bold text-white">{problem.title}</h2>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{problem.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Input Format</p>
          <p className="text-sm text-gray-300 whitespace-pre-line">{problem.input_format}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Output Format</p>
          <p className="text-sm text-gray-300 whitespace-pre-line">{problem.output_format}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Constraints</p>
        <p className="text-sm text-gray-300 whitespace-pre-line font-mono">{problem.constraints}</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Examples</p>
        {(problem.examples || []).map((ex, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">Input</p>
              <pre className="text-xs text-gray-200 font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{ex.input}</pre>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Output</p>
              <pre className="text-xs text-gray-200 font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">{ex.output}</pre>
            </div>
            {ex.explanation && (
              <p className="text-xs text-gray-500">{ex.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProblemPanel;
