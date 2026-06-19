import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import { registerWCListeners, getWCStatus, getWebContainer } from '../utils/webcontainer';
import type { PortInfo } from '../store/editorStore';

/* ─── Design ─────────────────────────────────────────────── */
const C = {
  bg:      '#1e1e22',
  surface: '#252528',
  surface2:'#2d2d32',
  border:  'rgba(255,255,255,0.08)',
  accent:  '#e5a45a',
  green:   '#4ade80',
  red:     '#f87171',
  yellow:  '#facc15',
  text:    '#d4d4d4',
  muted:   '#888',
  dim:     '#555',
};

/* ─── Manual port add form ────────────────────────────────── */
const ManualPortForm: React.FC<{ onAdd: (p: PortInfo) => void }> = ({ onAdd }) => {
  const [port, setPort]   = useState('');
  const [url, setUrl]     = useState('');
  const [cmd, setCmd]     = useState('');
  const [open, setOpen]   = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(port, 10);
    if (!n || n < 1 || n > 65535) return;
    onAdd({
      port: n,
      url: url || `http://localhost:${n}`,
      command: cmd || undefined,
      status: 'running',
    });
    setPort(''); setUrl(''); setCmd(''); setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '7px 10px',
          background: 'transparent',
          border: `1px dashed ${C.border}`, borderRadius: 6,
          cursor: 'pointer', color: C.dim, fontSize: 12,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add port manually
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: '0.05em' }}>
        Add Port
      </div>
      {([
        { ph: 'Port number (e.g. 3000)', val: port, set: setPort, type: 'number' },
        { ph: 'URL (optional, e.g. http://localhost:3000)', val: url, set: setUrl, type: 'text' },
        { ph: 'Command label (optional)', val: cmd, set: setCmd, type: 'text' },
      ] as const).map(({ ph, val, set, type }, i) => (
        <input
          key={i}
          type={type}
          placeholder={ph}
          value={val}
          onChange={e => set(e.target.value)}
          style={{
            background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4,
            padding: '5px 8px', fontSize: 12, color: C.text, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      ))}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'inherit' }}
        >Cancel</button>
        <button
          type="submit"
          style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
            background: 'rgba(229,164,90,0.15)', border: `1px solid rgba(229,164,90,0.4)`,
            color: C.accent, fontFamily: 'inherit', fontWeight: 600 }}
        >Add</button>
      </div>
    </form>
  );
};

/* ─── Port Card ──────────────────────────────────────────── */
interface PortCardProps {
  port: PortInfo;
  onRemove: (n: number) => void;
  onOpenPreview: (url: string) => void;
}

const PortCard: React.FC<PortCardProps> = ({ port: p, onRemove, onOpenPreview }) => {
  const isRunning = p.status === 'running';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 7,
      background: C.surface,
      border: `1px solid ${isRunning ? 'rgba(74,222,128,0.2)' : C.border}`,
      transition: 'border-color 0.2s',
    }}>
      {/* Status dot */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: isRunning ? C.green : C.red,
        boxShadow: isRunning ? '0 0 6px #4ade80' : undefined,
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: isRunning ? C.green : C.muted,
            fontFamily: 'monospace',
          }}>
            :{p.port}
          </span>
          {p.command && (
            <span style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.command}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.url}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <ActionBtn
          title="Open in Preview"
          onClick={() => onOpenPreview(p.url)}
          icon="⧉"
          hoverColor={C.accent}
        />
        <ActionBtn
          title="Open in new tab"
          onClick={() => window.open(p.url, '_blank')}
          icon="↗"
          hoverColor="#60a5fa"
        />
        <ActionBtn
          title="Remove"
          onClick={() => onRemove(p.port)}
          icon="✕"
          hoverColor={C.red}
        />
      </div>
    </div>
  );
};

const ActionBtn: React.FC<{
  title: string; onClick: () => void; icon: string; hoverColor: string;
}> = ({ title, onClick, icon, hoverColor }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      background: 'none', border: `1px solid transparent`,
      cursor: 'pointer', color: C.dim, padding: '3px 6px',
      borderRadius: 4, fontSize: 12, lineHeight: 1, fontFamily: 'inherit',
    }}
    onMouseEnter={e => { e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverColor + '44'; e.currentTarget.style.background = hoverColor + '11'; }}
    onMouseLeave={e => { e.currentTarget.style.color = C.dim; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
  >
    {icon}
  </button>
);

/* ─── Main Component ─────────────────────────────────────── */
const PortManager: React.FC = () => {
  const { ports, addPort, removePort } = useEditorStore();
  const [wcReady, setWcReady]   = useState(false);
  const [logs, setLogs]         = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const pushLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-199), msg]);
  }, []);

  /* ── Register WebContainer listeners ── */
  useEffect(() => {
    registerWCListeners({
      onStatusChange: (s) => {
        if (s === 'ready') setWcReady(true);
        if (s === 'idle' || s === 'error') setWcReady(false);
      },
      onPortReady: (port, url) => {
        addPort({ port, url, status: 'running', command: 'dev server' });
        pushLog(`🌐 Port ${port} opened → ${url}`);
      },
      onPortClose: (port) => {
        removePort(port);
        pushLog(`🔌 Port ${port} closed`);
      },
      onLog: (msg) => pushLog(msg),
    });

    // Check if WC already booted
    if (getWCStatus() === 'ready') setWcReady(true);
  }, [addPort, removePort, pushLog]);

  const openPreview = useCallback((url: string) => {
    // Send message to PreviewPane to load this URL
    window.dispatchEvent(new CustomEvent('wc-preview-url', { detail: { url } }));
  }, []);

  const handleBoot = useCallback(async () => {
    pushLog('🚀 Booting WebContainer…');
    try {
      await getWebContainer();
    } catch (err) {
      pushLog(`❌ ${String(err)}`);
    }
  }, [pushLog]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{
        padding: '8px 12px 6px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted }}>
            Ports
          </span>
          {/* WC Status indicator */}
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 600,
            background: wcReady ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
            color: wcReady ? C.green : C.dim,
            border: `1px solid ${wcReady ? 'rgba(74,222,128,0.3)' : C.border}`,
          }}>
            WC {wcReady ? 'READY' : 'IDLE'}
          </span>
          <div style={{ flex: 1 }} />
          {logs.length > 0 && (
            <button
              onClick={() => setShowLogs(v => !v)}
              style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 3,
                background: showLogs ? 'rgba(229,164,90,0.12)' : 'transparent',
                border: `1px solid ${showLogs ? 'rgba(229,164,90,0.3)' : C.border}`,
                color: showLogs ? C.accent : C.muted, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {showLogs ? 'Hide' : 'Logs'} ({logs.length})
            </button>
          )}
        </div>

        {/* Boot button if WC not started */}
        {!wcReady && (
          <button
            onClick={handleBoot}
            style={{
              width: '100%', padding: '6px', fontSize: 11, borderRadius: 5,
              background: 'rgba(229,164,90,0.1)', border: `1px solid rgba(229,164,90,0.3)`,
              color: C.accent, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            ⚡ Boot WebContainer
          </button>
        )}
      </div>

      {/* ── Log panel ── */}
      {showLogs && (
        <div style={{
          maxHeight: 140, overflow: 'auto', flexShrink: 0,
          background: '#0e0e10', borderBottom: `1px solid ${C.border}`,
          padding: '6px 10px',
        }}>
          {logs.map((l, i) => (
            <div key={i} style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', lineHeight: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {l}
            </div>
          ))}
        </div>
      )}

      {/* ── Port list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ports.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: C.dim, fontSize: 12, textAlign: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>🔌</div>
            <div>No running servers</div>
            <div style={{ fontSize: 10, color: '#444', maxWidth: 180, lineHeight: 1.5 }}>
              Start a dev server in the Terminal — it will appear here automatically.
            </div>
          </div>
        ) : (
          ports.map(p => (
            <PortCard
              key={p.port}
              port={p}
              onRemove={removePort}
              onOpenPreview={openPreview}
            />
          ))
        )}

        <ManualPortForm onAdd={addPort} />
      </div>
    </div>
  );
};

export default PortManager;
