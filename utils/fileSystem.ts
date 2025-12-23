import { LibraryEntry, FileSystemDirectoryHandle, FileSystemFileHandle, FileSystemHandle } from '../types';

/**
 * Helper to generate a unique fingerprint for a file without reading its content.
 * Combines Relative Path + Size + LastModified.
 */
const generateFingerprint = (relativePath: string, file: File): string => {
  return `${relativePath}::${file.size}::${file.lastModified}`;
};

/**
 * Creates a LibraryEntry from a FileSystemFileHandle and File object.
 */
const createEntry = (file: File, handle: FileSystemFileHandle | null, path: string): LibraryEntry => {
  return {
    id: crypto.randomUUID(),
    fingerprint: generateFingerprint(path, file),
    handle: handle,
    file: file,
    originalName: file.name,
    relativePath: path,
    size: file.size,
    lastModified: file.lastModified,
    suggestedName: 'Aguardando análise...',
    metadata: null,
    status: 'pending',
    logs: [{
      timestamp: new Date().toISOString(),
      action: 'SCAN',
      message: handle ? 'Arquivo detectado (Acesso de Escrita OK).' : 'Arquivo detectado (Modo Leitura).'
    }]
  };
};

/**
 * Recursively processes a FileSystemHandle (can be file or directory).
 */
export async function processHandle(
  handle: FileSystemHandle,
  path = ''
): Promise<LibraryEntry[]> {
  const entries: LibraryEntry[] = [];

  if (handle.kind === 'file') {
    const fileHandle = handle as FileSystemFileHandle;
    if (fileHandle.name.toLowerCase().endsWith('.pdf')) {
      const file = await fileHandle.getFile();
      const relativePath = path + file.name;
      entries.push(createEntry(file, fileHandle, relativePath));
    }
  } else if (handle.kind === 'directory') {
    const dirHandle = handle as FileSystemDirectoryHandle;
    const newPath = path ? `${path}${dirHandle.name}/` : ''; // Don't add slash if it's the root being processed
    
    // @ts-ignore - TS sometimes complains about async iterator on handle
    for await (const entry of dirHandle.values()) {
      const subEntries = await processHandle(entry, newPath);
      entries.push(...subEntries);
    }
  }

  return entries;
}

/**
 * Wrapper to process standard File objects (fallback input).
 */
export function processFileList(fileList: FileList): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  Array.from(fileList).forEach(file => {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const relativePath = file.webkitRelativePath || file.name;
      entries.push(createEntry(file, null, relativePath));
    }
  });
  return entries;
}

/**
 * Renames a file on the user's disk using the File System Access API.
 */
export async function renameFileOnDisk(entry: LibraryEntry): Promise<void> {
  if (!entry.handle) {
    throw new Error("Modo de compatibilidade: O acesso direto ao disco não está disponível.");
  }
  
  if (!entry.suggestedName) {
    throw new Error("Nome sugerido ausente.");
  }

  // Feature detection for .move() (Chromium based browsers)
  // @ts-ignore
  if (typeof entry.handle.move === 'function') {
     // @ts-ignore
     await entry.handle.move(entry.suggestedName);
  } else {
    throw new Error("Seu navegador não suporta a função 'move' nativa (API experimental). Tente usar Chrome ou Edge atualizados.");
  }
}

/**
 * Generates a Windows Batch script content to rename files.
 */
export function generateRenameBat(entries: LibraryEntry[]): string {
    const lines = [
      '@echo off', 
      'chcp 65001 > nul', 
      'echo ==========================================',
      'echo      Renomeando Arquivos (Dragao Brasil)',
      'echo ==========================================',
      'echo.'
    ];
    
    let count = 0;
    entries.forEach(entry => {
        if (entry.status === 'done' && entry.suggestedName && entry.suggestedName !== entry.originalName) {
            // ren "old_name.pdf" "new_name.pdf"
            // We use simple quotes to handle spaces
            lines.push(`if exist "${entry.originalName}" (`);
            lines.push(`    ren "${entry.originalName}" "${entry.suggestedName}"`);
            lines.push(`    echo [OK] ${entry.originalName} -^> ${entry.suggestedName}`);
            lines.push(`) else (`);
            lines.push(`    echo [ERRO] Arquivo nao encontrado: ${entry.originalName}`);
            lines.push(`)`);
            count++;
        }
    });
    
    lines.push('echo.');
    lines.push(`echo Concluido! ${count} arquivos processados.`);
    lines.push('pause');
    return lines.join('\r\n');
}

/**
 * Generates a Shell script (Linux/Mac) content to rename files.
 */
export function generateRenameSh(entries: LibraryEntry[]): string {
    const lines = [
      '#!/bin/bash', 
      'echo "Renomeando Arquivos..."'
    ];
    
    entries.forEach(entry => {
        if (entry.status === 'done' && entry.suggestedName && entry.suggestedName !== entry.originalName) {
             lines.push(`mv "${entry.originalName}" "${entry.suggestedName}"`);
        }
    });
    
    lines.push('echo "Concluido!"');
    return lines.join('\n');
}

/**
 * Generates a Python script content that reads the exported JSON and renames files.
 */
export function generateRenamePython(): string {
  return `import json
import os
import sys

def main():
    print("--- Dragao Brasil Renamer (Python) ---")
    print("Este script procura por arquivos .json exportados pela aplicacao web.")
    
    # 1. Find JSON files in current directory
    files = [f for f in os.listdir('.') if f.endswith('.json')]
    if not files:
        print("ERRO: Nenhum arquivo .json encontrado nesta pasta.")
        print("Passo 1: Exporte o 'Database' na aplicacao web.")
        print("Passo 2: Salve o .json na MESMA pasta onde estao os PDFs.")
        input("Pressione Enter para sair...")
        return

    # Use the first JSON found (or newest)
    json_file = files[0]
    print(f"Lendo base de dados: {json_file}")

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Erro ao ler JSON: {e}")
        return

    count_success = 0
    count_skip = 0
    count_error = 0

    print(f"Encontrados {len(data)} registros. Iniciando...")
    print("-" * 40)

    for item in data:
        # Get paths from JSON
        original_rel_path = item.get('originalPath', '')
        new_filename = item.get('currentName', '')
        
        # We only care about items that have a new name defined
        if not original_rel_path or not new_filename:
            continue
            
        # Determine actual file location on disk
        # The JSON 'originalPath' often comes from webkitRelativePath (e.g., "MyFolder/File.pdf")
        # But the user might run this script INSIDE "MyFolder".
        # We try to match the file in a few ways:
        
        candidates = [
            original_rel_path,                         # Exact match (if script is outside folder)
            os.path.basename(original_rel_path),       # Flat file (if script is inside folder)
        ]
        
        # If originalPath has folders, try stripping the first folder (common in drag-and-drop)
        if '/' in original_rel_path:
             candidates.append(original_rel_path.split('/', 1)[-1])
        
        found_path = None
        for p in candidates:
            if p and os.path.exists(p):
                found_path = p
                break
        
        if not found_path:
            # Silent skip if it's already renamed or missing? 
            # Check if new filename already exists (maybe already renamed)
            if os.path.exists(new_filename):
                count_skip += 1
            else:
                print(f"[NAO ENCONTRADO] {original_rel_path}")
                count_error += 1
            continue

        # Construct new full path (keep file in same directory it was found)
        directory = os.path.dirname(found_path)
        new_full_path = os.path.join(directory, new_filename)

        if found_path == new_full_path:
            continue
            
        if os.path.exists(new_full_path):
             print(f"[PULAR] Destino ja existe: {new_filename}")
             count_skip += 1
             continue

        try:
            os.rename(found_path, new_full_path)
            print(f"[OK] {os.path.basename(found_path)} -> {new_filename}")
            count_success += 1
        except Exception as e:
            print(f"[ERRO] Falha ao renomear {found_path}: {e}")
            count_error += 1

    print("-" * 40)
    print(f"Concluido!")
    print(f"Renomeados com sucesso: {count_success}")
    print(f"Ja estavam prontos/Pulados: {count_skip}")
    print(f"Arquivos nao encontrados/Erros: {count_error}")
    input("Pressione Enter para sair...")

if __name__ == "__main__":
    main()
`;
}