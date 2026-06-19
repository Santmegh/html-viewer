import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { spawnShell, getWebContainer, getWCStatus } from '../utils/webcontainer';
import { useEditorStore } from '../store/editorStore';

/* ─── Design tokens ──────────────────────────────────────── */
const T = {
  bg:      '#141417',
  panel:   '#1e1e22',
  border:  'rgba(255,255,255,0.08)',
  accent:  '#e5a45a',
  green:   '#4ade80',
  red:     '#f87171',
  muted:   '#555',
  text:    '#d4d4d4',
};

/* ─── Status dot ─────────────────────────────────────────── */
type ConnStatus = 'idle' | 'booting' | 'connecting' | 'connected' | 'error' | 'exited';

const STATUS_COLOR: Record<ConnStatus, string> = {
  idle:       '#555',
  booting:    '#facc15',
  connecting: '#facc15',
  connected:  '#4ade80',
  error:      '#f87171',
  exited:     '#f87171',
};

const STATUS_LABEL: Record<ConnStatus, string> = {
  idle:       'Idle',
  booting:    'Booting WebContainer…',
  connecting: 'Connecting…',
  connected:  'Connected',
  error:      'Error',
  exited:     'Disconnected',
};

/* ─── Single terminal session ────────────────────────────── */
interface Session {
  id: string;
  xterm: XTerm;
  fitAddon: FitAddon;
  kill?: () => void;
}

let sessionCounter = 0;

/* ─── Terminal Panel ─────────────────────────────────────── */
export const Terminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionsRef  = useRef<Session[]>([]);
  const [activeId, setActiveId]     = useState<string>('');
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [status, setStatus]         = useState<ConnStatus>('idle');
  const addPort   = useEditorStore(s => s.addPort);
  const removePort = useEditorStore(s => s.removePort);

  /* ── Create a new terminal session ── */
  const createSession = useCallback(async () => {
    const id = `term-${++sessionCounter}`;

    const xterm = new XTerm({
      theme: {
        background:   '#141417',
        foreground:   '#d4d4d4',
        cursor:       '#e5a45a',
        cursorAccent: '#141417',
        black: '#1e1e1e', brightBlack: '#555',
        red: '#f87171',   brightRed: '#fc8181',
        green: '#4ade80', brightGreen: '#86efac',
        yellow: '#facc15',brightYellow: '#fde047',
        blue: '#60a5fa',  brightBlue: '#93c5fd',
        magenta: '#c084fc',brightMagenta: '#d8b4fe',
        cyan: '#22d3ee',  brightCyan: '#67e8f9',
        white: '#d4d4d4', brightWhite: '#f5f5f5',
      },
      fontSize: 13,
      fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      scrollback: 2000,
      allowTransparency: true,
    });

    const fit = new FitAddon();
    xterm.loadAddon(fit);

    const session: Session = { id, xterm, fitAddon: fit };
    sessionsRef.current.push(session);
    setSessionIds(prev => [...prev, id]);
    setActiveId(id);

    // Connect shell
    const connectShell = async () => {
      setStatus('booting');
      xterm.writeln('\x1b[33m⏳ Booting WebContainer…\x1b[0m');
      try {
        await getWebContainer();
        setStatus('connecting');
        xterm.clear();
        xterm.writeln('\x1b[32m● WebContainer ready — opening shell…\x1b[0m\r\n');

        const shell = await spawnShell(xterm.cols || 80, xterm.rows || 24);
        session.kill = () => shell.kill();

        // Pipe output to terminal
        shell.output.pipeTo(new WritableStream({
          write(data) { xterm.write(data); },
        })).catch(() => {
          setStatus('exited');
          xterm.writeln('\r\n\x1b[31m● Shell exited\x1b[0m');
        });

        // Send input to shell
        xterm.onData(data => shell.input.write(data).catch(() => {}));

        // Handle resize
        xterm.onResize(({ cols, rows }) => shell.resize(cols, rows));

        setStatus('connected');
      } catch (err) {
        setStatus('error');
        xterm.writeln(`\r\n\x1b[31m● Failed: ${String(err)}\x1b[0m`);
        xterm.writeln('\x1b[2m  Make sure COOP/COEP headers are set in vite.config.ts\x1b[0m');
      }
    };

    connectShell();
    return id;
  }, [addPort, removePort]);

  /* ── Mount xterm into DOM when active session changes ── */
  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const session = sessionsRef.current.find(s => s.id === activeId);
    if (!session) return;

    // Clear container and open terminal
    containerRef.current.innerHTML = '';
    session.xterm.open(containerRef.current);

    // Small delay to let DOM settle, then fit
    requestAnimationFrame(() => {
      try { session.fitAddon.fit(); } catch { /* ignore */ }
    });
  }, [activeId]);

  /* ── Resize observer ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const session = sessionsRef.current.find(s => s.id === activeId);
      if (!session) return;
      try { session.fitAddon.fit(); } catch { /* ignore */ }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [activeId]);

  /* ── Initialize first session on mount ── */
  useEffect(() => {
    createSession();
    return () => {
      sessionsRef.current.forEach(s => { s.kill?.(); s.xterm.dispose(); });
      sessionsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Keep status dot in sync with WC status ── */
  useEffect(() => {
    const id = setInterval(() => {
      const wcStatus = getWCStatus();
      if (wcStatus === 'idle' && status !== 'connected') setStatus('idle');
    }, 2000);
    return () => clearInterval(id);
  }, [status]);

  const closeSession = useCallback((id: string) => {
    const session = sessionsRef.current.find(s => s.id === id);
    if (session) {
      session.kill?.();
      session.xterm.dispose();
      sessionsRef.current = sessionsRef.current.filter(s => s.id !== id);
    }
    setSessionIds(prev => {
      const next = prev.filter(s => s !== id);
      if (next.length > 0) setActiveId(next[next.length - 1]);
      return next;
    });
  }, []);

  const clearActive = useCallback(() => {
    const session = sessionsRef.current.find(s => s.id === activeId);
    session?.xterm.clear();
  }, [activeId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 32, flexShrink: 0,
        background: 'linear-gradient(180deg,#2a2a2e 0%,#222226 100%)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 8px', gap: 4,
      }}>
        {/* Status */}
        <span
          title={STATUS_LABEL[status]}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: STATUS_COLOR[status],
            flexShrink: 0,
            boxShadow: status === 'connected' ? '0 0 6px #4ade80' : undefined,
          }}
        />

        {/* Session tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          {sessionIds.map((sid, i) => (
            <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <button
                onClick={() => setActiveId(sid)}
                style={{
                  padding: '2px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                  background: activeId === sid ? 'rgba(229,164,90,0.15)' : 'transparent',
                  border: `1px solid ${activeId === sid ? 'rgba(229,164,90,0.4)' : 'transparent'}`,
                  color: activeId === sid ? T.accent : '#777',
                  fontFamily: 'inherit',
                }}
              >
                Terminal {i + 1}
              </button>
              {sessionIds.length > 1 && (
                <button
                  onClick={() => closeSession(sid)}
                  title="Close"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#555', fontSize: 11, lineHeight: 1, padding: '1px 2px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.red)}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Right-side buttons */}
        <button
          onClick={clearActive}
          title="Clear terminal"
          style={{
            background: 'none', border: `1px solid transparent`, cursor: 'pointer',
            color: '#666', fontSize: 10, borderRadius: 3, padding: '2px 6px',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = T.border; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          Clear
        </button>
        <button
          onClick={createSession}
          title="New terminal tab"
          style={{
            background: 'none', border: `1px solid transparent`, cursor: 'pointer',
            color: '#666', fontSize: 16, lineHeight: '14px', borderRadius: 3, padding: '2px 6px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = 'rgba(229,164,90,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          +
        </button>
      </div>

      {/* ── Status Banner (when not connected) ── */}
      {status !== 'connected' && sessionIds.length > 0 && (
        <div style={{
          background: 'rgba(229,164,90,0.06)', borderBottom: `1px solid rgba(229,164,90,0.15)`,
          padding: '4px 12px', fontSize: 10, color: '#888', flexShrink: 0,
        }}>
          {status === 'booting' && '⏳ Booting WebContainer (first time may take 10–30s)…'}
          {status === 'connecting' && '🔗 Connecting shell…'}
          {status === 'error' && '❌ Connection failed — COOP/COEP headers required'}
          {status === 'exited' && '🔄 Shell exited — open a new terminal to reconnect'}
          {status === 'idle' && '💤 Idle — open a new terminal to start'}
        </div>
      )}

      {/* ── xterm container ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, padding: '4px 2px', overflow: 'hidden' }}
      />
    </div>
  );
};
