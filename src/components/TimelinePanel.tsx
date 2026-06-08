import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useContextMenu } from './ContextMenu';
import { FiPlay, FiSquare, FiPlus, FiZoomIn, FiZoomOut, FiX, FiRefreshCw, FiCheck, FiEdit3, FiTrash2, FiSave, FiCopy } from 'react-icons/fi';
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES, KEYFRAMES_MAP, PRESET_BY_NAME } from '../lib/animations';
import { getTargetHtmlFile } from '../utils/projectFiles';

type Track = import('../store/editorStore').TimelineTrack;
type CustomAnimation = import('../store/editorStore').CustomAnimation;

const COLORS = ['#e5a45a', '#4ec9b0', '#9cdcfe', '#dcdcaa', '#c586c0', '#f44747', '#89d185'];
const TRACK_H = 32;

const C = {
  bg: '#1e1e22',
  surface: '#252528',
  surface2: '#2d2d32',
  border: 'rgba(0,0,0,0.5)',
  accent: '#e5a45a',
  accentBg: 'rgba(229,164,90,0.12)',
  accentBrd: 'rgba(229,164,90,0.45)',
  text: '#d8d8d8',
  muted: '#888',
  dim: '#555',
  green: '#4ec9b0',
  blue: '#9cdcfe',
};

const SKU = {
  hdr: 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)',
  bar: 'linear-gradient(180deg,#222226 0%,#1e1e22 100%)',
  btn: 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)',
  abtn: 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)',
  shadow_raised: 'inset 0 1px 0 rgba(255,255,255,0.13),0 2px 5px rgba(0,0,0,0.5)',
  shadow_sunken: 'inset 0 2px 4px rgba(0,0,0,0.55)',
};

const EASING_NAMED: { label: string; value: string }[] = [
  { label: 'ease', value: 'ease' },
  { label: 'linear', value: 'linear' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'spring', value: 'cubic-bezier(0.68,-0.55,0.27,1.55)' },
  { label: 'bounce', value: 'cubic-bezier(0.34,1.56,0.64,1)' },
  { label: 'snap', value: 'cubic-bezier(0.175,0.885,0.32,1.275)' },
  { label: 'smooth', value: 'cubic-bezier(0.25,0.46,0.45,0.94)' },
  { label: 'sharp', value: 'cubic-bezier(0.4,0,0.6,1)' },
  { label: 'steps(4)', value: 'steps(4, end)' },
  { label: 'steps(10)', value: 'steps(10, end)' },
];

function parseCubicBezier(v: string): [number, number, number, number] | null {
  const m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

function MiniCurve({ value, size = 28 }: { value: string; size?: number }) {
  let x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1;
  const named: Record<string, [number, number, number, number]> = {
    'ease': [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1], 'linear': [0, 0, 1, 1],
  };
  const p = parseCubicBezier(value) || named[value];
  if (p) { [x1, y1, x2, y2] = p; }
  const S = size;
  const PAD = 3;
  const W = S - PAD * 2;
  return (
    <svg width={S} height={S} style={{ flexShrink: 0 }}>
      <rect x={0} y={0} width={S} height={S} fill="rgba(0,0,0,0.3)" rx="4" />
      <path
        d={`M${PAD},${PAD + W} C${PAD + x1 * W},${PAD + (1 - y1) * W} ${PAD + x2 * W},${PAD + (1 - y2) * W} ${PAD + W},${PAD}`}
        fill="none" stroke={C.accent} strokeWidth="2"
      />
    </svg>
  );
}

function CubicBezierEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseCubicBezier(value) || [0.25, 0.1, 0.25, 1];
  const [x1, y1, x2, y2] = parsed;
  const SIZE = 80;
  const PAD = 10;
  const toSvg = (nx: number, ny: number) => ({ x: PAD + nx * SIZE, y: PAD + (1 - ny) * SIZE });
  const p0 = { x: PAD, y: PAD + SIZE };
  const p3 = { x: PAD + SIZE, y: PAD };
  const c1 = toSvg(x1, y1);
  const c2 = toSvg(x2, y2);

  const dragHandle = (which: 1 | 2, e: React.MouseEvent<SVGCircleElement>) => {
    e.preventDefault();
    const svgEl = (e.currentTarget as SVGElement).closest('svg') as SVGSVGElement;
    if (!svgEl) return;
    const onMove = (ev: MouseEvent) => {
      const rect = svgEl.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (ev.clientX - rect.left - PAD) / SIZE));
      const ny = 1 - (ev.clientY - rect.top - PAD) / SIZE;
      if (which === 1) onChange(`cubic-bezier(${nx.toFixed(2)},${ny.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`);
      else onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${nx.toFixed(2)},${ny.toFixed(2)})`);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ background: C.surface, borderRadius: 8, padding: 8, border: `1px solid ${C.border}`, boxShadow: SKU.shadow_sunken }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontWeight: 700 }}>Curve Editor</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <svg width={SIZE + PAD * 2} height={SIZE + PAD * 2} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, flexShrink: 0, cursor: 'crosshair', border: `1px solid ${C.border}` }}>
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t}>
              <line x1={PAD + t * SIZE} y1={PAD} x2={PAD + t * SIZE} y2={PAD + SIZE} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1={PAD} y1={PAD + t * SIZE} x2={PAD + SIZE} y2={PAD + t * SIZE} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </g>
          ))}
          <line x1={p0.x} y1={p0.y} x2={c1.x} y2={c1.y} stroke={C.green} strokeWidth="1" opacity="0.4" />
          <line x1={p3.x} y1={p3.y} x2={c2.x} y2={c2.y} stroke={C.blue} strokeWidth="1" opacity="0.4" />
          <path d={`M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`} fill="none" stroke={C.accent} strokeWidth="2" />
          <circle cx={c1.x} cy={c1.y} r={5} fill={C.green} stroke="#fff" strokeWidth="1.5" style={{ cursor: 'grab' }} onMouseDown={e => dragHandle(1, e)} />
          <circle cx={c2.x} cy={c2.y} r={5} fill={C.blue} stroke="#fff" strokeWidth="1.5" style={{ cursor: 'grab' }} onMouseDown={e => dragHandle(2, e)} />
          <circle cx={p0.x} cy={p0.y} r={3} fill="#444" />
          <circle cx={p3.x} cy={p3.y} r={3} fill="#444" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {[['X1', x1, (v: number) => onChange(`cubic-bezier(${v.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y1', y1, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${v.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['X2', x2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${v.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y2', y2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${v.toFixed(2)})`)]].map(([label, val, setter]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: (label as string).includes('1') ? C.green : C.blue, width: 16, fontWeight: 800, flexShrink: 0 }}>{label as string}</span>
              <input type="number" min="-2" max="3" step="0.01" value={(val as number).toFixed(2)}
                onChange={e => (setter as (v: number) => void)(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 6px', fontSize: 10, color: C.text, outline: 'none', fontFamily: 'var(--app-font-mono)', boxShadow: SKU.shadow_sunken }}
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
        {EASING_NAMED.map(p => {
          const isA = value === p.value;
          return (
            <button key={p.label} onClick={() => onChange(p.value)}
              style={{ padding: '2px 8px', fontSize: 9, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                background: isA ? SKU.abtn : SKU.btn, border: `1px solid ${isA ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.5)'}`,
                color: isA ? '#1a0d00' : C.muted, boxShadow: SKU.shadow_raised }}>
              {p.label}
            </button>
          );
        })}
      </div>
      {value.startsWith('cubic-bezier') && (
        <div style={{ fontSize: 9, color: C.dim, marginTop: 6, fontFamily: 'var(--app-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{value}</div>
      )}
    </div>
  );
}

function showDragCapture(cursor: string) {
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
  const overlay = document.getElementById('__drag-capture');
  if (overlay) { overlay.style.display = 'block'; overlay.style.cursor = cursor; }
}
function hideDragCapture() {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  const overlay = document.getElementById('__drag-capture');
  if (overlay) overlay.style.display = 'none';
}

const CLICK_RUNTIME = `
(function(){
  if (window.__timelineClickWired) return; window.__timelineClickWired = true;
  document.addEventListener('click', function(e){
    var els = document.querySelectorAll('[data-tl-click]');
    els.forEach(function(el){
      if (el === e.target || el.contains(e.target)) {
        el.classList.remove('__tl-clicked');
        void el.offsetWidth;
        el.classList.add('__tl-clicked');
      }
    });
  }, true);
})();`.trim();

const SCROLL_RUNTIME = `
(function(){
  if (window.__timelineScrollWired) return; window.__timelineScrollWired = true;
  var sels = __SCROLL_SELS__;
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.remove('__tl-scrolled');
        void entry.target.offsetWidth;
        entry.target.classList.add('__tl-scrolled');
      }
    });
  }, { threshold: 0.12 });
  function tag(){
    sels.forEach(function(s){
      try { document.querySelectorAll(s).forEach(function(el){ el.setAttribute('data-tl-scroll','1'); obs.observe(el); }); } catch(e){}
    });
  }
  if (document.readyState !== 'loading') tag();
  else document.addEventListener('DOMContentLoaded', tag);
})();`.trim();

function buildAnimationCSS(tracks: Track[], custom: CustomAnimation[]): { css: string; needsClickRuntime: boolean; clickSelectors: string[]; scrollSelectors: string[] } {
  const customMap: Record<string, string> = {};
  custom.forEach(c => { customMap[c.name] = c.keyframes; });
  const usedNames = new Set(tracks.map(t => t.animation).filter(a => a && a !== 'none'));
  const keyframeBlocks = Array.from(usedNames).map(p => customMap[p] || KEYFRAMES_MAP[p] || '').filter(Boolean).join('\n');
  const clickSelectors: string[] = [];
  const scrollSelectors: string[] = [];
  const rules = tracks.filter(t => t.animation !== 'none' && t.element.trim()).map(t => {
    const iter = t.iteration === 'infinite' ? 'infinite' : parseInt(t.iteration) || 1;
    const trigger = t.trigger || 'load';
    const animLine = `animation: ${t.animation} ${t.duration}s ${t.easing} ${t.delay}s ${iter} normal both !important; will-change: transform, opacity;`;
    if (trigger === 'hover') return `${t.element}:hover { ${animLine} }`;
    if (trigger === 'click') { clickSelectors.push(t.element.trim()); return `${t.element}.__tl-clicked { ${animLine} }`; }
    if (trigger === 'scroll') { scrollSelectors.push(t.element.trim()); return `${t.element}.__tl-scrolled { ${animLine} }`; }
    return `${t.element} { ${animLine} }`;
  }).join('\n');
  return { css: `${keyframeBlocks}\n${rules}`, needsClickRuntime: clickSelectors.length > 0, clickSelectors, scrollSelectors };
}

function injectTimelineCssIntoHtml(html: string, css: string, needsClickRuntime: boolean, clickSelectors: string[], scrollSelectors: string[]) {
  let cleaned = html
    .replace(/\n?\s*<style\s+id=["']timeline-animations["'][\s\S]*?<\/style>/i, '')
    .replace(/\n?\s*<script\s+id=["']timeline-click-runtime["'][\s\S]*?<\/script>/i, '')
    .replace(/\n?\s*<script\s+id=["']timeline-scroll-runtime["'][\s\S]*?<\/script>/i, '');
  if (!css.trim() && !needsClickRuntime && scrollSelectors.length === 0) return cleaned;
  const tagClickScript = needsClickRuntime
    ? `<script id="timeline-click-runtime">\n(function(){\n  var sels = ${JSON.stringify(clickSelectors)};\n  function tag(){ sels.forEach(function(s){ try { document.querySelectorAll(s).forEach(function(el){ el.setAttribute('data-tl-click','1'); }); } catch(e){} }); }\n  if (document.readyState !== 'loading') tag(); else document.addEventListener('DOMContentLoaded', tag);\n  ${CLICK_RUNTIME}\n})();\n</script>` : '';
  const tagScrollScript = scrollSelectors.length > 0
    ? `<script id="timeline-scroll-runtime">\n${SCROLL_RUNTIME.replace('__SCROLL_SELS__', JSON.stringify(scrollSelectors))}\n</script>` : '';
  const styleBlock = css.trim() ? `<style id="timeline-animations">\n${css}\n</style>` : '';
  const block = `${styleBlock}\n${tagClickScript}\n${tagScrollScript}`;
  if (cleaned.includes('</head>')) return cleaned.replace('</head>', `${block}\n</head>`);
  return `${block}\n${cleaned}`;
}

/* ── Visual Keyframe Editor ── */
interface VisualKF {
  id: string;
  pct: number;
  opacity: string;
  translateX: string;
  translateY: string;
  scale: string;
  rotate: string;
  backgroundColor: string;
  color: string;
}

function defaultKF(pct: number): VisualKF {
  return { id: `${pct}-${Date.now()}`, pct, opacity: '', translateX: '', translateY: '', scale: '', rotate: '', backgroundColor: '', color: '' };
}

function visualKFtoCode(name: string, stops: VisualKF[]): string {
  const sorted = [...stops].sort((a, b) => a.pct - b.pct);
  const lines = sorted.map(s => {
    const parts: string[] = [];
    const transforms: string[] = [];
    if (s.translateX.trim()) transforms.push(`translateX(${s.translateX})`);
    if (s.translateY.trim()) transforms.push(`translateY(${s.translateY})`);
    if (s.scale.trim()) transforms.push(`scale(${s.scale})`);
    if (s.rotate.trim()) transforms.push(`rotate(${s.rotate})`);
    if (transforms.length) parts.push(`transform: ${transforms.join(' ')}`);
    if (s.opacity.trim()) parts.push(`opacity: ${s.opacity}`);
    if (s.backgroundColor.trim()) parts.push(`background-color: ${s.backgroundColor}`);
    if (s.color.trim()) parts.push(`color: ${s.color}`);
    const body = parts.length ? parts.join('; ') : 'opacity: 1';
    return `  ${s.pct}% { ${body}; }`;
  });
  return `@keyframes ${name || 'myAnim'} {\n${lines.join('\n')}\n}`;
}

const VKF_PROPS: { key: keyof VisualKF; label: string; placeholder: string; color: string }[] = [
  { key: 'opacity',         label: 'Opacity',       placeholder: '0 → 1',       color: '#e5a45a' },
  { key: 'translateX',      label: 'Move X',        placeholder: '0px, -20px',  color: '#4ec9b0' },
  { key: 'translateY',      label: 'Move Y',        placeholder: '0px, 30px',   color: '#4ec9b0' },
  { key: 'scale',           label: 'Scale',         placeholder: '0.8, 1.2',    color: '#9cdcfe' },
  { key: 'rotate',          label: 'Rotate',        placeholder: '0deg, 360deg',color: '#c586c0' },
  { key: 'backgroundColor', label: 'BG Color',      placeholder: '#ff5252',     color: '#f48771' },
  { key: 'color',           label: 'Text Color',    placeholder: '#ffffff',     color: '#dcdcaa' },
];

function VisualKeyframeEditor({ name, stops, onChange }: {
  name: string;
  stops: VisualKF[];
  onChange: (stops: VisualKF[]) => void;
}) {
  const addStop = () => {
    const existing = stops.map(s => s.pct);
    const candidates = [0, 25, 50, 75, 100].filter(p => !existing.includes(p));
    const pct = candidates.length ? candidates[0] : Math.min(100, Math.max(0, Math.round((stops[stops.length - 1]?.pct ?? 50) + 25)));
    onChange([...stops, defaultKF(pct)].sort((a, b) => a.pct - b.pct));
  };
  const removeStop = (id: string) => onChange(stops.filter(s => s.id !== id));
  const updateStop = (id: string, field: keyof VisualKF, val: string | number) =>
    onChange(stops.map(s => s.id === id ? { ...s, [field]: val } : s));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stops.length === 0 && (
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: '12px 0' }}>
          No keyframes yet. Click <strong style={{ color: '#888' }}>+ Add Stop</strong> to begin.
        </div>
      )}
      {stops.map((s, idx) => (
        <div key={s.id} style={{ background: '#111', border: '1px solid #2e2e30', borderRadius: 5, overflow: 'hidden' }}>
          {/* Stop header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#18181a', borderBottom: '1px solid #252528' }}>
            <span style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>Stop {idx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <input type="range" min={0} max={100} step={1} value={s.pct}
                onChange={e => updateStop(s.id, 'pct', parseInt(e.target.value))}
                style={{ flex: 1, accentColor: '#e5a45a' } as any} />
              <span style={{ fontSize: 10, color: '#e5a45a', fontWeight: 700, minWidth: 30, textAlign: 'right', fontFamily: 'monospace' }}>{s.pct}%</span>
            </div>
            <button onClick={() => removeStop(s.id)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2, fontSize: 11 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f88')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}>✕</button>
          </div>
          {/* Properties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '6px 8px' }}>
            {VKF_PROPS.map(p => (
              <div key={p.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 8, color: p.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</span>
                <input
                  value={(s as any)[p.key]}
                  onChange={e => updateStop(s.id, p.key, e.target.value)}
                  placeholder={p.placeholder}
                  style={{ background: '#1a1a1c', border: '1px solid #2d2d2d', borderRadius: 3, padding: '2px 5px', fontSize: 10, color: '#ccc', outline: 'none', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Generated code preview */}
      {stops.length > 0 && (
        <div style={{ background: '#0d0d0f', border: '1px solid #252528', borderRadius: 4, padding: 8 }}>
          <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Generated CSS</div>
          <pre style={{ margin: 0, fontSize: 9, color: '#dcdcaa', fontFamily: 'monospace', lineHeight: 1.5, overflow: 'auto', maxHeight: 100 }}>
            {visualKFtoCode(name, stops)}
          </pre>
        </div>
      )}
      <button onClick={addStop}
        style={{ padding: '5px', background: 'rgba(156,220,254,0.06)', border: '1px dashed rgba(156,220,254,0.2)', borderRadius: 4, color: '#9cdcfe', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
        + Add Keyframe Stop
      </button>
    </div>
  );
}

const TimelinePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const {
    animationConfig, setAnimationConfig, selectedElement, setTimelineAnimationStyle,
    files, activeFileId, updateFileContent, showNotification, timelineState, setTimelineState, selectedSelector,
  } = useEditorStore();
  const { show: showCtx, element: ctxEl } = useContextMenu();

  const tracks = timelineState.tracks;
  const playing = timelineState.playing;
  const currentTime = timelineState.currentTime;
  const animationsApplied = timelineState.animationsApplied;
  const customAnimations = timelineState.customAnimations || [];
  const [zoom, setZoom] = useState(1);
  const [appliedMsg, setAppliedMsg] = useState(false);
  const [showPresetLibrary, setShowPresetLibrary] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomAnimation | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState<string | undefined>();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const totalDuration = Math.max(5, ...tracks.map(t => t.delay + t.duration));
  const labelWidth = 160;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [customEditorMode, setCustomEditorMode] = useState<'visual' | 'code'>('visual');
  const [visualKFs, setVisualKFs] = useState<VisualKF[]>([]);

  const allAnimationNames = useMemo(
    () => [...customAnimations.map(c => c.name), ...ANIMATION_PRESETS.map(p => p.name)],
    [customAnimations]
  );

  const pushAnimationCSS = useCallback((css: string) => {
    setTimelineAnimationStyle('');
    requestAnimationFrame(() => { requestAnimationFrame(() => setTimelineAnimationStyle(css)); });
  }, [setTimelineAnimationStyle]);

  const persistAnimations = useCallback((built: { css: string; needsClickRuntime: boolean; clickSelectors: string[]; scrollSelectors: string[] }) => {
    const htmlFile = getTargetHtmlFile(files, activeFileId);
    if (!htmlFile) return;
    const updated = injectTimelineCssIntoHtml(htmlFile.content, built.css, built.needsClickRuntime, built.clickSelectors, built.scrollSelectors);
    if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
  }, [activeFileId, files, updateFileContent]);

  const buildPreviewCSS = useCallback((forceLoad: boolean): string => {
    const previewTracks = forceLoad ? tracks.map(t => ({ ...t, trigger: 'load' as const })) : tracks;
    return buildAnimationCSS(previewTracks, customAnimations).css;
  }, [tracks, customAnimations]);

  useEffect(() => {
    let lastTime = performance.now();
    if (playing) {
      pushAnimationCSS(buildPreviewCSS(true));
      tickRef.current = setInterval(() => {
        const now = performance.now();
        const delta = ((now - lastTime) / 1000) * playbackRate;
        lastTime = now;
        setTimelineState(prev => {
          if (prev.currentTime >= totalDuration) {
            if (loop) return { ...prev, currentTime: 0 };
            return { ...prev, playing: false, currentTime: totalDuration };
          }
          return { ...prev, currentTime: prev.currentTime + delta };
        });
      }, 33);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, totalDuration, pushAnimationCSS, setTimelineState, buildPreviewCSS, playbackRate]);

  useEffect(() => {
    if (!animationsApplied || playing) return;
    const built = buildAnimationCSS(tracks, customAnimations);
    // Only persist to the HTML file — do NOT re-push live CSS here, as that would
    // restart running animations every time a track property changes.
    persistAnimations(built);
  }, [tracks, customAnimations, animationsApplied, playing, persistAnimations]);

  const stopAndReset = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0 }));
    pushAnimationCSS(animationsApplied ? buildAnimationCSS(tracks, customAnimations).css : '');
  };

  const startPlayback = () => { setTimelineState(prev => ({ ...prev, currentTime: 0, playing: true })); };

  const applyAnimations = () => {
    const built = buildAnimationCSS(tracks, customAnimations);
    pushAnimationCSS(built.css);
    persistAnimations(built);
    setTimelineState(prev => ({ ...prev, animationsApplied: true }));
    setAppliedMsg(true);
    showNotification(`Applied ${tracks.length} animation(s) to page`);
    setTimeout(() => setAppliedMsg(false), 1800);
  };

  const clearAnimations = () => {
    setTimelineState(prev => ({ ...prev, playing: false, currentTime: 0, animationsApplied: false }));
    setTimelineAnimationStyle('');
    persistAnimations({ css: '', needsClickRuntime: false, clickSelectors: [], scrollSelectors: [] });
    showNotification('Animations cleared');
  };

  const addTrack = useCallback(() => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const label = selectedElement
      ? (selectedElement.styles?.selector || (selectedElement.id ? `#${selectedElement.id}` : selectedElement.tagName))
      : '.element';
    setTimelineState(prev => {
      const t = prev.tracks;
      const next = [...t, {
        id, element: label,
        animation: animationConfig.preset !== 'none' ? animationConfig.preset : 'fadeIn',
        duration: parseFloat(animationConfig.duration) || 1,
        delay: 0,
        color: COLORS[t.length % COLORS.length],
        easing: animationConfig.easing || 'ease',
        iteration: animationConfig.iteration || '1',
        trigger: (animationConfig.trigger || 'load') as 'load' | 'hover' | 'click',
      }];
      return { ...prev, tracks: next };
    });
    setSelectedTrackId(id);
  }, [selectedElement, animationConfig, setTimelineState]);

  const removeTrack = (id: string) => {
    setTimelineState(prev => ({ ...prev, tracks: prev.tracks.filter(tr => tr.id !== id) }));
    setSelectedTrackId(curr => curr === id ? null : curr);
  };

  const updateTrack = (id: string, update: Partial<Track>) =>
    setTimelineState(prev => ({ ...prev, tracks: prev.tracks.map(tr => tr.id === id ? { ...tr, ...update } : tr) }));

  const duplicateTrack = (track: Track) => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const newTrack = { ...track, id, delay: Math.min(track.delay + 0.3, totalDuration - track.duration) };
    setTimelineState(prev => ({ ...prev, tracks: [...prev.tracks, newTrack] }));
    setSelectedTrackId(newTrack.id);
  };

  const applyPreset = (preset: string) => {
    if (selectedTrackId) {
      const meta = PRESET_BY_NAME[preset];
      updateTrack(selectedTrackId, {
        animation: preset,
        ...(meta ? { duration: meta.defaultDuration, easing: meta.defaultEasing, iteration: meta.defaultIteration || '1' } : {}),
      });
    }
    setAnimationConfig({ preset });
  };

  const saveCustomAnimation = (anim: CustomAnimation, originalName?: string) => {
    if (!anim.name.trim() || !anim.keyframes.trim()) { showNotification('Name and keyframes required'); return; }
    setTimelineState(prev => {
      const list = prev.customAnimations || [];
      const filtered = originalName ? list.filter(c => c.name !== originalName) : list.filter(c => c.name !== anim.name);
      return { ...prev, customAnimations: [...filtered, anim] };
    });
    setEditingCustom(null);
    setEditingOriginalName(undefined);
    setShowCustomEditor(false);
    showNotification(`Saved "${anim.name}"`);
  };

  const deleteCustomAnimation = (name: string) => {
    setTimelineState(prev => ({ ...prev, customAnimations: (prev.customAnimations || []).filter(c => c.name !== name) }));
  };

  /* Drag handlers */
  const startTrackDrag = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDelay = initTrack.delay;
    const trackDuration = initTrack.duration;
    showDragCapture('grab');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      let newDelay = Math.max(0, Math.min(totalDuration - trackDuration, initDelay + dT));
      // Snap to 0.1s
      newDelay = Math.round(newDelay * 10) / 10;
      setTimelineState(prev => ({
        ...prev, tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, delay: newDelay } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const startResizeDuration = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedTrackId(trackId);
    const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
    const scaledW = contentW * zoom;
    const startX = e.clientX;
    const initTrack = tracksRef.current.find(t => t.id === trackId);
    if (!initTrack) return;
    const initDuration = initTrack.duration;
    const initDelay = initTrack.delay;
    showDragCapture('e-resize');
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dT = (dx / scaledW) * totalDuration;
      let newDur = Math.max(0.1, Math.min(totalDuration - initDelay, initDuration + dT));
      // Snap to 0.1s
      newDur = Math.round(newDur * 10) / 10;
      setTimelineState(prev => ({
        ...prev, tracks: prev.tracks.map(tr => tr.id === trackId ? { ...tr, duration: newDur } : tr),
      }));
    };
    const onUp = () => { hideDragCapture(); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [zoom, totalDuration, setTimelineState]);

  const moveTrack = (id: string, dir: 'up' | 'down') => {
    setTimelineState(prev => {
      const idx = prev.tracks.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const nextIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= prev.tracks.length) return prev;
      const nextTracks = [...prev.tracks];
      [nextTracks[idx], nextTracks[nextIdx]] = [nextTracks[nextIdx], nextTracks[idx]];
      return { ...prev, tracks: nextTracks };
    });
  };

  const seekTo = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setTimelineState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(totalDuration, pct * totalDuration)) }));
  };

  const trackContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const triggerColors = { load: '#4ec9b0', hover: '#9cdcfe', click: '#e5a45a' } as const;
    showCtx(e, [
      { label: track.element, disabled: true },
      { label: `${track.animation} · ${track.duration}s · ${track.easing}`, disabled: true },
      { separator: true, label: '' },
      { label: 'Duplicate track', icon: '📋', shortcut: 'D', action: () => duplicateTrack(track) },
      { label: 'Reset delay to 0', icon: '↩', action: () => updateTrack(track.id, { delay: 0 }) },
      { separator: true, label: '' },
      { label: 'Trigger: Load', icon: '▶', action: () => updateTrack(track.id, { trigger: 'load' }) },
      { label: 'Trigger: Hover', icon: '◉', action: () => updateTrack(track.id, { trigger: 'hover' }) },
      { label: 'Trigger: Click', icon: '◈', action: () => updateTrack(track.id, { trigger: 'click' }) },
      { separator: true, label: '' },
      { label: 'Select animation…', icon: '✦', submenu: ANIMATION_PRESETS.slice(0, 20).map(p => ({ label: p.name, action: () => updateTrack(track.id, { animation: p.name }) })) },
      { separator: true, label: '' },
      { label: 'Delete track', icon: '🗑', danger: true, action: () => removeTrack(track.id) },
    ]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(8, z + (e.deltaY < 0 ? 0.25 : -0.25))));
    }
  };

  const contentW = (timelineRef.current?.clientWidth || 600) - labelWidth;
  const scaledContentW = contentW * zoom;
  const tickInterval = zoom < 1 ? 1 : zoom < 2 ? 0.5 : zoom < 4 ? 0.25 : 0.1;
  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration + tickInterval / 2; t = parseFloat((t + tickInterval).toFixed(3))) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  const selectedCandidates = new Set<string>(
    [
      selectedSelector?.trim() || '',
      selectedElement?.styles?.selector?.trim() || '',
      selectedElement?.id ? `#${selectedElement.id}` : '',
      selectedElement?.className
        ? `.${selectedElement.className.trim().split(/\s+/).filter(Boolean).join('.')}`
        : '',
      selectedElement?.tagName?.toLowerCase() || '',
    ].filter(Boolean)
  );

  const isTrackSelectedElement = (track: Track) => selectedCandidates.has(track.element.trim());

  useEffect(() => {
    if (selectedCandidates.size === 0) return;
    const matched = tracks.find(t => isTrackSelectedElement(t));
    if (matched) setSelectedTrackId(matched.id);
  }, [tracks, selectedSelector, selectedElement]);

  const [presetSearch, setPresetSearch] = useState('');
  const filteredPresets = (activeCategory === 'All'
    ? ANIMATION_PRESETS
    : ANIMATION_PRESETS.filter(p => p.category === activeCategory))
    .filter(p => !presetSearch.trim()
      || p.name.toLowerCase().includes(presetSearch.toLowerCase())
      || p.description.toLowerCase().includes(presetSearch.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', position: 'relative' }} onWheel={handleWheel}>

      {/* Header */}
      <div style={{ height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', background: SKU.hdr, borderBottom: `1px solid ${C.border}`, userSelect: 'none', overflowX: 'auto', overflowY: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.muted, marginRight: 6 }}>Timeline</span>

        <button title="Add Track" onClick={addTrack} style={{ ...hdrBtn, background: SKU.btn, boxShadow: SKU.shadow_raised, color: C.accent }}><FiPlus size={13} /></button>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.05)', margin: '0 2px' }} />

        <button title={playing ? 'Stop' : 'Play preview'}
          onClick={() => { if (playing) stopAndReset(); else startPlayback(); }}
          style={{ ...hdrBtn, background: playing ? SKU.abtn : SKU.btn, color: playing ? '#1a0d00' : C.accent, boxShadow: SKU.shadow_raised, borderRadius: 6 }}>
          {playing ? <FiSquare size={12} /> : <FiPlay size={12} />}
        </button>

        <button title="Toggle Loop" onClick={() => setLoop(!loop)}
          style={{ ...hdrBtn, background: loop ? SKU.abtn : SKU.btn, color: loop ? '#1a0d00' : C.dim, marginLeft: 2, borderRadius: 6, boxShadow: SKU.shadow_raised, fontSize: 10 }}>
          {loop ? '∞' : '1x'}
        </button>

        <span style={{ fontSize: 10, color: C.accent, fontFamily: 'var(--app-font-mono)', minWidth: 42, textAlign: 'center', fontWeight: 700 }}>{currentTime.toFixed(2)}s</span>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: 6, gap: 1, boxShadow: SKU.shadow_sunken, marginLeft: 4 }}>
          {([0.5, 1, 2] as const).map(rate => (
            <button key={rate} onClick={() => setPlaybackRate(rate)}
              style={{ padding: '1px 6px', fontSize: 8, fontWeight: 800, border: 'none', borderRadius: 4, cursor: 'pointer',
                background: playbackRate === rate ? SKU.abtn : 'transparent',
                color: playbackRate === rate ? '#1a0d00' : C.dim }}>
              {rate}x
            </button>
          ))}
        </div>

        <button title="Jump to Start" onClick={() => setTimelineState(prev => ({ ...prev, currentTime: 0 }))}
          style={{ ...hdrBtn, background: SKU.btn, color: C.muted, marginLeft: 6, borderRadius: 6, boxShadow: SKU.shadow_raised }}>⏮</button>
        <button title="Jump to End" onClick={() => setTimelineState(prev => ({ ...prev, currentTime: totalDuration }))}
          style={{ ...hdrBtn, background: SKU.btn, color: C.muted, borderRadius: 6, boxShadow: SKU.shadow_raised }}>⏭</button>

        <button title="Reset" onClick={stopAndReset} style={{ ...hdrBtn, background: SKU.btn, boxShadow: SKU.shadow_raised, color: C.muted }}><FiRefreshCw size={12} /></button>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.05)', margin: '0 2px' }} />

        <button title="Preset Library" onClick={() => setShowPresetLibrary(s => !s)}
          style={{ ...hdrBtn, width: 'auto', padding: '0 10px', fontSize: 10, fontWeight: 700, color: showPresetLibrary ? '#1a0d00' : C.muted, background: showPresetLibrary ? SKU.abtn : SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6, boxShadow: SKU.shadow_raised, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Library
        </button>

        <button title="Create custom @keyframes"
          onClick={() => { setEditingCustom({ name: '', keyframes: '@keyframes myAnim {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}' }); setEditingOriginalName(undefined); setVisualKFs([defaultKF(0), defaultKF(100)]); setCustomEditorMode('visual'); setShowCustomEditor(true); }}
          style={{ ...hdrBtn, width: 'auto', padding: '0 10px', fontSize: 10, fontWeight: 700, color: C.blue, background: SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6, boxShadow: SKU.shadow_raised, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          + Custom
        </button>

        <button title="Apply animations to page" onClick={applyAnimations}
          style={{ ...hdrBtn, width: 'auto', padding: '0 12px', fontSize: 10, fontWeight: 700, color: appliedMsg ? C.green : '#1a0d00', background: appliedMsg ? 'rgba(78,201,176,0.15)' : SKU.abtn, border: `1px solid ${C.border}`, borderRadius: 6, boxShadow: SKU.shadow_raised, gap: 5, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {appliedMsg ? <><FiCheck size={11} /> Applied</> : 'Apply'}
        </button>

        <button title="Clear animations" onClick={clearAnimations} style={{ ...hdrBtn, background: SKU.btn, color: '#f44747', width: 26, borderRadius: 6, boxShadow: SKU.shadow_raised }}>↺</button>

        <div style={{ flex: 1 }} />

        <button title="Zoom Out" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} style={{ ...hdrBtn, background: SKU.btn, boxShadow: SKU.shadow_raised, color: C.muted }}><FiZoomOut size={12} /></button>
        <span style={{ fontSize: 9, color: C.dim, minWidth: 32, textAlign: 'center', fontWeight: 700 }}>{Math.round(zoom * 100)}%</span>
        <button title="Zoom In" onClick={() => setZoom(z => Math.min(8, z + 0.5))} style={{ ...hdrBtn, background: SKU.btn, boxShadow: SKU.shadow_raised, color: C.muted }}><FiZoomIn size={12} /></button>
        <button title="Reset Zoom" onClick={() => setZoom(1)} style={{ ...hdrBtn, fontSize: 9, color: C.muted, width: 'auto', padding: '0 6px', background: SKU.btn, fontWeight: 700, boxShadow: SKU.shadow_raised }}>1:1</button>

        {onClose && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.05)', margin: '0 4px' }} />
            <button title="Close" onClick={onClose} style={{ ...hdrBtn, color: '#666' }}><FiX size={13} /></button>
          </>
        )}
      </div>

      {/* Preset Library */}
      {showPresetLibrary && (
        <div style={{ flexShrink: 0, maxHeight: 220, borderBottom: '1px solid #2e2e30', background: '#18181a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '5px 8px', display: 'flex', gap: 3, flexWrap: 'wrap', borderBottom: '1px solid #252528', alignItems: 'center' }}>
            {['All', ...ANIMATION_CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{ padding: '2px 8px', fontSize: 9, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  background: activeCategory === cat ? 'rgba(229,164,90,0.15)' : '#222224',
                  border: `1px solid ${activeCategory === cat ? 'rgba(229,164,90,0.45)' : '#2e2e30'}`,
                  color: activeCategory === cat ? '#e5a45a' : '#888', fontWeight: 500 }}>
                {cat}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <input value={presetSearch} onChange={e => setPresetSearch(e.target.value)} placeholder="Search…"
              style={{ background: '#111', border: '1px solid #2e2e30', borderRadius: 10, padding: '2px 8px', fontSize: 10, color: '#aaa', outline: 'none', width: 100 }} />
            <button onClick={() => setShowPresetLibrary(false)} style={hdrBtn}><FiX size={10} /></button>
          </div>
          <div style={{ overflowY: 'auto', padding: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 4 }}>
            {filteredPresets.map(p => (
              <button key={p.name} onClick={() => applyPreset(p.name)} title={p.description}
                style={{ padding: '6px 8px', textAlign: 'left', background: animationConfig.preset === p.name ? 'rgba(229,164,90,0.1)' : '#222224',
                  border: `1px solid ${animationConfig.preset === p.name ? 'rgba(229,164,90,0.45)' : '#2e2e30'}`,
                  borderRadius: 4, cursor: 'pointer', color: '#aaa', display: 'flex', flexDirection: 'column', gap: 2 }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = animationConfig.preset === p.name ? 'rgba(229,164,90,0.45)' : '#2e2e30')}>
                <span style={{ fontSize: 10, fontWeight: 600, color: animationConfig.preset === p.name ? '#e5a45a' : '#ccc' }}>{p.name}</span>
                <span style={{ fontSize: 8, color: '#555', textTransform: 'uppercase' }}>{p.category}</span>
              </button>
            ))}
            {customAnimations.length > 0 && activeCategory === 'All' && (
              <>
                <div style={{ gridColumn: '1 / -1', fontSize: 9, color: '#9cdcfe', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 4 }}>Custom</div>
                {customAnimations.map(c => (
                  <div key={c.name} style={{ padding: '6px 8px', background: '#222224', border: '1px solid #2e2e30', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <button onClick={() => applyPreset(c.name)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: '#9cdcfe', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{c.name}</button>
                      <button onClick={() => { setEditingCustom(c); setEditingOriginalName(c.name); setVisualKFs([defaultKF(0), defaultKF(100)]); setCustomEditorMode('code'); setShowCustomEditor(true); }} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', padding: 2 }}><FiEdit3 size={10} /></button>
                      <button onClick={() => deleteCustomAnimation(c.name)} style={{ background: 'none', border: 'none', color: '#f88', cursor: 'pointer', padding: 2 }}><FiTrash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Custom Animation Editor */}
      {showCustomEditor && editingCustom && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#1e1e20', border: '1px solid #3e3e40', borderRadius: 8, width: 'min(560px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>

            {/* Dialog Header */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #2e2e30', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiEdit3 size={13} color="#9cdcfe" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {editingCustom.name ? `Edit "${editingCustom.name}"` : 'Create Custom Animation'}
              </span>
              <div style={{ flex: 1 }} />
              {/* Mode toggle */}
              <div style={{ display: 'flex', background: '#111', borderRadius: 4, padding: 2, gap: 1 }}>
                {(['visual', 'code'] as const).map(m => (
                  <button key={m} onClick={() => {
                    if (m === 'code' && customEditorMode === 'visual' && visualKFs.length > 0) {
                      setEditingCustom({ ...editingCustom, keyframes: visualKFtoCode(editingCustom.name, visualKFs) });
                    }
                    setCustomEditorMode(m);
                  }}
                    style={{ padding: '2px 10px', fontSize: 9, fontWeight: 700, borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', background: customEditorMode === m ? (m === 'visual' ? 'rgba(156,220,254,0.18)' : 'rgba(229,164,90,0.18)') : 'transparent', color: customEditorMode === m ? (m === 'visual' ? '#9cdcfe' : '#e5a45a') : '#555' }}>
                    {m === 'visual' ? '◈ Visual' : '</> Code'}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }} style={hdrBtn}><FiX size={12} /></button>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
              {/* Name */}
              <div>
                <div style={{ fontSize: 9, color: '#777', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Animation Name</div>
                <input value={editingCustom.name} onChange={e => setEditingCustom({ ...editingCustom, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                  placeholder="myAwesomeAnim"
                  style={{ width: '100%', background: '#252528', border: '1px solid #2e2e30', borderRadius: 4, padding: '5px 8px', fontSize: 11, color: '#ccc', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              </div>

              {/* Visual mode */}
              {customEditorMode === 'visual' ? (
                <div>
                  <div style={{ fontSize: 9, color: '#9cdcfe', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>◈ Keyframe Stops</span>
                    <span style={{ color: '#444', fontWeight: 400, fontSize: 8 }}>— set properties at each point in time</span>
                  </div>
                  <VisualKeyframeEditor name={editingCustom.name} stops={visualKFs} onChange={setVisualKFs} />
                </div>
              ) : (
                /* Code mode */
                <div>
                  <div style={{ fontSize: 9, color: '#777', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>@keyframes CSS</div>
                  <textarea value={editingCustom.keyframes}
                    onChange={e => setEditingCustom({ ...editingCustom, keyframes: e.target.value })}
                    rows={12}
                    style={{ width: '100%', background: '#111', border: '1px solid #2e2e30', borderRadius: 4, padding: 8, fontSize: 11, color: '#dcdcaa', outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                  {/* Templates */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    <span style={{ fontSize: 9, color: '#555', alignSelf: 'center' }}>Templates:</span>
                    {[
                      { label: 'Fade',   tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}` },
                      { label: 'Bounce', tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-30px); }\n}` },
                      { label: 'Glow',   tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%, 100% { box-shadow: 0 0 4px #fff; }\n  50% { box-shadow: 0 0 24px #e5a45a; }\n}` },
                      { label: 'Color',  tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%   { background: #ff5252; }\n  50%  { background: #4caf50; }\n  100% { background: #ff5252; }\n}` },
                      { label: 'Morph',  tpl: (n: string) => `@keyframes ${n || 'myAnim'} {\n  0%   { border-radius: 0; }\n  50%  { border-radius: 50%; }\n  100% { border-radius: 0; }\n}` },
                    ].map(t => (
                      <button key={t.label} onClick={() => setEditingCustom({ ...editingCustom, keyframes: t.tpl(editingCustom.name) })}
                        style={{ padding: '2px 8px', fontSize: 9, background: '#252528', border: '1px solid #2e2e30', borderRadius: 10, color: '#888', cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '8px 12px', borderTop: '1px solid #2e2e30', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 9, color: '#444' }}>
                {customEditorMode === 'visual' ? 'Visual mode auto-generates @keyframes CSS' : 'Write raw @keyframes CSS'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowCustomEditor(false); setEditingCustom(null); setEditingOriginalName(undefined); }}
                  style={{ padding: '5px 12px', background: 'none', border: '1px solid #2e2e30', borderRadius: 4, color: '#777', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                <button onClick={() => {
                  const finalAnim = customEditorMode === 'visual' && visualKFs.length > 0
                    ? { ...editingCustom, keyframes: visualKFtoCode(editingCustom.name, visualKFs) }
                    : editingCustom;
                  saveCustomAnimation(finalAnim, editingOriginalName);
                }}
                  style={{ padding: '5px 12px', background: 'rgba(78,201,176,0.12)', border: '1px solid rgba(78,201,176,0.35)', borderRadius: 4, color: '#4ec9b0', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiSave size={11} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* Track list + ruler */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div style={{ minWidth: labelWidth + scaledContentW, position: 'relative' }}>

            {/* Ruler */}
            <div style={{ display: 'flex', height: 22, background: '#18181a', borderBottom: '1px solid #2e2e30', position: 'sticky', top: 0, zIndex: 5 }}>
              <div style={{ width: labelWidth, flexShrink: 0, borderRight: '1px solid #2e2e30', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <span style={{ fontSize: 8, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Element</span>
              </div>
              <div style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onClick={seekTo}>
                {ticks.map((t, i) => {
                  const pct = (t / totalDuration) * 100;
                  const isMajor = Math.abs(t % 1) < 0.001;
                  const isMid = Math.abs(t % 0.5) < 0.001;
                  return (
                    <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, borderLeft: `1px solid ${isMajor ? 'rgba(255,255,255,0.15)' : isMid ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)'}`, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                      {isMajor && <span style={{ fontSize: 8, color: '#666', paddingLeft: 2, whiteSpace: 'nowrap' }}>{t.toFixed(0)}s</span>}
                      {!isMajor && isMid && <span style={{ fontSize: 7, color: '#444', paddingLeft: 2, whiteSpace: 'nowrap' }}>.5</span>}
                    </div>
                  );
                })}
                {/* Playhead */}
                <div style={{ position: 'absolute', left: `${(currentTime / totalDuration) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e5a45a', zIndex: 10, pointerEvents: 'none' }}>
                  <div style={{ width: 8, height: 8, background: '#e5a45a', borderRadius: '50%', transform: 'translate(-3.5px, -2px)' }} />
                </div>
              </div>
            </div>

            {/* Tracks */}
            {tracks.map(track => {
              const isSelected = selectedTrackId === track.id;
              const isLinked = isTrackSelectedElement(track);
              const isCustom = customAnimations.some(c => c.name === track.animation);
              const triggerColor = (track.trigger || 'load') === 'load' ? C.green : track.trigger === 'hover' ? C.blue : C.accent;
              return (
                <div key={track.id}
                  style={{ display: 'flex', height: TRACK_H, borderBottom: `1px solid ${C.border}`, background: isSelected ? 'rgba(255,255,255,0.04)' : isLinked ? 'rgba(229,164,90,0.06)' : 'transparent', transition: 'background 0.12s', cursor: 'default' }}
                  onClick={() => setSelectedTrackId(track.id)}
                  onContextMenu={e => trackContextMenu(e, track)}>

                  {/* Label */}
                  <div style={{ width: labelWidth, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 2 }}>
                      <button onClick={e => { e.stopPropagation(); moveTrack(track.id, 'up'); }} title="Move Up"
                        style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: 0, fontSize: 8, display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>▲</button>
                      <button onClick={e => { e.stopPropagation(); moveTrack(track.id, 'down'); }} title="Move Down"
                        style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: 0, fontSize: 8, display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>▼</button>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: track.color, flexShrink: 0, boxShadow: `0 0 8px ${track.color}44` }} />
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.accent : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.element}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {isCustom && <span style={{ fontSize: 9, color: C.blue, fontWeight: 900 }}>★</span>}
                        <span style={{ fontSize: 8, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{track.animation}</span>
                        <span style={{ padding: '0 4px', borderRadius: 4, fontSize: 7, fontWeight: 900, background: 'rgba(0,0,0,0.3)', color: triggerColor, textTransform: 'uppercase', border: `1px solid ${triggerColor}33` }}>
                          {(track.trigger || 'load')}
                        </span>
                      </div>
                    </div>
                    
                    {selectedSelector && !isSelected && (
                      <button onClick={e => { e.stopPropagation(); updateTrack(track.id, { element: selectedSelector }); showNotification(`Updated to ${selectedSelector}`); }}
                        title={`Update to: ${selectedSelector}`}
                        style={{ background: SKU.btn, border: 'none', color: C.green, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', boxShadow: SKU.shadow_raised }}>
                        <FiPlus size={10} />
                      </button>
                    )}

                    <button title="Delete" onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, padding: 4, display: 'flex', borderRadius: 4, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f44')}
                      onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>
                      <FiX size={11} />
                    </button>
                  </div>

                  {/* Track bar area */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'visible', background: 'rgba(0,0,0,0.1)' }}>
                    {/* Grid lines */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(90deg, transparent, transparent 49.5%, rgba(255,255,255,0.02) 50%)', backgroundSize: `${(1 / totalDuration) * 100}% 100%` }} />
                    
                    {/* Track block */}
                    <div
                      title={`${track.animation} — delay: ${track.delay}s, dur: ${track.duration}s, easing: ${track.easing}`}
                      style={{ position: 'absolute', left: `${(track.delay / totalDuration) * 100}%`, width: `${(track.duration / totalDuration) * 100}%`, top: 6, bottom: 6, background: isSelected ? track.color : `${track.color}22`, border: `1px solid ${track.color}66`, borderRadius: 4, cursor: 'grab', zIndex: 2, display: 'flex', alignItems: 'center', overflow: 'hidden', minWidth: 8, boxShadow: isSelected ? `0 0 12px ${track.color}44` : 'none', transition: 'background 0.2s, box-shadow 0.2s' }}
                      onMouseDown={e => startTrackDrag(e, track.id)}>
                      
                      <span style={{ fontSize: 8, color: isSelected ? '#000' : track.color, padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', pointerEvents: 'none', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{track.animation}</span>
                      
                      {/* Resize handle */}
                      <div title="Drag to resize duration"
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'e-resize', background: 'rgba(0,0,0,0.1)', zIndex: 3, borderLeft: '1px solid rgba(0,0,0,0.1)' }}
                        onMouseDown={e => { e.stopPropagation(); startResizeDuration(e, track.id); }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {tracks.length === 0 && (
              <div style={{ padding: '16px 12px', fontSize: 11, color: '#444', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>No tracks. Click <strong style={{ color: '#777' }}>+</strong> to add or browse <strong style={{ color: '#e5a45a' }}>Library</strong>.</div>
              </div>
            )}
          </div>
        </div>

        {/* Track properties panel */}
        {selectedTrack && (
          <div style={{ width: 200, flexShrink: 0, borderLeft: `1px solid ${C.border}`, overflowY: 'auto', background: C.surface, padding: '10px', boxShadow: '-4px 0 16px rgba(0,0,0,0.2)', zIndex: 5 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Selected Track
              <button onClick={() => setShowCurveEditor(s => !s)}
                style={{ background: showCurveEditor ? SKU.abtn : SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6, color: showCurveEditor ? '#1a0d00' : C.muted, cursor: 'pointer', padding: '3px 8px', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, boxShadow: SKU.shadow_raised }}>
                <MiniCurve value={selectedTrack.easing} size={14} /> CURVE
              </button>
            </div>

            <PropRow label="Selector">
              <input value={selectedTrack.element} onChange={e => updateTrack(selectedTrack.id, { element: e.target.value })}
                style={trkInp} placeholder=".class, #id, tag" />
            </PropRow>

            <PropRow label="Animation">
              <select value={selectedTrack.animation} onChange={e => { updateTrack(selectedTrack.id, { animation: e.target.value }); setAnimationConfig({ preset: e.target.value }); }} style={trkSel}>
                <option value="none">none</option>
                {customAnimations.length > 0 && (
                  <optgroup label="★ Custom">{customAnimations.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>
                )}
                {ANIMATION_CATEGORIES.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {ANIMATION_PRESETS.filter(p => p.category === cat).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </PropRow>

            <PropRow label={`Duration: ${selectedTrack.duration.toFixed(1)}s`}>
              <input type="range" min="0.1" max="10" step="0.1" value={selectedTrack.duration}
                onChange={e => updateTrack(selectedTrack.id, { duration: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: C.accent } as any} />
            </PropRow>

            <PropRow label={`Delay: ${selectedTrack.delay.toFixed(1)}s`}>
              <input type="range" min="0" max="8" step="0.1" value={selectedTrack.delay}
                onChange={e => updateTrack(selectedTrack.id, { delay: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: C.accent } as any} />
            </PropRow>

            <PropRow label="Easing">
              <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
                <MiniCurve value={selectedTrack.easing} size={24} />
                <select value={selectedTrack.easing} onChange={e => updateTrack(selectedTrack.id, { easing: e.target.value })} style={{ ...trkSel, flex: 1 }}>
                  {EASING_NAMED.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  {!EASING_NAMED.some(e => e.value === selectedTrack.easing) && (
                    <option value={selectedTrack.easing}>{selectedTrack.easing}</option>
                  )}
                </select>
              </div>
            </PropRow>

            {showCurveEditor && (
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <CubicBezierEditor
                  value={selectedTrack.easing.startsWith('cubic-bezier') ? selectedTrack.easing : 'cubic-bezier(0.25,0.1,0.25,1)'}
                  onChange={v => updateTrack(selectedTrack.id, { easing: v })}
                />
              </div>
            )}

            <PropRow label="Repeat">
              <select value={selectedTrack.iteration} onChange={e => updateTrack(selectedTrack.id, { iteration: e.target.value })} style={trkSel}>
                {['1', '2', '3', '5', 'infinite'].map(v => <option key={v}>{v}</option>)}
              </select>
            </PropRow>

            <PropRow label="Trigger">
              <div style={{ display: 'flex', gap: 2, flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 6, padding: 2, flexWrap: 'wrap', boxShadow: SKU.shadow_sunken }}>
                {(['load', 'hover', 'click', 'scroll'] as const).map(opt => {
                  const cur = selectedTrack.trigger || 'load';
                  const sel2 = cur === opt;
                  const triggerColor = { load: C.green, hover: C.blue, click: C.accent, scroll: '#c586c0' }[opt];
                  return (
                    <button key={opt} onClick={() => updateTrack(selectedTrack.id, { trigger: opt })}
                      style={{ flex: '1 0 45%', padding: '4px 0', fontSize: 8, fontWeight: 800, border: 'none', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: sel2 ? SKU.abtn : 'transparent',
                        color: sel2 ? '#1a0d00' : C.dim,
                        boxShadow: sel2 ? SKU.shadow_raised : 'none' }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </PropRow>

            <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
              <button onClick={() => duplicateTrack(selectedTrack)}
                style={{ flex: 1, padding: '8px', background: SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: SKU.shadow_raised }}>
                <FiCopy size={12} /> DUP
              </button>
              <button onClick={() => removeTrack(selectedTrack.id)}
                style={{ flex: 1, padding: '8px', background: SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6, color: '#f44747', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: SKU.shadow_raised }}>
                <FiTrash2 size={12} /> DEL
              </button>
            </div>
          </div>
        )}
      </div>

      {ctxEl}
    </div>
  );
};

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
      <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
    </div>
  );
}

const hdrBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, background: 'none', border: 'none',
  cursor: 'pointer', color: '#555', borderRadius: 4, flexShrink: 0,
};

const trkInp: React.CSSProperties = {
  flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 6,
  padding: '4px 8px', fontSize: 11, color: C.text, outline: 'none', fontFamily: 'var(--app-font-mono)', minWidth: 0,
  boxShadow: SKU.shadow_sunken,
};

const trkSel: React.CSSProperties = {
  flex: 1, background: SKU.btn, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: '4px 8px', fontSize: 11, color: C.text, outline: 'none', cursor: 'pointer', minWidth: 0,
  boxShadow: SKU.shadow_raised,
};

export default TimelinePanel;
