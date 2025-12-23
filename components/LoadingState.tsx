import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  fileName: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ fileName }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-brand-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-white p-4 rounded-full shadow-md border border-slate-100">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Analisando Documento</h3>
      <p className="text-slate-500 max-w-md">
        A Inteligência Artificial está lendo e resumindo <strong>{fileName}</strong>. Isso pode levar alguns segundos dependendo do tamanho do arquivo.
      </p>
    </div>
  );
};
