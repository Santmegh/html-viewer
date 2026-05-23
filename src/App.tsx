import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Router as WouterRouter, Route, Switch } from 'wouter';

/* ── Legacy type re-exports (MenuBar still imports these) ── */
export type WinId = 'files' | 'code' | 'preview' | 'properties' | 'timeline' | 'components';
export interface WinState {
  id: WinId; title: string; visible: boolean; minimized: boolean;
  docked: boolean; zIndex: number; rect: { x: number; y: number; w: number; h: number };
}
import Documentation from './pages/Documentation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import NotFound from './pages/not-found';
import { useEditorStore } from './store/editorStore';
import MenuBar from './components/MenuBar';
import GoldenLayoutEditor from './components/GoldenLayoutEditor';
import type { GoldenLayoutEditorHandle, PanelType, Mode } from './components/GoldenLayoutEditor';
import { aiControl, clearAiCache } from './components/CodeEditor';
import FilePanel from './components/FilePanel';
import CodeEditor from './components/CodeEditor';
import PreviewPane from './components/PreviewPane';
import VisualEditor from './components/VisualEditor';
import PropertiesPanel from './components/PropertiesPanel';
import ConsolePanel from './components/ConsolePanel';
import { exportProject } from './utils/export';
import {
  FiCode, FiEye, FiLayout, FiDownload, FiRefreshCw, FiRotateCcw,
  FiFolder, FiSliders, FiClock, FiMonitor, FiBox, FiX, FiTerminal,
} from 'react-icons/fi';

/* ─── Non-intrusive AdSense Banner ─── */
const EditorAdBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('editor-ad-dismissed') === 'true'; } catch { return false; }
  });
  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('editor-ad-dismissed', 'true'); } catch {}
  };
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);
  if (dismissed) return null;
  return (
    <div style={{ position: 'fixed', bottom: 30, right: 16, zIndex: 9999, background: '#1e1e1e', border: '1px solid #3e3e3e', borderRadius: 8, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#555', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Advertisement</span>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 2 }}>
          <FiX size={12} />
        </button>
      </div>
      <ins className="adsbygoogle" style={{ display: 'block' }}
        data-ad-client="ca-pub-1826192920016393" data-ad-slot="7872622325"
        data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
};

/* ─── AI Status Button ─── */
function AiStatusButton() {
  const [aiState, setAiState] = useState(aiControl.state);
  useEffect(() => {
    const handler = () => setAiState(aiControl.state);
    aiControl.listeners.add(handler);
    return () => { aiControl.listeners.delete(handler); };
  }, []);
  const handleClick = () => { clearAiCache(); aiControl.triggerManual?.(); };
  const cfg = {
    idle:    { dot: 'rgba(255,255,255,0.5)', dotGlow: false, text: '✦ AI',  bg: 'rgba(0,0,0,0.15)',  label: 'Click to get AI suggestion' },
    loading: { dot: '#fbbf24',               dotGlow: true,  text: '⟳ AI…', bg: 'rgba(0,0,0,0.25)',  label: 'AI is thinking…' },
    ready:   { dot: '#4ade80',               dotGlow: true,  text: '✓ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'Suggestion ready — Tab to accept · Click to refresh' },
    error:   { dot: '#f87171',               dotGlow: false, text: '✗ AI',  bg: 'rgba(0,0,0,0.25)',  label: 'AI error — click to retry' },
  }[aiState];
  return (
    <button title={cfg.label} onClick={handleClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: '100%', background: cfg.bg, border: 'none', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: '0.04em', transition: 'background 0.15s', flexShrink: 0, whiteSpace: 'nowrap' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = cfg.bg; }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0, boxShadow: cfg.dotGlow ? `0 0 6px ${cfg.dot}` : 'none', transition: 'background 0.2s' }} />
      {cfg.text}
    </button>
  );
}

/* ─── Mobile hook ─── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

/* ─── Mobile App (unchanged) ─── */
type MobileTab = 'code' | 'preview' | 'files' | 'props' | 'console';

function MobileApp() {
  const [tab, setTab] = useState<MobileTab>('code');
  const { files, mode, setMode, notification, showNotification } = useEditorStore();

  const TABS: { id: MobileTab; icon: React.ReactNode; label: string }[] = [
    { id: 'files',   icon: <FiFolder size={17} />,   label: 'Files'   },
    { id: 'code',    icon: <FiCode size={17} />,      label: 'Code'    },
    { id: 'preview', icon: <FiEye size={17} />,       label: 'Preview' },
    { id: 'console', icon: <FiTerminal size={17} />,  label: 'Console' },
    { id: 'props',   icon: <FiSliders size={17} />,   label: 'Props'   },
  ];

  const accent = '#e5a45a', bg = '#1e1e1e', bar = '#252526', border = '#3a3a3a';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: bg, color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', height: 46, flexShrink: 0, background: '#323233', borderBottom: `1px solid ${border}`, padding: '0 10px', gap: 8, zIndex: 100 }}>
        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#e34c26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>H</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>HTML Editor</span>
        <div style={{ display: 'flex', gap: 2, background: '#1e1e1e', borderRadius: 6, padding: 2, flexShrink: 0 }}>
          {([['split', 'View'], ['visual', 'Visual']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setTab('preview'); }}
              style={{ padding: '3px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', border: 'none', background: mode === m ? accent : 'transparent', color: mode === m ? '#111' : '#666', textTransform: 'uppercase' }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => exportProject(files).then(() => showNotification('Exported!'))}
          style={{ padding: '5px 8px', fontSize: 11, borderRadius: 5, cursor: 'pointer', background: 'rgba(229,164,90,0.12)', border: `1px solid rgba(229,164,90,0.35)`, color: accent, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <FiDownload size={12} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        <div style={{ display: tab === 'files' ? 'flex' : 'none', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}><FilePanel hideHeader /></div>
        <div style={{ display: tab === 'code' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}><CodeEditor /></div>
        <div style={{ display: tab === 'preview' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>{mode === 'visual' ? <VisualEditor /> : <PreviewPane />}</div>
        <div style={{ display: tab === 'console' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}><ConsolePanel /></div>
        <div style={{ display: tab === 'props' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflowY: 'auto' }}><PropertiesPanel hideHeader /></div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', height: 56, flexShrink: 0, background: bar, borderTop: `1px solid ${border}`, paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
        {TABS.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: active ? 'rgba(229,164,90,0.08)' : 'transparent', borderTop: `2px solid ${active ? accent : 'transparent'}`, color: active ? accent : '#666', transition: 'all 0.15s' }}>
              {t.icon}
              <span style={{ fontSize: 8, fontWeight: active ? 700 : 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {notification && (
        <div style={{ position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 1000000, background: '#3c3c3c', border: '1px solid #555', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
          {notification}
        </div>
      )}
    </div>
  );
}

/* ─── App router ─── */
export default function App() {
  const isMobile = useIsMobile();
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/docs" component={Documentation} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/">
          {isMobile ? <MobileApp /> : <DesktopApp />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

/* ─── Desktop App with Golden Layout ─── */
function DesktopApp() {
  const { mode, setMode, notification, files, showNotification, activeFileId } = useEditorStore();
  const glRef = useRef<GoldenLayoutEditorHandle>(null);

  const applyModePreset = useCallback((m: Mode) => {
    setMode(m);
  }, [setMode]);

  const handlePanelToggle = useCallback((type: PanelType) => {
    glRef.current?.focusOrAddPanel(type);
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === '1') { e.preventDefault(); applyModePreset('code'); }
      if (mod && e.key === '2') { e.preventDefault(); applyModePreset('visual'); }
      if (mod && e.key === '3') { e.preventDefault(); applyModePreset('split'); }
      if (mod && e.key === 's') { e.preventDefault(); showNotification('All files saved ✓'); }
      if (mod && e.key === 'e') { e.preventDefault(); exportProject(files).then(() => showNotification('Exported project.zip')); }
      if (mod && e.key === 'r') { e.preventDefault(); useEditorStore.getState().refreshPreview(); }
      if (mod && e.key === '`') { e.preventDefault(); handlePanelToggle('console'); }
      if (mod && e.key === '0') { e.preventDefault(); glRef.current?.resetLayout(); }
      if (e.key === 'Escape') { useEditorStore.getState().setSelectedElement(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [files, applyModePreset, handlePanelToggle]);

  const activeFileName = useEditorStore(s => s.files.find(f => f.id === s.activeFileId)?.name || '');

  const PANEL_BTNS: { type: PanelType; icon: React.ReactNode; label: string; title: string }[] = [
    { type: 'files',      icon: <FiFolder size={12} />,   label: 'Explorer',  title: 'File Explorer' },
    { type: 'code',       icon: <FiCode size={12} />,     label: 'Code',      title: 'Code Editor' },
    { type: 'preview',    icon: <FiMonitor size={12} />,  label: 'Preview',   title: 'Preview' },
    { type: 'console',    icon: <FiTerminal size={12} />, label: 'Console',   title: 'Console (Ctrl+`)' },
    { type: 'properties', icon: <FiSliders size={12} />,  label: 'Props',     title: 'Properties' },
    { type: 'timeline',   icon: <FiClock size={12} />,    label: 'Timeline',  title: 'Timeline' },
    { type: 'components', icon: <FiBox size={12} />,      label: 'Comps',     title: 'Component Library' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#111', color: '#ccc', fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13, overflow: 'hidden' }}>

      {/* ── Menu Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 30, flexShrink: 0, background: '#323233', borderBottom: '1px solid #3e3e3e', position: 'relative', zIndex: 9999 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, background: '#e34c26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>H</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc' }}>HTML Editor</span>
        </div>
        <MenuBar
          wins={[]}
          onToggleWin={() => {}}
          onOpenWin={() => {}}
          onResetLayout={() => applyModePreset(mode as Mode)}
          onApplyModePreset={(m: string) => applyModePreset(m as Mode)}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#555', padding: '0 12px' }}>{activeFileName}</span>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 36, flexShrink: 0, background: '#2d2d2d', borderBottom: '1px solid #3e3e3e', padding: '0 10px', gap: 4, position: 'relative', zIndex: 9998 }}>
        <span style={{ fontSize: 11, color: '#555', marginRight: 2 }}>Layout:</span>
        {([['split', 'Split', FiLayout, 'Ctrl+3'], ['code', 'Code', FiCode, 'Ctrl+1'], ['visual', 'Visual', FiEye, 'Ctrl+2']] as const).map(([m, label, Icon, sc]) => (
          <button key={m} title={`${label} layout (${sc})`} onClick={() => applyModePreset(m)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', background: mode === m ? 'rgba(229,164,90,0.15)' : 'transparent', border: `1px solid ${mode === m ? 'rgba(229,164,90,0.5)' : 'transparent'}`, color: mode === m ? '#e5a45a' : '#888' }}>
            <Icon size={13} />{label}
          </button>
        ))}
        <button
          title="Reset current layout to default (Ctrl+0)"
          onClick={() => glRef.current?.resetLayout()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', background: 'transparent', border: '1px solid transparent', color: '#555' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ccc'; (e.currentTarget as HTMLElement).style.borderColor = '#555'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#555'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        >
          <FiRotateCcw size={11} /> Reset
        </button>
        <div style={{ width: 1, height: 20, background: '#3e3e3e', margin: '0 4px' }} />
        <ToolbarBtn title="Refresh Preview (Ctrl+R)" icon={<FiRefreshCw size={13} />} label="Refresh" onClick={() => useEditorStore.getState().refreshPreview()} />
        <ToolbarBtn title="Export ZIP (Ctrl+E)" icon={<FiDownload size={13} />} label="Export" onClick={() => exportProject(files).then(() => showNotification('Exported project.zip'))} />

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#555' }}>Panels:</span>
        {PANEL_BTNS.map(({ type, icon, label, title }) => (
          <button key={type} onClick={() => handlePanelToggle(type)} title={title}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', fontSize: 11, borderRadius: 3,
              cursor: 'pointer', fontFamily: 'inherit',
              background: type === 'console' ? 'rgba(100,180,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${type === 'console' ? 'rgba(100,180,255,0.3)' : '#3a3a3a'}`,
              color: type === 'console' ? '#7ab8f5' : '#888',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(229,164,90,0.12)';
              el.style.borderColor = 'rgba(229,164,90,0.4)';
              el.style.color = '#e5a45a';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = type === 'console' ? 'rgba(100,180,255,0.08)' : 'rgba(255,255,255,0.04)';
              el.style.borderColor = type === 'console' ? 'rgba(100,180,255,0.3)' : '#3a3a3a';
              el.style.color = type === 'console' ? '#7ab8f5' : '#888';
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Golden Layout Workspace ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <GoldenLayoutEditor
          ref={glRef}
          mode={mode as Mode}
        />
      </div>

      {/* ── Status Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 24, flexShrink: 0, background: '#007acc', padding: '0 0 0 12px', fontSize: 11, color: 'rgba(255,255,255,0.9)', zIndex: 200 }}>
        <span style={{ fontWeight: 600, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.2)' }}>HTML Editor</span>
        <span style={{ padding: '0 12px' }}>Mode: {mode}</span>
        <span style={{ padding: '0 12px', opacity: 0.8 }}>{activeFileName}</span>
        <div style={{ flex: 1 }} />
        <span style={{ opacity: 0.7, fontSize: 10, paddingRight: 12, fontFamily: 'inherit' }}>
          Golden Layout — drag tabs to rearrange panels
        </span>
        <span style={{ padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.2)', opacity: 0.8 }}>{files.length} files</span>
        <span style={{ padding: '0 10px', borderLeft: '1px solid rgba(255,255,255,0.2)', opacity: 0.8 }}>UTF-8</span>
        <AiStatusButton />
      </div>

      {/* ── Toast ── */}
      {notification && (
        <div style={{ position: 'fixed', bottom: 36, right: 16, zIndex: 1000000, background: '#3c3c3c', border: '1px solid #555', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#ccc', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          {notification}
        </div>
      )}
      <EditorAdBanner />
    </div>
  );
}

function ToolbarBtn({ title, icon, label, onClick }: { title: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: 'transparent', border: '1px solid transparent', color: '#888', fontFamily: 'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#ccc'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}
    >{icon}{label}</button>
  );
}
