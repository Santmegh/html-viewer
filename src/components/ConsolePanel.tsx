import React, { useRef, useEffect, useState } from 'react';
import { Console } from 'console-feed';
import { useEditorStore } from '../store/editorStore';

type Methods = 'log' | 'debug' | 'info' | 'warn' | 'error' | 'table' | 'clear' | 'time' | 'timeEnd' | 'count' | 'assert' | 'command' | 'result' | 'dir';

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
      background: '#1e1e1e', color: '#ccc',
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
      fontSize: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', borderBottom: '1px solid #2d2d2d',
        background: '#252526', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#888', fontFamily: "'Inter', sans-serif", fontWeight: 600, marginRight: 4 }}>CONSOLE</span>

        {(['all', 'log', 'warn', 'error'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '2px 8px', fontSize: 10, borderRadius: 3, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontWeight: 600, border: 'none',
              background: filter === f ? 'rgba(100,160,255,0.15)' : 'transparent',
              color: filter === f ? '#7ab8f5'
                : f === 'error' && errCount > 0 ? '#f47171'
                : f === 'warn' && warnCount > 0 ? '#e5a45a'
                : '#666',
              textTransform: 'uppercase',
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
            padding: '2px 7px', fontSize: 10, borderRadius: 3, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", border: '1px solid transparent',
            background: autoScroll ? 'rgba(100,180,100,0.12)' : 'transparent',
            color: autoScroll ? '#7ecb7e' : '#555',
          }}
        >↓ Auto</button>

        <button
          onClick={clearConsole}
          title="Clear console"
          style={{
            padding: '2px 8px', fontSize: 10, borderRadius: 3, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", border: '1px solid #3a3a3a',
            background: 'transparent', color: '#888',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f47171'; (e.currentTarget as HTMLElement).style.borderColor = '#f47171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'; }}
        >✕ Clear</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#1e1e1e' }}>
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
