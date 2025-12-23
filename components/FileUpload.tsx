import React, { useState, useRef } from 'react';
import { FolderOpen, AlertCircle, HardDrive, UploadCloud } from 'lucide-react';
import { LibraryEntry } from '../types';
import { processHandle, processFileList } from '../utils/fileSystem';

interface FileUploadProps {
  onEntriesLoaded: (entries: LibraryEntry[]) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onEntriesLoaded, disabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for the fallback input element
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Native Directory Picker ---
  const handleDirectoryPick = async () => {
    setError(null);
    setIsLoading(true);

    try {
      let successViaHandle = false;

      // Check for iframe environment which blocks File System Access API
      const isIframe = (() => {
        try {
          return window.self !== window.top;
        } catch (e) {
          return true;
        }
      })();

      // Only attempt showDirectoryPicker if NOT in an iframe
      // @ts-ignore
      if (!isIframe && typeof window.showDirectoryPicker === 'function') {
         try {
            // @ts-ignore
            const dirHandle = await window.showDirectoryPicker({
              id: 'rpg-library',
              mode: 'readwrite' 
            });

            const entries = await processHandle(dirHandle);
            
            if (entries.length === 0) {
              throw new Error("Nenhum arquivo PDF encontrado nesta pasta ou subpastas.");
            } else {
              onEntriesLoaded(entries);
              successViaHandle = true;
            }
         } catch (nativeErr: any) {
            // AbortError means user closed the dialog manually
            if (nativeErr.name === 'AbortError') {
              setIsLoading(false);
              return;
            }
            
            // Log security errors but continue to fallback
            console.warn("Acesso nativo ao sistema de arquivos falhou ou foi cancelado. Usando fallback.", nativeErr);
         }
      } else if (isIframe) {
          console.log("Ambiente Iframe detectado: pulando tentativa de File System Access API para evitar erros.");
      }

      // Fallback: Use standard <input> if native handle failed, isn't available, or we are in an iframe
      if (!successViaHandle) {
        if (inputRef.current) {
          // Clear value to ensure change event fires even if same directory selected
          inputRef.current.value = '';
          inputRef.current.click();
        } else {
          throw new Error("Input de arquivo não disponível.");
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao ler diretório.");
    } finally {
      // Ensure loading state is reset. 
      // If falling back to input, this stops the 'initial' spinner. 
      // The input's onChange will restart loading if files are selected.
      setIsLoading(false);
    }
  };

  // --- Drag and Drop Handlers (With Handle Support) ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const entries: LibraryEntry[] = [];
      const items = e.dataTransfer.items;

      if (items) {
        // Modern Way: getAsFileSystemHandle (Supports Write Access if supported)
        const promises: Promise<LibraryEntry[]>[] = [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          // @ts-ignore
          if (typeof item.getAsFileSystemHandle === 'function') {
            try {
              // @ts-ignore
              const handlePromise = item.getAsFileSystemHandle().then(handle => {
                if (handle) {
                  return processHandle(handle);
                }
                return [];
              });
              promises.push(handlePromise);
            } catch (e) {
               console.warn("Failed to get handle from item", e);
            }
          } else if (item.kind === 'file') {
             // Fallback for items that are files but browser doesn't support getAsFileSystemHandle
             const file = item.getAsFile();
             if (file) {
                // Wrap as list to reuse fallback logic
                const list = new DataTransfer();
                list.items.add(file);
                const fallbackEntries = processFileList(list.files);
                entries.push(...fallbackEntries);
             }
          }
        }

        const results = await Promise.all(promises);
        results.forEach(res => entries.push(...res));
      } else {
        // Legacy Drop
        entries.push(...processFileList(e.dataTransfer.files));
      }

      if (entries.length === 0) {
        setError("Nenhum PDF encontrado nos itens soltos.");
      } else {
        onEntriesLoaded(entries);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao processar arquivos arrastados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    if (e.target.files && e.target.files.length > 0) {
      const entries = processFileList(e.target.files);
      if (entries.length === 0) {
        setError("Nenhum arquivo PDF encontrado.");
      } else {
        onEntriesLoaded(entries);
      }
    }
    setIsLoading(false);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleInputFiles}
        // @ts-ignore
        webkitdirectory=""
        directory="" 
      />

      <div
        onClick={!disabled && !isLoading ? handleDirectoryPick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ease-in-out
          flex flex-col items-center justify-center text-center
          ${isDragging 
            ? 'border-brand-500 bg-brand-50 scale-[1.02] shadow-lg' 
            : isLoading
              ? 'border-brand-300 bg-brand-50 cursor-wait'
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50 bg-white'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        `}
      >
        <div className={`
          p-4 rounded-full mb-4 transition-colors duration-300
          ${isDragging ? 'bg-brand-500 text-white' : isLoading ? 'bg-brand-100 animate-pulse text-brand-600' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-500'}
        `}>
          {isLoading ? <HardDrive size={32} /> : isDragging ? <UploadCloud size={32} /> : <FolderOpen size={32} />}
        </div>

        <h3 className="text-lg font-semibold text-slate-700 mb-1">
          {isLoading ? 'Lendo arquivos...' : isDragging ? 'Solte para carregar' : 'Selecionar Pasta ou Arrastar'}
        </h3>
        <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
          Clique para selecionar a pasta raiz ou <span className="font-semibold text-brand-600">arraste pastas e arquivos</span> aqui.
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-fade-in">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-[10px] text-slate-400 max-w-md mx-auto">
           Para renomear arquivos automaticamente, use o Chrome/Edge e aceite a permissão de edição quando solicitado, ou arraste os arquivos para esta área.
        </p>
      </div>
    </div>
  );
};