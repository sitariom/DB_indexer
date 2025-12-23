import React, { useMemo, useState } from 'react';
import { LibraryEntry, FilterState, RegistryRecord } from '../types';
import { Search, Filter, BookOpen, Sword, Scroll, Download, CheckCircle, Save, FolderInput, RefreshCw, Trash2, AlertTriangle, FileClock, Pencil, X, Play, UserCheck, LayoutTemplate, Dices, Layers, Map, FileJson, FileCode } from 'lucide-react';
import { generateRenamePython } from '../utils/fileSystem';

interface DashboardProps {
  library: LibraryEntry[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onRenameClick: () => void;
  onRetryClick: () => void;
  onResetClick: () => void;
  onManualEdit: (id: string, newName: string) => void;
  onSingleRename: (id: string) => void;
  onPythonDownload: () => void;
  isRenaming: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  library, filters, setFilters, onRenameClick, onRetryClick, onResetClick, onManualEdit, onSingleRename, onPythonDownload, isRenaming 
}) => {
  
  // State for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Calculate Metrics
  const metrics = useMemo(() => {
    const doneItems = library.filter(i => (i.status === 'done' || i.status === 'renamed' || i.status === 'skipped') && i.metadata);
    
    // Unique Editions
    const editions = new Set(doneItems.map(i => i.metadata?.magazine_edition).filter(Boolean));
    
    // Unique Systems (New Metric)
    const systems = new Set(doneItems.map(i => i.metadata?.rpg_system).filter(Boolean));
    
    // Count Adventures (New Metric)
    const adventures = doneItems.filter(i => 
      i.metadata?.content_type?.toLowerCase().includes('aventura') || 
      i.metadata?.magazine_section?.toLowerCase().includes('aventura')
    ).length;

    const errors = library.filter(i => i.status === 'error').length;
    
    return {
      total: library.length, // Show total files loaded
      editions: editions.size,
      systems: systems.size,
      adventures: adventures,
      errors
    };
  }, [library]);

  const availableSections = useMemo(() => {
    const sections = new Set(library.map(i => i.metadata?.magazine_section).filter(Boolean));
    return ["Todas", ...Array.from(sections).sort()];
  }, [library]);

  const availableSystems = useMemo(() => {
    const systems = new Set(library.map(i => i.metadata?.rpg_system).filter(Boolean));
    return ["Todos", ...Array.from(systems).sort()];
  }, [library]);

  const availableTypes = useMemo(() => {
    const types = new Set(library.map(i => i.metadata?.content_type).filter(Boolean));
    return ["Todos", ...Array.from(types).sort()];
  }, [library]);

  const filteredLibrary = useMemo(() => {
    return library.filter(item => {
      // Allow viewing errors if searching
      if (item.status === 'pending') return false; 
      
      const matchesSection = filters.section === "Todas" || item.metadata?.magazine_section === filters.section;
      const matchesSystem = filters.system === "Todos" || item.metadata?.rpg_system === filters.system;
      const matchesType = filters.type === "Todos" || item.metadata?.content_type === filters.type;
      
      const searchLower = filters.search.toLowerCase();
      
      const summary = item.metadata?.summary?.toLowerCase() || "";
      const title = item.metadata?.official_title?.toLowerCase() || "";
      const edition = item.metadata?.magazine_edition || "";
      
      const matchesSearch = !filters.search || 
        item.suggestedName.toLowerCase().includes(searchLower) ||
        item.originalName.toLowerCase().includes(searchLower) ||
        title.includes(searchLower) ||
        summary.includes(searchLower) ||
        edition.includes(searchLower);

      return matchesSection && matchesSystem && matchesType && matchesSearch;
    });
  }, [library, filters]);

  const handleExport = () => {
    // Export strict RegistryRecord format
    const dbExport: RegistryRecord[] = library.map(l => ({
        fingerprint: l.fingerprint,
        originalPath: l.relativePath,
        currentName: l.suggestedName,
        fileSize: l.size,
        lastModified: l.lastModified,
        metadata: l.metadata,
        status: l.status,
        isManualOverride: l.isManualOverride,
        logs: l.logs,
        lastUpdated: new Date().toISOString()
    }));
    
    const dataStr = JSON.stringify(dbExport, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dragao_brasil_index_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPython = () => {
    const script = generateRenamePython();
    const blob = new Blob([script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renamer.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Update statuses after download
    onPythonDownload();
  };

  const startEditing = (item: LibraryEntry) => {
    setEditingId(item.id);
    setEditValue(item.suggestedName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEditing = (id: string) => {
    if (editValue.trim()) {
      onManualEdit(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const pendingRenames = library.filter(i => i.status === 'done').length;

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Acervo Dragão Brasil</h2>
          <p className="text-sm text-slate-500">Catalogação automática de matérias e edições.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
             {metrics.errors > 0 && (
               <button
                 onClick={onRetryClick}
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-all"
               >
                 <RefreshCw size={18} />
                 <span>Reanalisar ({metrics.errors})</span>
               </button>
             )}

             <div className="flex gap-1 bg-white border border-slate-300 rounded-lg shadow-sm p-1">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 rounded-md transition-all text-sm"
                  title="Salvar Banco de Dados JSON"
                >
                  <FileJson size={16} className="text-slate-500" />
                  <span>JSON</span>
                </button>
                <div className="w-px bg-slate-200 my-0.5"></div>
                <button
                  onClick={handleDownloadPython}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-all text-sm"
                  title="Baixar Script Python para renomear localmente"
                >
                  <FileCode size={16} className="text-blue-500" />
                  <span>Script Python</span>
                </button>
            </div>
            
            <button
              onClick={onRenameClick}
              disabled={pendingRenames === 0 || isRenaming}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm text-white transition-all
                ${pendingRenames > 0 && !isRenaming ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-300 cursor-not-allowed'}
              `}
            >
              {isRenaming ? <FolderInput size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isRenaming ? 'Renomeando...' : `Renomear Lote (${pendingRenames})`}</span>
            </button>

            <button
              onClick={onResetClick}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Limpar tudo e reiniciar"
            >
              <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Files */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase">Arquivos</p>
            <div className="flex items-center gap-2 mt-1">
                <BookOpen size={20} className="text-blue-500" />
                <span className="text-2xl font-bold text-slate-800">{metrics.total}</span>
            </div>
        </div>
        
        {/* Card 2: Editions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase">Edições Únicas</p>
            <div className="flex items-center gap-2 mt-1">
                <Scroll size={20} className="text-purple-500" />
                <span className="text-2xl font-bold text-slate-800">{metrics.editions}</span>
            </div>
        </div>
        
        {/* Card 3: Systems (Previously Chefe de Fase) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase">Sistemas RPG</p>
            <div className="flex items-center gap-2 mt-1">
                <Dices size={20} className="text-indigo-500" />
                <span className="text-2xl font-bold text-slate-800">{metrics.systems}</span>
            </div>
        </div>
        
        {/* Card 4: Adventures (Previously Renamed) */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase">Aventuras</p>
            <div className="flex items-center gap-2 mt-1">
                <Map size={20} className="text-emerald-600" />
                <span className="text-2xl font-bold text-slate-800">{metrics.adventures}</span>
            </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={18} />
          <span className="font-medium text-sm">Filtros:</span>
        </div>
        
        <select 
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-40 p-2.5"
          value={filters.system}
          onChange={(e) => setFilters(prev => ({ ...prev, system: e.target.value }))}
        >
          {availableSystems.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-40 p-2.5"
          value={filters.section}
          onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
        >
          {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full md:w-40 p-2.5"
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
        >
          {availableTypes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input 
            type="text" 
            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 p-2.5" 
            placeholder="Buscar..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 min-w-[280px]">Arquivo (DB_XXX_Slug)</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Edição</th>
                <th scope="col" className="px-6 py-3 min-w-[120px]">Sistema</th>
                <th scope="col" className="px-6 py-3 min-w-[120px]">Tipo</th>
                <th scope="col" className="px-6 py-3 min-w-[150px]">Seção / Coluna</th>
                <th scope="col" className="px-6 py-3 min-w-[250px]">Título & Resumo</th>
              </tr>
            </thead>
            <tbody>
              {filteredLibrary.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Nenhum arquivo encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredLibrary.map((item) => (
                  <tr key={item.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex flex-col gap-1">
                        {editingId === item.id ? (
                           <div className="flex items-center gap-2">
                             <input 
                               type="text"
                               autoFocus
                               className="border border-brand-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-200"
                               value={editValue}
                               onChange={(e) => setEditValue(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') saveEditing(item.id);
                                 if (e.key === 'Escape') cancelEditing();
                               }}
                             />
                             <button onClick={() => saveEditing(item.id)} className="text-green-600 hover:bg-green-100 p-1 rounded"><CheckCircle size={16}/></button>
                             <button onClick={cancelEditing} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={16}/></button>
                           </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                             <span className={`font-semibold ${item.status === 'error' ? 'text-red-600' : 'text-brand-700'}`}>
                                {item.status === 'error' ? item.originalName : item.suggestedName}
                             </span>
                             {item.status === 'done' && (
                                <button 
                                  onClick={() => startEditing(item)} 
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 transition-opacity"
                                  title="Editar nome manualmente"
                                >
                                  <Pencil size={14} />
                                </button>
                             )}
                          </div>
                        )}
                        
                        <span className="text-xs text-slate-400 font-normal flex items-center gap-1 truncate max-w-[300px]" title={item.relativePath}>
                             <FolderInput size={10} /> {item.relativePath}
                        </span>
                        
                        {item.isManualOverride && (
                           <span className="text-[10px] text-orange-600 flex items-center gap-1 mt-0.5 bg-orange-50 w-fit px-1.5 py-0.5 rounded border border-orange-100">
                             <UserCheck size={10} /> Editado manualmente
                           </span>
                        )}

                        {item.status === 'error' && (
                          <span className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertTriangle size={10} /> {item.error || 'Erro desconhecido'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        {item.status === 'renamed' ? (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-200 flex w-fit items-center gap-1">
                                <CheckCircle size={10} /> Renomeado
                            </span>
                        ) : item.status === 'error' ? (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded border border-red-200">
                                Erro
                            </span>
                        ) : item.status === 'done' ? (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded border border-yellow-200">
                                Pendente
                            </span>
                        ) : (
                            <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-200">
                              Processando
                            </span>
                        )}

                        {/* Individual Rename Button */}
                        {item.status === 'done' && (
                          <button
                            onClick={() => onSingleRename(item.id)}
                            className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800 hover:underline"
                            title="Renomear apenas este arquivo"
                          >
                            <Play size={10} className="fill-current" /> Renomear Agora
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.metadata?.magazine_edition && (
                        <div className="flex flex-col items-center justify-center bg-slate-100 border border-slate-300 rounded-md p-1 min-w-[40px]">
                           <span className="text-[10px] uppercase text-slate-500 font-bold">DB</span>
                           <span className="text-lg font-bold text-slate-800 leading-none">{item.metadata.magazine_edition}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                         {item.metadata?.rpg_system && (
                            <span className="flex items-center gap-1 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1 rounded bg-blue-50">
                                <Dices size={12} />
                                {item.metadata?.rpg_system}
                            </span>
                         )}
                    </td>
                    <td className="px-6 py-4">
                         {item.metadata?.content_type && (
                            <span className="flex items-center gap-1 border border-purple-200 text-purple-700 text-xs font-medium px-2.5 py-1 rounded bg-purple-50">
                                <Layers size={12} />
                                {item.metadata?.content_type}
                            </span>
                         )}
                    </td>
                    <td className="px-6 py-4">
                         {item.metadata?.magazine_section && (
                            <span className="flex items-center gap-1 border border-indigo-200 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded bg-indigo-50">
                                <LayoutTemplate size={12} />
                                {item.metadata?.magazine_section}
                            </span>
                         )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800">{item.metadata?.official_title}</span>
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500" title={item.metadata?.summary}>
                            {item.metadata?.summary}
                        </p>
                         {/* Latest Log Message */}
                         {item.logs.length > 0 && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 truncate max-w-[200px]" title={item.logs[item.logs.length - 1].message}>
                             <FileClock size={10} /> 
                             {new Date(item.logs[item.logs.length - 1].timestamp).toLocaleTimeString()}: {item.logs[item.logs.length - 1].message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};