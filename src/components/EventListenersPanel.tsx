import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { EventBinding } from '../store/editorStore';
import { FiPlus, FiTrash2, FiZap, FiChevronDown, FiChevronRight, FiCheck } from 'react-icons/fi';

const C = {
  bg: '#161618', surface: '#1e1e20', surface2: '#252528',
  border: '#333336', accent: '#e5a45a', accentBg: 'rgba(229,164,90,0.12)',
  accentBrd: 'rgba(229,164,90,0.35)', text: '#d4d4d4', muted: '#888', dim: '#555',
  green: '#4ec9b0', red: '#f44747',
};

const inp: React.CSSProperties = {
  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3,
  padding: '3px 6px', fontSize: 10, color: C.text, outline: 'none',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};
const selStyle: React.CSSProperties = {
  ...inp, cursor: 'pointer', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: 20,
};

const DOM_EVENTS = [
  'click','dblclick','mouseenter','mouseleave','mouseover','mouseout','mousemove',
  'focus','blur','input','change','submit','keydown','keyup','keypress',
  'scroll','resize','load','contextmenu','custom',
];

const ACTIONS = [
  { value: 'playAnimation', label: '▶ Play Animation' },
  { value: 'toggleClass',   label: '⊞ Toggle Class' },
  { value: 'showHide',      label: '👁 Show / Hide' },
  { value: 'setAttribute',  label: '✎ Set Attribute' },
  { value: 'snippet',       label: '⌨ Run Snippet' },
];

function generateBindingCode(b: EventBinding): string {
  const eventName = b.event === 'custom' ? (b.customEvent || 'myevent') : b.event;
  const target = b.target || 'body';
  let action = '';
  switch (b.action) {
    case 'playAnimation':
      action = `el.style.animation='none';void el.offsetWidth;el.style.animation='${b.animationName||'fadeIn'} ${b.animationDuration||'0.6s'} ${b.animationEasing||'ease'} both';`;
      break;
    case 'toggleClass':
      action = `el.classList.toggle(${JSON.stringify(b.className||'active')});`;
      break;
    case 'showHide':
      action = `el.style.display=el.style.display==='none'?'':'none';`;
      break;
    case 'setAttribute':
      action = `el.setAttribute(${JSON.stringify(b.attrName||'data-state')},${JSON.stringify(b.attrValue||'active')});`;
      break;
    case 'snippet':
      action = (b.snippet || '').trim();
      break;
  }
  return `  document.querySelectorAll(${JSON.stringify(target)}).forEach(function(el){el.addEventListener(${JSON.stringify(eventName)},function(event){${action}});});`;
}

function buildRuntimeScript(bindings: EventBinding[]): string {
  const enabled = bindings.filter(b => b.enabled);
  if (!enabled.length) return '';
  const lines = enabled.map(generateBindingCode).join('\n');
  return `(function(){\n  function init(){\n${lines}\n  }\n  if(document.readyState!=='loading')init();\n  else document.addEventListener('DOMContentLoaded',init);\n})();`;
}

function injectIntoHtml(html: string, script: string): string {
  const cleaned = html.replace(/\n?\s*<script\s+id=["']__event_listeners__["'][\s\S]*?<\/script>/i, '');
  if (!script.trim()) return cleaned;
  const block = `<script id="__event_listeners__">\n${script}\n</script>`;
  if (cleaned.includes('</body>')) return cleaned.replace('</body>', `${block}\n</body>`);
  return `${cleaned}\n${block}`;
}

function emptyBinding(): EventBinding {
  return { id: Date.now().toString(), target: '', event: 'click', action: 'playAnimation', animationName: 'fadeIn', animationDuration: '0.6s', animationEasing: 'ease', className: 'active', attrName: 'data-state', attrValue: 'active', snippet: '', enabled: true };
}

/* ── Field row helper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 5 }}>
      <span style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      {children}
    </div>
  );
}

/* ── Single binding card ── */
function BindingCard({ binding, onUpdate, onDelete, selectedSelector }: {
  binding: EventBinding;
  onUpdate: (updates: Partial<EventBinding>) => void;
  onDelete: () => void;
  selectedSelector: string | null;
}) {
  const [open, setOpen] = useState(false);
  const eventLabel = binding.event === 'custom' ? (binding.customEvent || 'custom') : binding.event;
  const actionLabel = ACTIONS.find(a => a.value === binding.action)?.label.replace(/^[^\s]+\s/, '') || binding.action;

  return (
    <div style={{ border: `1px solid ${binding.enabled ? C.border : '#2a2a2c'}`, borderRadius: 5, overflow: 'hidden', marginBottom: 4, opacity: binding.enabled ? 1 : 0.5 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 7px', background: C.surface, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ enabled: !binding.enabled }); }}
          title={binding.enabled ? 'Disable' : 'Enable'}
          style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${binding.enabled ? C.accent : C.dim}`, background: binding.enabled ? C.accentBg : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          {binding.enabled && <FiCheck size={9} color={C.accent} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: C.accent }}>{binding.target || '(no target)'}</span>
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{eventLabel} → {actionLabel}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 2, flexShrink: 0, display: 'flex' }} title="Delete">
          <FiTrash2 size={11} />
        </button>
        <span style={{ color: C.dim, flexShrink: 0 }}>{open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}</span>
      </div>

      {/* Expanded editor */}
      {open && (
        <div style={{ padding: '8px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
          <Field label="Target Selector">
            <div style={{ display: 'flex', gap: 4 }}>
              <input style={{ ...inp, flex: 1 }} value={binding.target} placeholder=".my-btn, #hero, h1"
                onChange={e => onUpdate({ target: e.target.value })} />
              {selectedSelector && (
                <button onClick={() => onUpdate({ target: selectedSelector })}
                  style={{ padding: '2px 6px', fontSize: 9, borderRadius: 3, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  Use selected
                </button>
              )}
            </div>
          </Field>

          <Field label="Event">
            <div style={{ display: 'flex', gap: 4 }}>
              <select style={{ ...selStyle, flex: 1 }} value={binding.event} onChange={e => onUpdate({ event: e.target.value })}>
                {DOM_EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
              {binding.event === 'custom' && (
                <input style={{ ...inp, flex: 1 }} value={binding.customEvent || ''} placeholder="my-event-name"
                  onChange={e => onUpdate({ customEvent: e.target.value })} />
              )}
            </div>
          </Field>

          <Field label="Action">
            <select style={selStyle} value={binding.action} onChange={e => onUpdate({ action: e.target.value as EventBinding['action'] })}>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>

          {binding.action === 'playAnimation' && (
            <>
              <Field label="Animation Name">
                <input style={inp} value={binding.animationName || ''} placeholder="fadeIn, bounce, slideUp…"
                  onChange={e => onUpdate({ animationName: e.target.value })} />
              </Field>
              <div style={{ display: 'flex', gap: 6 }}>
                <Field label="Duration">
                  <input style={inp} value={binding.animationDuration || ''} placeholder="0.6s"
                    onChange={e => onUpdate({ animationDuration: e.target.value })} />
                </Field>
                <Field label="Easing">
                  <input style={inp} value={binding.animationEasing || ''} placeholder="ease"
                    onChange={e => onUpdate({ animationEasing: e.target.value })} />
                </Field>
              </div>
            </>
          )}

          {binding.action === 'toggleClass' && (
            <Field label="Class Name">
              <input style={inp} value={binding.className || ''} placeholder="active, is-open, dark…"
                onChange={e => onUpdate({ className: e.target.value })} />
            </Field>
          )}

          {binding.action === 'setAttribute' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Field label="Attribute">
                <input style={inp} value={binding.attrName || ''} placeholder="data-state"
                  onChange={e => onUpdate({ attrName: e.target.value })} />
              </Field>
              <Field label="Value">
                <input style={inp} value={binding.attrValue || ''} placeholder="active"
                  onChange={e => onUpdate({ attrValue: e.target.value })} />
              </Field>
            </div>
          )}

          {binding.action === 'snippet' && (
            <Field label="JavaScript Snippet">
              <textarea style={{ ...inp, height: 72, resize: 'vertical', lineHeight: 1.4, fontFamily: 'monospace' } as React.CSSProperties}
                value={binding.snippet || ''} placeholder={'el.style.color = "red";\nconsole.log(el);'}
                onChange={e => onUpdate({ snippet: e.target.value })} />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ── */
const EventListenersPanel: React.FC = () => {
  const {
    eventBindings, addEventBinding, removeEventBinding, updateEventBinding,
    files, updateFileContent, showNotification, selectedSelector,
  } = useEditorStore();

  const [injected, setInjected] = useState(false);

  const handleInject = useCallback(() => {
    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    const script = buildRuntimeScript(eventBindings);
    const updated = injectIntoHtml(htmlFile.content, script);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
    setInjected(true);
    showNotification(eventBindings.filter(b => b.enabled).length + ' event listener(s) injected');
    setTimeout(() => setInjected(false), 2000);
  }, [eventBindings, files, updateFileContent, showNotification]);

  const handleAdd = () => addEventBinding(emptyBinding());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 32, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <FiZap size={12} color={C.accent} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>Events</span>
        <button onClick={handleAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, fontFamily: 'inherit' }}>
          <FiPlus size={10} /> Add
        </button>
      </div>

      {/* Binding list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 8 }}>
        {eventBindings.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center' }}>
            <FiZap size={22} color={C.dim} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>No event listeners yet</div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 12 }}>Click <strong style={{ color: C.accent }}>+ Add</strong> to bind a DOM event to an action — no code required.</div>
            <button onClick={handleAdd}
              style={{ padding: '5px 14px', fontSize: 10, borderRadius: 4, cursor: 'pointer', background: C.accentBg, border: `1px solid ${C.accentBrd}`, color: C.accent, fontFamily: 'inherit' }}>
              + Add First Listener
            </button>
          </div>
        ) : (
          eventBindings.map(b => (
            <BindingCard
              key={b.id}
              binding={b}
              selectedSelector={selectedSelector}
              onUpdate={updates => updateEventBinding(b.id, updates)}
              onDelete={() => removeEventBinding(b.id)}
            />
          ))
        )}
      </div>

      {/* Footer — inject button */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: '6px 8px', background: C.surface, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, color: C.dim, flex: 1 }}>
          {eventBindings.filter(b => b.enabled).length} active / {eventBindings.length} total
        </span>
        <button onClick={handleInject}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 10, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            background: injected ? 'rgba(78,201,176,0.15)' : C.accentBg,
            border: `1px solid ${injected ? 'rgba(78,201,176,0.5)' : C.accentBrd}`,
            color: injected ? C.green : C.accent }}>
          {injected ? <><FiCheck size={10} /> Injected!</> : <><FiZap size={10} /> Inject into Page</>}
        </button>
      </div>
    </div>
  );
};

export default EventListenersPanel;
