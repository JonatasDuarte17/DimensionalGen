import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && validateFile(files[0])) {
      onFileSelect(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (validateFile(e.target.files[0])) {
        onFileSelect(e.target.files[0]);
      }
    }
  };

  const validateFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    // Some browsers return empty string for type on some systems, so we check extension too
    const isExcel = validTypes.includes(file.type) || 
                    file.name.endsWith('.xlsx') || 
                    file.name.endsWith('.xls') || 
                    file.name.endsWith('.xlsm');
    
    if (!isExcel) {
      alert("Por favor, envie um arquivo Excel válido (.xlsx, .xls, .xlsm)");
      return false;
    }
    return true;
  };

  return (
    <div
      onClick={() => !isLoading && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 
        rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${isDragging 
          ? 'border-bw-blue bg-blue-50 scale-[1.01]' 
          : 'border-slate-300 bg-white hover:border-bw-blue hover:bg-slate-50 shadow-sm'
        }
      `}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
        accept=".xlsx, .xls, .xlsm"
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-100'} transition-colors`}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bw-blue"></div>
          ) : (
            <FileSpreadsheet className={`w-8 h-8 ${isDragging ? 'text-bw-blue' : 'text-slate-500 group-hover:text-bw-blue'}`} />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-slate-700">
            {isLoading ? "Processando..." : "Upload do Relatório Dimensional"}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
            Arraste e solte seu arquivo Excel aqui, ou clique para procurar.
          </p>
        </div>
        
        {!isLoading && (
           <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
             <AlertCircle size={12} />
             <span>Suporta .xlsx, .xls, .xlsm</span>
           </div>
        )}
      </div>
    </div>
  );
};

export default Dropzone;