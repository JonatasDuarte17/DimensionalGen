import React from 'react';
import { Download, CheckCircle, XCircle, BarChart3, RefreshCw } from 'lucide-react';
import { ProcessedResult } from '../types';

interface ResultsSummaryProps {
  result: ProcessedResult;
  onDownload: () => void;
  onReset: () => void;
}

const ResultsSummary: React.FC<ResultsSummaryProps> = ({ result, onDownload, onReset }) => {
  return (
    <div className="w-full animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-green-50 p-6 border-b border-green-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-full">
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-900">Processamento Concluído</h3>
              <p className="text-sm text-green-700">{result.fileName}</p>
            </div>
          </div>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm active:transform active:scale-95"
          >
            <Download size={18} />
            Baixar Arquivo Modificado
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-6 flex flex-col items-center text-center">
            <span className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Total Processado</span>
            <span className="text-4xl font-bold text-slate-800">{result.stats.processedCells}</span>
            <span className="text-xs text-slate-400 mt-1">Células nas colunas selecionadas</span>
          </div>

          <div className="p-6 flex flex-col items-center text-center bg-blue-50/30">
            <span className="text-blue-600 text-sm font-medium uppercase tracking-wider mb-2">Gerados OK (In Spec)</span>
            <span className="text-4xl font-bold text-blue-700">{result.stats.inSpecCount}</span>
            <span className="text-xs text-blue-400 mt-1">Valores randomizados dentro dos limites</span>
          </div>

          <div className="p-6 flex flex-col items-center text-center bg-red-50/30">
            <span className="text-red-600 text-sm font-medium uppercase tracking-wider mb-2">Mantidos NOK (Out Spec)</span>
            <span className="text-4xl font-bold text-red-700">{result.stats.outOfSpecCount}</span>
            <span className="text-xs text-red-400 mt-1">Alterados, mas mantidos reprovados</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} />
          Processar Outro Arquivo
        </button>
      </div>
    </div>
  );
};

export default ResultsSummary;