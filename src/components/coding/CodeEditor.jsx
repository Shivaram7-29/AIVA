import React from 'react';
import Editor from '@monaco-editor/react';
import { Code2 } from 'lucide-react';

const LANGUAGES = [
  { id: 'python', label: 'Python', monaco: 'python' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp' },
];

const CodeEditor = ({ language, code, onLanguageChange, onCodeChange, disabled }) => {
  const monacoLang = LANGUAGES.find((l) => l.id === language)?.monaco || 'plaintext';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-gray-400">
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-medium">Code Editor</span>
        </div>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="text-xs bg-white/5 border border-white/10 text-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id} className="bg-[#0d1224]">
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          language={monacoLang}
          value={code}
          onChange={(val) => onCodeChange(val ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: disabled,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
export { LANGUAGES };
