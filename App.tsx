import React, { useState } from 'react';
import { Settings, Info, Columns } from 'lucide-react';
import Dropzone from './components/Dropzone';
import ResultsSummary from './components/ResultsSummary';
import { processExcelBuffer } from './services/excelService';
import { AppState, ProcessedResult } from './types';

// Mapping user-friendly names to 0-based index
const AVAILABLE_COLUMNS = [
  { label: 'Coluna E', index: 4 },
  { label: 'Coluna F', index: 5 },
  { label: 'Coluna G', index: 6 },
  { label: 'Coluna H', index: 7 },
];

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Default selected columns: E, F, G (Indices 4, 5, 6)
  const [selectedColIndices, setSelectedColIndices] = useState<number[]>([4, 5, 6]);

  const toggleColumn = (index: number) => {
    setSelectedColIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleFileSelect = async (file: File) => {
    if (selectedColIndices.length === 0) {
      setErrorMsg("Por favor, selecione pelo menos uma coluna para processar.");
      setAppState(AppState.ERROR);
      return;
    }

    setAppState(AppState.PROCESSING);
    setErrorMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Artificial delay for UX perception processing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { buffer, stats } = await processExcelBuffer(arrayBuffer, selectedColIndices);
      
      setResult({
        fileName: file.name,
        data: buffer,
        stats
      });
      setAppState(AppState.COMPLETED);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Falha ao processar o arquivo. Verifique se ele segue o modelo padrão.");
      setAppState(AppState.ERROR);
    }
  };

  const downloadFile = () => {
    if (!result) return;
    
    const blob = new Blob([result.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    
    const nameParts = result.fileName.split('.');
    const ext = nameParts.pop();
    const newName = `${nameParts.join('.')}_Gerado.${ext}`;
    
    anchor.download = newName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-bw-blue w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-lg shadow-sm">
              D
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              Dimensional<span className="text-bw-blue">Gen</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
             <span className="hidden sm:inline">v1.1.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-12 px-4 sm:px-6">
        <div className="w-full max-w-3xl">
          
          {/* Header Section */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Gerador de Relatórios Dimensionais
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Faça upload do seu relatório. O sistema gera automaticamente valores aleatórios dentro das tolerâncias e corrige valores fora de especificação de forma inteligente.
            </p>
          </div>

          {/* Info Card - Rules Explanation */}
          {appState === AppState.IDLE && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex gap-4 items-start shadow-sm">
                <div className="bg-blue-100 p-2 rounded-full text-bw-blue shrink-0 mt-0.5">
                  <Info size={20} />
                </div>
                <div className="text-sm text-slate-700 space-y-2">
                  <p className="font-semibold text-bw-blue">Como funciona:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Detecta Nominal, Tolerância Máxima (UT) e Mínima (LT) nas colunas B, C, D.</li>
                    <li>Escaneia as colunas selecionadas abaixo.</li>
                    <li><strong>Valores Dentro da Especificação:</strong> Randomizados para permanecer dentro da tolerância.</li>
                    <li><strong>Valores Fora da Especificação:</strong> Último dígito decimal alterado, mas mantidos estritamente <span className="font-semibold text-red-600">fora da tolerância</span> (Status Reprovado preservado).</li>
                  </ul>
                </div>
              </div>

              {/* Column Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <Columns size={18} className="text-bw-blue" />
                  <h3 className="font-semibold">Selecione as colunas para processar:</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {AVAILABLE_COLUMNS.map((col) => {
                    const isSelected = selectedColIndices.includes(col.index);
                    return (
                      <label 
                        key={col.index} 
                        className={`
                          flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer border transition-all select-none
                          ${isSelected 
                            ? 'bg-blue-50 border-bw-blue text-bw-blue font-medium' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-bw-blue focus:ring-bw-blue accent-bw-blue"
                          checked={isSelected}
                          onChange={() => toggleColumn(col.index)}
                        />
                        {col.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Action Area */}
          <div className="mb-12">
            {appState === AppState.COMPLETED && result ? (
              <ResultsSummary 
                result={result} 
                onDownload={downloadFile} 
                onReset={resetApp} 
              />
            ) : (
              <div className="bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
                <Dropzone 
                  onFileSelect={handleFileSelect} 
                  isLoading={appState === AppState.PROCESSING} 
                />
              </div>
            )}

            {/* Error Message */}
            {appState === AppState.ERROR && (
              <div className="mt-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-100 flex items-center justify-center gap-2 animate-fade-in">
                 <span className="font-bold">Erro:</span> {errorMsg}
                 <button onClick={resetApp} className="underline ml-2 text-sm">Tentar Novamente</button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Ferramenta Dimensional Generator. Desenvolvido para Processos de Aprovação de Peças de Produção.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;