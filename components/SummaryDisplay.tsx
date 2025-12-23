import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, RefreshCcw, FileText } from 'lucide-react';

interface SummaryDisplayProps {
  summary: string;
  fileName: string;
  onReset: () => void;
}

export const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary, fileName, onReset }) => {
  
  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-${fileName.replace('.pdf', '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white border border-slate-200 rounded-lg text-brand-600">
                <FileText size={20} />
            </div>
            <div>
                <h2 className="text-sm font-semibold text-slate-800">Resumo Gerado</h2>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{fileName}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <RefreshCcw size={16} />
            <span className="hidden sm:inline">Novo Arquivo</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download .md</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="prose prose-slate prose-lg max-w-none prose-headings:text-brand-900 prose-a:text-brand-600">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
