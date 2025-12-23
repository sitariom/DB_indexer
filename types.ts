export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  DASHBOARD = 'DASHBOARD',
  ERROR = 'ERROR'
}

export interface RpgMetadata {
  official_title: string;
  magazine_edition: string;
  magazine_section: string;
  rpg_system: string;
  content_type: string;
  summary: string;
  filename_slug: string;
}

export interface LogEntry {
  timestamp: string;
  action: 'SCAN' | 'ANALYZE' | 'RENAME' | 'ERROR' | 'RESTORE' | 'EDIT';
  message: string;
}

// Interface for Native File System Handle
export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  isSameEntry: (other: FileSystemHandle) => Promise<boolean>;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile: () => Promise<File>;
  move: (newName: string) => Promise<void>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values: () => AsyncIterableIterator<FileSystemHandle>;
  getDirectoryHandle: (name: string) => Promise<FileSystemDirectoryHandle>;
  getFileHandle: (name: string) => Promise<FileSystemFileHandle>;
}

export interface LibraryEntry {
  id: string; // Temporary UI ID
  fingerprint: string; // Unique ID based on File Content Metadata (Size + Date + Path)
  handle: FileSystemFileHandle | null;
  file: File;
  
  // File System Stats
  originalName: string;
  relativePath: string;
  size: number;
  lastModified: number;

  // Processing State
  suggestedName: string;
  isManualOverride?: boolean;
  metadata: RpgMetadata | null;
  status: 'pending' | 'analyzing' | 'done' | 'renamed' | 'error' | 'skipped';
  error?: string;
  
  // History
  logs: LogEntry[];
}

// The Persistent Database Record
export interface RegistryRecord {
  fingerprint: string;
  originalPath: string;
  currentName: string;
  fileSize: number;
  lastModified: number;
  metadata: RpgMetadata | null;
  status: string;
  isManualOverride?: boolean;
  logs: LogEntry[];
  lastUpdated: string;
}

export interface FilterState {
  section: string;
  system: string;
  type: string;
  search: string;
}