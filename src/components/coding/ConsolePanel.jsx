import React from 'react';
import { Play, Send, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock3 } from 'lucide-react';

const statusMeta = {
  passed: { label: 'Accepted', color: 'text-green-400', icon: CheckCircle2 },
  failed: { label: 'Wrong Answer', color: 'text-red-400', icon: XCircle },
  runtime_error: { label: 'Runtime Error', color: 'text-orange-400', icon: AlertTriangle },
  compilation_error: { label: 'Compilation Error', color: 'text-orange-400', icon: AlertTriangle },
  time_limit_exceeded: { label: 'Time Limit Exceeded', color: 'text-yellow-400', icon: Clock3 },
  partial: { label: 'Partially Correct', color: 'text-yellow-400', icon: AlertTriangle },
  provider_not_configured: { label: 'Execution Unavailable', color: 'text-gray-400', icon: AlertTriangle },
  provider_error: { label: 'Execution Error', color: 'text-orange-400', icon: AlertTriangle },
};

const ConsolePanel = ({ runResult, submitResult, isRunning, isSubmitting, onRun, onSubmit, disabled }) => {
  const activeResult = submitResult || runResult;

  return (
    <div className="h-64 flex-shrink-0 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Console</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={disabled || isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs font-semibold hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Code
          </button>
          <button
            onClick={onSubmit}
            disabled={disabled || isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit Code
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!activeResult && !isRunning && !isSubmitting && (
          <p className="text-xs text-gray-600">Run your code against the sample test cases, or submit for full evaluation.</p>
        )}

        {(isRunning || isSubmitting) && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isSubmitting ? 'Evaluating submission…' : 'Running…'}
          </div>
        )}

        {!isRunning && !isSubmitting && activeResult && (
          <ConsoleResult result={activeResult} isSubmission={!!submitResult} />
        )}
      </div>
    </div>
  );
};

const ConsoleResult = ({ result, isSubmission }) => {
  // Provider-not-configured / provider error shape: { status, message }
  if (result.status === 'provider_not_configured' || result.status === 'provider_error') {
    const meta = statusMeta[result.status];
    const Icon = meta.icon;
    return (
      <div className={`flex items-start gap-2 text-sm ${meta.color}`}>
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{result.message}</span>
      </div>
    );
  }

  if (isSubmission) {
    const meta = statusMeta[result.status] || statusMeta.failed;
    const Icon = meta.icon;
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-sm font-semibold ${meta.color}`}>
          <Icon className="w-4 h-4" />
          {meta.label}
        </div>
        <p className="text-xs text-gray-400">
          {result.test_cases_passed}/{result.total_test_cases} test cases passed &middot; Score: {result.score}/{result.max_score}
        </p>
      </div>
    );
  }

  // Run result shape: { results: [...], passed_count, total_count }
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-1">
        {result.passed_count}/{result.total_count} sample test cases passed
      </p>
      {result.results?.map((r, i) => {
        const meta = statusMeta[r.status] || statusMeta.failed;
        const Icon = meta.icon;
        return (
          <div key={i} className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5 text-xs space-y-1">
            <div className={`flex items-center gap-1.5 font-semibold ${meta.color}`}>
              <Icon className="w-3.5 h-3.5" />
              Test Case {i + 1} — {meta.label}
            </div>
            {r.stdout && (
              <div>
                <span className="text-gray-500">Output: </span>
                <span className="text-gray-300 font-mono">{r.stdout.trim() || '(empty)'}</span>
              </div>
            )}
            {r.expected_output !== null && r.expected_output !== undefined && !r.passed && (
              <div>
                <span className="text-gray-500">Expected: </span>
                <span className="text-gray-300 font-mono">{r.expected_output}</span>
              </div>
            )}
            {r.stderr && (
              <div className="text-red-400/80 font-mono whitespace-pre-wrap">{r.stderr.trim()}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConsolePanel;
