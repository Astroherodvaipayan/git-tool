import {
  FileCode,
  FileJson,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  FileCheck,
  FileDigit,
  FileSearch,
  FileWarning,
  FileX,
  FileType,
  FileTerminal,
  FileSymlink,
  FileKey,
  FileCog,
  FileLock,
  FileBox,
  FileIcon
} from "lucide-react";

// Map of file extensions to icon components
export const fileIcons: Record<string, typeof FileIcon> = {
  // Code files
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  py: FileCode,
  rb: FileCode,
  php: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  cs: FileCode,
  go: FileCode,
  rs: FileCode,
  swift: FileCode,
  kt: FileCode,
  scala: FileCode,
  lua: FileCode,
  sh: FileTerminal,
  bash: FileTerminal,
  zsh: FileTerminal,
  fish: FileTerminal,
  bat: FileTerminal,
  ps1: FileTerminal,
  
  // Web files
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  sass: FileCode,
  less: FileCode,
  vue: FileCode,
  svelte: FileCode,
  
  // Data files
  json: FileJson,
  xml: FileCode,
  yaml: FileCode,
  yml: FileCode,
  toml: FileCode,
  ini: FileCode,
  csv: FileSpreadsheet,
  tsv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  
  // Text files
  md: FileText,
  markdown: FileText,
  txt: FileText,
  rtf: FileText,
  tex: FileText,
  
  // Image files
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  ico: FileImage,
  bmp: FileImage,
  
  // Archive files
  zip: FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  
  // Audio files
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  flac: FileAudio,
  
  // Video files
  mp4: FileVideo,
  webm: FileVideo,
  avi: FileVideo,
  mov: FileVideo,
  mkv: FileVideo,
  
  // Document files
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  ppt: FileText,
  pptx: FileText,
  
  // Config files
  env: FileCog,
  config: FileCog,
  conf: FileCog,
  
  // Package files
  lock: FileLock,
  
  // Special files
  gitignore: FileSymlink,
  dockerignore: FileSymlink,
  dockerfile: FileBox,
  license: FileKey,
  
  // Default - will fall back to the generic FileIcon from lucide-react
}; 