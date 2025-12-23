import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BrainCircuit, Sparkles, Loader2, Plus, HardDrive, Upload, RefreshCw } from 'lucide-react';
import { AppState, LibraryEntry, FilterState, RegistryRecord, LogEntry } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { renameFileOnDisk, generateRenameBat } from './utils/fileSystem';
import { analyzeRpgPdf } from './services/geminiService';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  
  // State for Resume/Import feature
  const [registryDB, setRegistryDB] = useState<Map<string, RegistryRecord>>(new Map());
  const [importedCount, setImportedCount] = useState<number>(0);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    section: 'Todas',
    system: 'Todos',
    type: 'Todos',
    search: ''
  });

  // --- Helper to Append Logs ---
  const addLog = (entry: LibraryEntry, action: LogEntry['action'], message: string): LibraryEntry => {
    return {
      ...entry,
      logs: [
        ...(entry.logs || []), 
        { timestamp: new Date().toISOString(), action, message }
      ]
    };
  };

  // --- File Processing Logic (AI Analysis) ---
  const processFile = useCallback(async (entry: LibraryEntry) => {
    if (entry.isManualOverride || entry.status === 'renamed' || entry.status === 'done') return;

    try {
      const base64 = await fileToBase64(entry.file);
      const metadata = await analyzeRpgPdf(base64, entry.originalName);

      // Extract and Pad Edition Number (e.g., "1" -> "001")
      const editionRaw = (metadata.magazine_edition || "000").replace(/\D/g, '');
      const edition = editionRaw.padStart(3, '0');
      
      const slug = (metadata.filename_slug || "Unknown").replace(/[^a-zA-Z0-9_]/g, '');

      // Strict Naming Rule: DB_{Edition}_{Slug}.pdf
      const newName = `DB_${edition}_${slug}.pdf`;

      setLibrary(prev => prev.map(item => {
        if (item.id === entry.id) {
          const updated = addLog(item, 'ANALYZE', `DB ${edition} [${metadata.rpg_system}] (${metadata.content_type}) - ${metadata.official_title}`);
          return { ...updated, status: 'done', metadata, suggestedName: newName };
        }
        return item;
      }));

    } catch (error: any) {
      console.error(`Error processing ${entry.originalName}:`, error);
      setLibrary(prev => prev.map(item => {
        if (item.id === entry.id) {
          const updated = addLog(item, 'ERROR', error.message || "Erro na análise");
          return { ...updated, status: 'error', error: error.message };
        }
        return item;
      }));
    } finally {
      setProcessingQueue(prev => prev.filter(id => id !== entry.id));
    }
  }, []);

  // --- Queue Management (Concurrency optimized to 3) ---
  useEffect(() => {
    const CONCURRENCY_LIMIT = 3;
    const processingCount = library.filter(item => item.status === 'analyzing').length;
    
    if (processingCount < CONCURRENCY_LIMIT) {
      const nextItems = library
        .filter(item => item.status === 'pending' && !processingQueue.includes(item.id))
        .slice(0, CONCURRENCY_LIMIT - processingCount);
      
      if (nextItems.length > 0) {
        const nextIds = nextItems.map(i => i.id);
        setProcessingQueue(prev => [...prev, ...nextIds]);
        
        // Mark as analyzing immediately to prevent double selection in next render
        setLibrary(prev => prev.map(i => nextIds.includes(i.id) ? { ...i, status: 'analyzing' } : i));
        
        // Trigger process
        nextItems.forEach(item => processFile(item));
      }
    }
  }, [library, processingQueue, processFile]);

  // --- Actions: Rename, Manual Edit, Retry, Reset ---

  const handleManualEdit = (id: string, newName: string) => {
    setLibrary(prev => prev.map(item => {
      if (item.id === id) {
        const updated = addLog(item, 'EDIT', `Nome editado manualmente de '${item.suggestedName}' para '${newName}'`);
        return {
          ...updated,
          suggestedName: newName,
          isManualOverride: true,
          status: 'done' 
        };
      }
      return item;
    }));
  };

  const handleSingleRename = async (id: string) => {
    const item = library.find(i => i.id === id);
    if (!item || !item.handle) {
      alert("Arquivo não acessível para escrita.");
      return;
    }

    try {
      await renameFileOnDisk(item);
      setLibrary(prev => prev.map(i => {
        if (i.id === id) {
          const updated = addLog(i, 'RENAME', `Renomeado individualmente para ${i.suggestedName}`);
          return { ...updated, status: 'renamed' };
        }
        return i;
      }));
    } catch (e: any) {
      console.error(`Erro ao renomear ${item.originalName}:`, e);
      alert(`Erro: ${e.message}`);
      setLibrary(prev => prev.map(i => {
        if (i.id === id) return addLog(i, 'ERROR', `Falha ao renomear: ${e.message}`);
        return i;
      }));
    }
  };
  
  const handleRenameBatch = async () => {
    const canRename = library.some(i => i.handle !== null);
    
    if (!canRename) {
      const confirmDownload = window.confirm(
        "⚠️ Modo de Leitura Detectado\n\n" +
        "O navegador bloqueou o acesso de escrita ao disco (comum em iframes, CodeSandbox ou conexões sem HTTPS).\n\n" +
        "Deseja baixar um script (.bat) para renomear os arquivos automaticamente no seu computador?"
      );

      if (confirmDownload) {
          const scriptContent = generateRenameBat(library);
          const blob = new Blob([scriptContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'renomear_dragao_brasil.bat';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Mark visually as processed for better UX
          setLibrary(prev => prev.map(i => {
            if (i.status === 'done') {
                return { ...i, status: 'renamed', logs: [...i.logs, { timestamp: new Date().toISOString(), action: 'RENAME', message: 'Script de renomeação (.bat) gerado.' }] };
            }
            return i;
          }));
      }
      return;
    }

    const toRename = library.filter(i => i.status === 'done' && i.suggestedName !== i.originalName);
    if (toRename.length === 0) return;

    if (!window.confirm(`Isso renomeará ${toRename.length} arquivos permanentemente. Deseja continuar?`)) return;
    
    setIsRenaming(true);

    for (const item of toRename) {
      try {
        await renameFileOnDisk(item);
        
        setLibrary(prev => prev.map(i => {
           if (i.id === item.id) {
             const updated = addLog(i, 'RENAME', `Renomeado em lote para ${i.suggestedName}`);
             return { ...updated, status: 'renamed' };
           }
           return i;
        }));

      } catch (e: any) {
        console.error(`Falha ao renomear ${item.originalName}:`, e);
        setLibrary(prev => prev.map(i => {
           if (i.id === item.id) {
             return addLog(i, 'ERROR', `Falha ao renomear: ${e.message}`);
           }
           return i;
        }));
      }
    }
    setIsRenaming(false);
  };

  // New handler for Python script download status update
  const handlePythonDownloadMarkAsRenamed = () => {
      setLibrary(prev => prev.map(i => {
        if (i.status === 'done') {
            return { 
                ...i, 
                status: 'renamed', 
                logs: [...i.logs, { timestamp: new Date().toISOString(), action: 'RENAME', message: 'Script Python gerado para renomeação.' }] 
            };
        }
        return i;
      }));
  };

  const handleRetryErrors = () => {
    setLibrary(prev => prev.map(item => 
      item.status === 'error' 
        ? { ...item, status: 'pending', error: undefined, logs: [...item.logs, { timestamp: new Date().toISOString(), action: 'RESTORE', message: 'Tentativa de reprocessamento.'}] } 
        : item
    ));
  };

  const handleReset = () => {
    if (!window.confirm("Isso limpará toda a lista atual. Deseja continuar?")) return;
    setLibrary([]);
    setProcessingQueue([]);
    setRegistryDB(new Map());
    setImportedCount(0);
    setAppState(AppState.IDLE);
    setFilters({ section: 'Todas', system: 'Todos', type: 'Todos', search: '' });
  };

  // --- Resume / Import Logic ---
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const newRegistry = new Map<string, RegistryRecord>();
          json.forEach((record: RegistryRecord) => {
             if (record.fingerprint) {
                newRegistry.set(record.fingerprint, record);
             }
          });
          setRegistryDB(newRegistry);
          setImportedCount(newRegistry.size);
        } else {
          alert("Banco de dados JSON inválido.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleEntriesLoaded = (freshEntries: LibraryEntry[]) => {
    const dbByFilename = new Map<string, RegistryRecord>();
    registryDB.forEach(record => {
      if (record.currentName) {
        dbByFilename.set(record.currentName, record);
      }
    });

    const mergedEntries = freshEntries.map(entry => {
        // PRIORITY 1: Exact Fingerprint Match
        const fpRecord = registryDB.get(entry.fingerprint);
        if (fpRecord) {
            return {
              ...entry,
              status: fpRecord.status === 'renamed' ? 'renamed' : 'done',
              metadata: fpRecord.metadata,
              suggestedName: fpRecord.currentName,
              isManualOverride: fpRecord.isManualOverride,
              logs: [...(fpRecord.logs || []), { timestamp: new Date().toISOString(), action: 'RESTORE', message: 'Registro recuperado (Fingerprint).' }]
            } as LibraryEntry;
        }

        // PRIORITY 2: Filename Match
        const nameRecord = dbByFilename.get(entry.originalName);
        if (nameRecord) {
           return {
             ...entry,
             status: 'renamed', 
             metadata: nameRecord.metadata,
             suggestedName: nameRecord.currentName,
             isManualOverride: nameRecord.isManualOverride,
             logs: [...(nameRecord.logs || []), { timestamp: new Date().toISOString(), action: 'RESTORE', message: 'Registro recuperado (Nome de Arquivo).' }]
           } as LibraryEntry;
        }

        // New File
        return entry;
    });

    setLibrary(prev => [...prev, ...mergedEntries]);
    setAppState(AppState.DASHBOARD);
  };

  // --- Render Helpers ---

  const processingCount = library.filter(i => i.status === 'pending' || i.status === 'analyzing').length;
  const progressPercent = library.length > 0 
    ? ((library.length - processingCount) / library.length) * 100 
    : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      
      <input 
        type="file" 
        accept=".json" 
        ref={importInputRef} 
        className="hidden" 
        onChange={handleImportJSON} 
      />

      {/* Header */}
      <nav className="w-full px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-red-700 p-2 rounded-lg">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-800 leading-tight">
              Dragão Brasil Indexer
            </span>
            <span className="text-xs text-slate-500">AI Edition</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {processingCount > 0 && (
             <div className="flex items-center gap-3 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
               <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
               <div className="flex flex-col min-w-[120px]">
                 <span className="text-xs font-semibold text-brand-700">Indexando... {library.length - processingCount}/{library.length}</span>
                 <div className="w-full bg-brand-200 rounded-full h-1 mt-1">
                   <div className="bg-brand-500 h-1 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                 </div>
               </div>
             </div>
           )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6 max-w-[1600px] w-full mx-auto">
        
        {appState === AppState.IDLE ? (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
            <div className="text-center space-y-6 max-w-2xl">
              <h1 className="text-4xl font-extrabold text-slate-900">
                Organize sua coleção da <br/>
                <span className="text-red-700">Dragão Brasil.</span>
              </h1>
              
              {importedCount === 0 ? (
                 <>
                    <p className="text-lg text-slate-600">
                      Selecione a pasta onde estão seus PDFs da revista. A IA identificará a edição e a coluna automaticamente.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 text-left mx-auto max-w-lg">
                      <strong>Nota:</strong> A renomeação automática (DB_000_Slug.pdf) requer suporte a API de Sistema de Arquivos (Chrome/Edge).
                    </div>
                 </>
              ) : (
                 <div className="bg-green-50 border border-green-200 p-6 rounded-xl animate-fade-in text-left mx-auto max-w-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 rounded-full text-green-600">
                        <RefreshCw size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-green-800">Database Carregado!</h3>
                    </div>
                    <p className="text-green-700 mb-4">
                      {importedCount} registros históricos identificados.
                    </p>
                 </div>
              )}

              <div className="pt-4 w-full max-w-xl mx-auto space-y-4">
                <FileUpload onEntriesLoaded={handleEntriesLoaded} />
                
                {importedCount === 0 && (
                  <button 
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 w-full py-3 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-slate-200"
                  >
                    <Upload size={16} />
                    Carregar Database (.json)
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Dashboard 
            library={library} 
            filters={filters} 
            setFilters={setFilters} 
            onRenameClick={handleRenameBatch}
            onRetryClick={handleRetryErrors}
            onResetClick={handleReset}
            onManualEdit={handleManualEdit}
            onSingleRename={handleSingleRename}
            onPythonDownload={handlePythonDownloadMarkAsRenamed}
            isRenaming={isRenaming}
          />
        )}

      </main>
    </div>
  );
};

export default App;