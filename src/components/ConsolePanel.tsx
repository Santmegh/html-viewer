import React, { useRef, useEffect, useState } from 'react';
import { Console } from 'console-feed';
import { useEditorStore } from '../store/editorStore';

type Methods = 'log' | 'debug' | 'info' | 'warn' | 'error' | 'table' | 'clear' | 'time' | 'timeEnd' | 'count' | 'assert' | 'command' | 'result' | 'dir';

const SKU = {
  hdr: 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)',
  bar: 'linear-gradient(180deg,#222226 0%,#1e1e22 100%)',
  btn: 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)',
  abtn: 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)',
  shadow_raised: 'inset 0 1px 0 rgba(255,255,255,0.13),0 2px 5px rgba(0,0,0,0.5)',
  shadow_sunken: 'inset 0 2px 4px rgba(0,0,0,0.55)',
};

const ConsolePanel: React.FC = () => {
  const { consoleEntries, clearConsole } = useEditorStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleEntries, autoScroll]);

  const errCount = consoleEntries.filter(e => e.type === 'error').length;
  const warnCount = consoleEntries.filter(e => e.type === 'warn').length;

  const filtered = filter === 'all'
    ? consoleEntries
    : consoleEntries.filter(e => e.type === filter);

  const messages = filtered.map(e => ({
    id: e.id,
    method: e.type as Methods,
    data: [e.message],
  }));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      background: '#1e1e22', color: '#d8d8d8',
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
      fontSize: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', borderBottom: '1px solid rgba(0,0,0,0.5)',
        background: SKU.hdr, flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 10,
      }}>
        <span style={{ fontSize: 10, color: '#888', fontFamily: "'Inter', sans-serif", fontWeight: 700, marginRight: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CONSOLE</span>

        {(['all', 'log', 'warn', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '2px 9px', fontSize: 9, borderRadius: 6, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontWeight: 700, border: 'none',
              background: filter === f ? SKU.abtn : SKU.btn,
              color: filter === f ? '#1a0d00'
                : f === 'error' && errCount > 0 ? '#f47171'
                : f === 'warn' && warnCount > 0 ? '#e5a45a'
                : '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              boxShadow: SKU.shadow_raised,
              transition: 'all 0.1s',
            }}
          >
            {f}{f === 'error' && errCount > 0 ? ` (${errCount})` : ''}{f === 'warn' && warnCount > 0 ? ` (${warnCount})` : ''}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setAutoScroll(v => !v)}
          title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          style={{
            padding: '2px 9px', fontSize: 9, borderRadius: 6, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 700, border: 'none',
            background: autoScroll ? 'rgba(78,201,176,0.15)' : SKU.btn,
            color: autoScroll ? '#4ec9b0' : '#666',
            boxShadow: SKU.shadow_raised,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >↓ Auto</button>

        <button
          onClick={clearConsole}
          title="Clear console"
          style={{
            padding: '2px 9px', fontSize: 9, borderRadius: 6, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontWeight: 700, border: 'none',
            background: SKU.btn, color: '#888',
            boxShadow: SKU.shadow_raised,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f47171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; }}
        >✕ Clear</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#1e1e22' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '20px', color: '#444', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
            {consoleEntries.length === 0
              ? 'No console output yet — run your code in the preview.'
              : `No ${filter} entries.`}
          </div>
        ) : (
          <Console
            logs={messages}
            variant="dark"
            styles={{
              BASE_BACKGROUND_COLOR: '#1e1e1e',
              LOG_BACKGROUND: '#1e1e1e',
              LOG_WARN_BACKGROUND: 'rgba(229,164,90,0.06)',
              LOG_ERROR_BACKGROUND: 'rgba(244,113,113,0.07)',
              BASE_FONT_SIZE: '12px',
              BASE_FONT_FAMILY: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
              PADDING: '3px 10px',
            }}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ConsolePanel;
