import { WebContainer } from '@webcontainer/api';
import type { FileItem, FolderItem } from '../store/editorStore';

/* ─── Singleton ─────────────────────────────────────────── */
let wc: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export type WCStatus = 'idle' | 'booting' | 'ready' | 'error';

interface WCListeners {
  onStatusChange?: (s: WCStatus) => void;
  onPortReady?: (port: number, url: string) => void;
  onPortClose?: (port: number) => void;
  onLog?: (msg: string) => void;
}

const listeners: WCListeners = {};
let currentStatus: WCStatus = 'idle';

function setStatus(s: WCStatus) {
  currentStatus = s;
  listeners.onStatusChange?.(s);
}

export function getWCStatus(): WCStatus { return currentStatus; }

export function registerWCListeners(l: WCListeners) {
  Object.assign(listeners, l);
}

export async function getWebContainer(): Promise<WebContainer> {
  if (wc) return wc;
  if (bootPromise) return bootPromise;

  setStatus('booting');
  listeners.onLog?.('🚀 Booting WebContainer…');

  bootPromise = WebContainer.boot().then(instance => {
    wc = instance;
    setStatus('ready');
    listeners.onLog?.('✅ WebContainer ready');

    instance.on('server-ready', (port, url) => {
      listeners.onLog?.(`🌐 Server ready on port ${port} → ${url}`);
      listeners.onPortReady?.(port, url);
    });

    instance.on('port', (port, type) => {
      if (type === 'close') {
        listeners.onLog?.(`🔌 Port ${port} closed`);
        listeners.onPortClose?.(port);
      }
    });

    return instance;
  }).catch(err => {
    bootPromise = null;
    setStatus('error');
    listeners.onLog?.(`❌ Boot failed: ${String(err)}`);
    throw err;
  });

  return bootPromise;
}

/* ─── File System ─────────────────────────────────────────── */
type FSNode = { directory: Record<string, FSNode> } | { file: { contents: string } };
type FSTree = Record<string, FSNode>;

function setNested(obj: FSTree, keys: string[], value: FSNode) {
  let cur: FSTree = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || !('directory' in cur[k])) {
      cur[k] = { directory: {} };
    }
    cur = (cur[k] as { directory: FSTree }).directory;
  }
  cur[keys[keys.length - 1]] = value;
}

export function buildFileSystemTree(files: FileItem[], folders: FolderItem[]): FSTree {
  const tree: FSTree = {};

  folders.forEach(folder => {
    const parts = folder.id.split('/').filter(Boolean);
    if (parts.length) setNested(tree, parts, { directory: {} });
  });

  files.forEach(file => {
    const parts = file.folder
      ? [...file.folder.split('/').filter(Boolean), file.name]
      : [file.name];
    setNested(tree, parts, { file: { contents: file.content } });
  });

  return tree;
}

export async function syncFileToWebContainer(file: FileItem): Promise<void> {
  if (!wc) return;
  const pathParts = file.folder
    ? [...file.folder.split('/').filter(Boolean), file.name]
    : [file.name];
  const path = pathParts.join('/');
  await wc.fs.writeFile(path, file.content);
}

/* ─── Framework Detection ─────────────────────────────────── */
export type Framework = 'react' | 'vue' | 'svelte' | 'vite' | 'next' | 'static';

export function detectFramework(files: FileItem[]): Framework {
  const pkg = files.find(f => f.name === 'package.json');
  if (!pkg) return 'static';
  try {
    const p = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...p.dependencies, ...p.devDependencies };
    if (deps['next']) return 'next';
    if (deps['svelte']) return 'svelte';
    if (deps['vue']) return 'vue';
    if (deps['react'] || deps['react-dom']) return 'react';
    if (deps['vite']) return 'vite';
  } catch { /* ignore */ }
  return 'static';
}

/* ─── Dev Server ──────────────────────────────────────────── */
let devProcess: { kill: () => void } | null = null;

export interface DevServerOptions {
  files: FileItem[];
  folders: FolderItem[];
  onLog: (msg: string) => void;
  onReady: (port: number, url: string) => void;
}

export async function startDevServer(opts: DevServerOptions): Promise<void> {
  const { files, folders, onLog, onReady } = opts;

  const instance = await getWebContainer();

  // Mount filesystem
  onLog('📁 Mounting files…');
  await instance.mount(buildFileSystemTree(files, folders));
  onLog(`📁 Mounted ${files.length} files`);

  // npm install
  onLog('📦 Installing dependencies…');
  const install = await instance.spawn('npm', ['install']);
  install.output.pipeTo(new WritableStream({ write(d) { onLog(d.trim()); } }));
  const installCode = await install.exit;
  if (installCode !== 0) {
    onLog(`❌ npm install failed (exit ${installCode})`);
    return;
  }
  onLog('✅ Dependencies installed');

  // npm run dev
  onLog('🔧 Starting dev server…');
  const pkg = files.find(f => f.name === 'package.json');
  let startScript = 'dev';
  if (pkg) {
    try {
      const p = JSON.parse(pkg.content) as { scripts?: Record<string, string> };
      if (p.scripts?.dev) startScript = 'dev';
      else if (p.scripts?.start) startScript = 'start';
    } catch { /* ignore */ }
  }

  const dev = await instance.spawn('npm', ['run', startScript]);
  dev.output.pipeTo(new WritableStream({ write(d) { onLog(d.trim()); } }));
  devProcess = dev;

  // Listen for server-ready globally
  instance.on('server-ready', (port, url) => {
    onLog(`🌐 Ready at ${url}`);
    onReady(port, url);
  });
}

export async function killDevServer(): Promise<void> {
  if (devProcess) {
    devProcess.kill();
    devProcess = null;
  }
}

/* ─── Shell ───────────────────────────────────────────────── */
export interface ShellProcess {
  output: ReadableStream<string>;
  input: WritableStreamDefaultWriter<string>;
  kill: () => void;
  resize: (cols: number, rows: number) => void;
}

export async function spawnShell(cols: number, rows: number): Promise<ShellProcess> {
  const instance = await getWebContainer();
  const proc = await instance.spawn('jsh', {
    terminal: { cols, rows },
  });

  const writer = proc.input.getWriter();

  return {
    output: proc.output,
    input: writer,
    kill: () => proc.kill(),
    resize: (c, r) => proc.resize({ cols: c, rows: r }),
  };
}

/* ─── Teardown ────────────────────────────────────────────── */
export async function destroyWebContainer(): Promise<void> {
  if (devProcess) { devProcess.kill(); devProcess = null; }
  if (wc) {
    await wc.teardown();
    wc = null;
    bootPromise = null;
    setStatus('idle');
  }
}
