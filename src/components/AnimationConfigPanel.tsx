import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { ANIMATION_PRESETS, ANIMATION_CATEGORIES, KEYFRAMES_MAP, PRESET_BY_NAME } from '../lib/animations';
import { FiZap, FiPlay, FiSliders, FiList, FiX, FiCheck } from 'react-icons/fi';
import { getTargetHtmlFile } from '../utils/projectFiles';

export type Tab = 'presets' | 'config' | 'tracks';

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

const EASING_PRESETS = [
  { label: 'ease', value: 'ease' },
  { label: 'linear', value: 'linear' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'spring', value: 'cubic-bezier(0.68,-0.55,0.27,1.55)' },
  { label: 'bounce', value: 'cubic-bezier(0.34,1.56,0.64,1)' },
  { label: 'sharp', value: 'cubic-bezier(0.4,0,0.6,1)' },
  { label: 'smooth', value: 'cubic-bezier(0.25,0.46,0.45,0.94)' },
  { label: 'snap', value: 'cubic-bezier(0.175,0.885,0.32,1.275)' },
];

function parseCubicBezier(v: string): [number, number, number, number] | null {
  const m = v.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
}

function CubicBezierEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseCubicBezier(value) || [0.25, 0.1, 0.25, 1];
  const [x1, y1, x2, y2] = parsed;
  const SIZE = 90;
  const PAD = 12;
  const toSvg = (nx: number, ny: number) => ({
    x: PAD + nx * SIZE,
    y: PAD + (1 - ny) * SIZE,
  });
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

  const isCubic = value.startsWith('cubic-bezier');

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>Easing Curve</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <svg width={SIZE + PAD * 2} height={SIZE + PAD * 2} style={{ background: C.bg, borderRadius: 4, flexShrink: 0, cursor: 'crosshair', border: `1px solid ${C.border}` }}>
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t}>
              <line x1={PAD + t * SIZE} y1={PAD} x2={PAD + t * SIZE} y2={PAD + SIZE} stroke="#333" strokeWidth="0.5" />
              <line x1={PAD} y1={PAD + t * SIZE} x2={PAD + SIZE} y2={PAD + t * SIZE} stroke="#333" strokeWidth="0.5" />
            </g>
          ))}
          <line x1={p0.x} y1={p0.y} x2={PAD + SIZE} y2={PAD} stroke="#333" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1={p0.x} y1={p0.y} x2={c1.x} y2={c1.y} stroke={C.green} strokeWidth="1" opacity="0.6" />
          <line x1={p3.x} y1={p3.y} x2={c2.x} y2={c2.y} stroke={C.blue} strokeWidth="1" opacity="0.6" />
          <path
            d={`M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`}
            fill="none" stroke={C.accent} strokeWidth="2"
          />
          <circle cx={c1.x} cy={c1.y} r={5} fill={C.green} stroke="#fff" strokeWidth="1" style={{ cursor: 'grab' }}
            onMouseDown={e => dragHandle(1, e)} />
          <circle cx={c2.x} cy={c2.y} r={5} fill={C.blue} stroke="#fff" strokeWidth="1" style={{ cursor: 'grab' }}
            onMouseDown={e => dragHandle(2, e)} />
          <circle cx={p0.x} cy={p0.y} r={3} fill="#666" />
          <circle cx={p3.x} cy={p3.y} r={3} fill="#666" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {([['X1', x1, (v: number) => onChange(`cubic-bezier(${v.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y1', y1, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${v.toFixed(2)},${x2.toFixed(2)},${y2.toFixed(2)})`)],
            ['X2', x2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${v.toFixed(2)},${y2.toFixed(2)})`)],
            ['Y2', y2, (v: number) => onChange(`cubic-bezier(${x1.toFixed(2)},${y1.toFixed(2)},${x2.toFixed(2)},${v.toFixed(2)})`)]
          ] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: label.includes('1') ? C.green : C.blue, width: 14, fontWeight: 700 }}>{label}</span>
              <input type="number" min="-2" max="3" step="0.01"
                value={val.toFixed(2)}
                onChange={e => setter(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '2px 4px', fontSize: 10, color: C.text, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {EASING_PRESETS.map(p => {
          const isActive = value === p.value;
          return (
            <button key={p.label} onClick={() => onChange(p.value)}
              style={{ padding: '2px 7px', fontSize: 9, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? C.accentBg : C.surface2,
                border: `1px solid ${isActive ? C.accentBrd : C.border}`,
                color: isActive ? C.accent : C.muted }}>
              {p.label}
            </button>
          );
        })}
      </div>
      {isCubic && (
        <div style={{ fontSize: 9, color: C.dim, fontFamily: 'monospace', padding: '2px 4px', background: C.bg, borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      )}
    </div>
  );
}

function injectPropertiesAnimationCssIntoHtml(html: string, css: string) {
  const cleaned = html.replace(/\n?\s*<style\s+id=["']properties-animations["'][\s\S]*?<\/style>/i, '');
  if (!css.trim()) return cleaned;
  const block = `<style id="properties-animations">\n${css}\n</style>`;
  if (cleaned.includes('</head>')) return cleaned.replace('</head>', `${block}\n</head>`);
  return `${block}\n${cleaned}`;
}

const COLORS = ['#e5a45a', '#4ec9b0', '#9cdcfe', '#dcdcaa', '#c586c0', '#f44747', '#89d185'];

const AnimationConfigPanel: React.FC<{ singleTab?: Tab }> = ({ singleTab }) => {
  const {
    selectedElement, selectedSelector, animationConfig, setAnimationConfig,
    files, activeFileId, updateFileContent, setTimelineState, timelineState, showNotification,
    applySelectedStyle, setTimelineAnimationStyle, timelineAnimationStyle,
  } = useEditorStore();

  const applyAnimationForPreset = useCallback((presetName: string, meta: { defaultDuration?: number; defaultEasing?: string; defaultIteration?: string } | null) => {
    if (!selectedElement || !selectedSelector) return;
    const dur = meta?.defaultDuration || 0.6;
    const easing = meta?.defaultEasing || 'ease';
    const iter = meta?.defaultIteration || '1';
    const trigger = (animationConfig.trigger || 'load') as 'load' | 'hover' | 'click';
    setTimelineState(prev => {
      const idx = prev.tracks.findIndex(t => t.element.trim() === selectedSelector.trim());
      if (idx >= 0) {
        const next = [...prev.tracks];
        next[idx] = { ...next[idx], animation: presetName, duration: dur, easing, iteration: iter, trigger };
        return { ...prev, tracks: next };
      }
      return { ...prev, tracks: [...prev.tracks, { id: Date.now().toString(), element: selectedSelector, animation: presetName, duration: dur, delay: 0, color: COLORS[prev.tracks.length % COLORS.length], easing, iteration: iter, trigger }] };
    });
    const kf = KEYFRAMES_MAP[presetName];
    if (kf) {
      const htmlFile = getTargetHtmlFile(files, activeFileId);
      if (htmlFile) {
        const updated = injectPropertiesAnimationCssIntoHtml(htmlFile.content, kf);
        if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
      }
    }
  }, [activeFileId, selectedElement, selectedSelector, animationConfig.trigger, setTimelineState, files, updateFileContent]);

  const [tab, setTab] = useState<Tab>(singleTab || 'presets');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [presetSearch, setPresetSearch] = useState('');
  const [applied, setApplied] = useState(false);
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableCssRef = useRef<string>('');
  const isPreviewingRef = useRef(false);

  // Track the "stable" (non-preview) CSS so we can restore after preview
  useEffect(() => {
    if (!isPreviewingRef.current) {
      stableCssRef.current = timelineAnimationStyle;
    }
  }, [timelineAnimationStyle]);

  const previewAnimation = useCallback((presetName: string) => {
    const selector = selectedSelector || selectedElement?.styles?.selector ||
      (selectedElement?.id ? `#${selectedElement.id}` : null) ||
      (selectedElement?.tagName ? selectedElement.tagName.toLowerCase() : null);

    if (!selector) {
      showNotification('Click an element in the canvas first to preview');
      return;
    }

    const meta = PRESET_BY_NAME[presetName];
    const kf = KEYFRAMES_MAP[presetName] || meta?.keyframes || '';
    if (!kf) return;

    const duration = parseFloat(animationConfig.duration) || meta?.defaultDuration || 0.6;
    const easing = animationConfig.easing || meta?.defaultEasing || 'ease';

    // Cancel any running preview
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);

    // Build the temporary preview CSS
    const previewCss = [
      stableCssRef.current,
      kf,
      `${selector} { animation: ${presetName} ${duration}s ${easing} 0s 1 normal both !important; }`,
    ].filter(Boolean).join('\n');

    isPreviewingRef.current = true;
    setPreviewingPreset(presetName);
    // Force a re-trigger by clearing first then setting (re-runs the animation)
    setTimelineAnimationStyle('');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimelineAnimationStyle(previewCss);
      });
    });

    previewTimeoutRef.current = setTimeout(() => {
      isPreviewingRef.current = false;
      setPreviewingPreset(null);
      setTimelineAnimationStyle(stableCssRef.current);
    }, (duration + 0.6) * 1000);
  }, [selectedSelector, selectedElement, animationConfig, setTimelineAnimationStyle, showNotification]);

  // Inject shimmer / blink keyframes once
  useEffect(() => {
    const id = '__acp-shimmer-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
@keyframes __panelShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes __panelBlink { 0%{opacity:1} 100%{opacity:0.3} }
`;
    document.head.appendChild(s);
  }, []);

  const tracks = timelineState.tracks;
  const customAnimations = timelineState.customAnimations || [];

  const customAsPresets = customAnimations.map(c => ({ name: c.name, category: '★ Custom', description: 'User-created animation', defaultDuration: 0.6, defaultEasing: 'ease', defaultIteration: '1' }));

  const filteredPresets = [
    ...(activeCategory === 'All' || activeCategory === '★ Custom' ? customAsPresets : []),
    ...(activeCategory === 'All' || activeCategory !== '★ Custom' ? (activeCategory === 'All' ? ANIMATION_PRESETS : ANIMATION_PRESETS.filter(p => p.category === activeCategory)) : []),
  ].filter(p => !presetSearch.trim() || p.name.toLowerCase().includes(presetSearch.toLowerCase()));

  const applyAnimation = useCallback(() => {
    if (!selectedElement || !selectedSelector) {
      showNotification('Click an element in the canvas first');
      return;
    }
    const preset = animationConfig.preset;
    if (!preset || preset === 'none') {
      showNotification('Select an animation preset first');
      return;
    }
    const meta = PRESET_BY_NAME[preset];
    const dur = parseFloat(animationConfig.duration) || meta?.defaultDuration || 0.6;
    const easing = animationConfig.easing || meta?.defaultEasing || 'ease';
    const iter = animationConfig.iteration || meta?.defaultIteration || '1';
    const fill = animationConfig.fillMode || 'both';
    const trigger = (animationConfig.trigger || 'load') as 'load' | 'hover' | 'click';
    const animValue = `${preset} ${dur}s ${easing} ${animationConfig.delay || '0s'} ${iter} ${animationConfig.direction || 'normal'} ${fill}`;

    const selectorCandidate = selectedElement.styles?.selector || selectedSelector;
    setTimelineState(prev => {
      const idx = prev.tracks.findIndex(t => t.element.trim() === selectorCandidate.trim());
      if (idx >= 0) {
        const nextTracks = [...prev.tracks];
        nextTracks[idx] = { ...nextTracks[idx], animation: preset, duration: dur, easing, iteration: iter, trigger };
        return { ...prev, tracks: nextTracks };
      }
      return {
        ...prev,
        tracks: [...prev.tracks, {
          id: Date.now().toString(), element: selectorCandidate, animation: preset,
          duration: dur, delay: parseFloat(animationConfig.delay) || 0,
          color: COLORS[prev.tracks.length % COLORS.length], easing, iteration: iter, trigger,
        }],
      };
    });
    if (trigger === 'load') applySelectedStyle('animation', animValue);

    const keyframeCss = KEYFRAMES_MAP[preset];
    if (keyframeCss) {
      const htmlFile = getTargetHtmlFile(files, activeFileId);
      if (htmlFile) {
        const updated = injectPropertiesAnimationCssIntoHtml(htmlFile.content, keyframeCss);
        if (updated !== htmlFile.content) updateFileContent(htmlFile.id, updated);
      }
    }
    setApplied(true);
    showNotification(`Applied "${preset}" to ${selectorCandidate}`);
    setTimeout(() => setApplied(false), 1800);
  }, [activeFileId, selectedElement, selectedSelector, animationConfig, setTimelineState, applySelectedStyle, files, updateFileContent, showNotification]);

  const tag = selectedElement?.tagName || '';
  const elId = selectedElement?.id ? `#${selectedElement.id}` : '';

  const inp: React.CSSProperties = {
    background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 3,
    padding: '3px 6px', fontSize: 10, color: C.text, outline: 'none',
    fontFamily: 'inherit', flex: 1,
  };
  const sel: React.CSSProperties = {
    ...inp, cursor: 'pointer', appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: 20,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>
      {/* Tabs — hidden when used as a single-tab panel */}
      {!singleTab && (
        <div style={{ flexShrink: 0, display: 'flex', background: SKU.hdr, borderBottom: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', zIndex: 10 }}>
          {([['presets', FiZap, 'Presets'], ['config', FiSliders, 'Config'], ['tracks', FiList, 'Tracks']] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                background: tab === id ? SKU.abtn : 'transparent',
                borderBottom: tab === id ? `2px solid ${C.accent}` : 'none',
                color: tab === id ? '#1a0d00' : C.muted,
                boxShadow: tab === id ? SKU.shadow_raised : 'none',
                transition: 'all 0.12s' }}>
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Presets Tab */}
        {tab === 'presets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ padding: '6px 8px', display: 'flex', gap: 4, background: SKU.bar, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 2 }}>
              <input value={presetSearch} onChange={e => setPresetSearch(e.target.value)} placeholder="Search animations…"
                style={{ ...inp, flex: 1, padding: '4px 10px', fontSize: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 6, boxShadow: SKU.shadow_sunken }} />
              {presetSearch && <button onClick={() => setPresetSearch('')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>}
            </div>
            <div style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: 4, background: 'rgba(0,0,0,0.1)' }}>
              {['All', ...(customAnimations.length > 0 ? ['★ Custom'] : []), ...ANIMATION_CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: '3px 10px', fontSize: 9, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: activeCategory === cat ? SKU.abtn : SKU.btn,
                    border: `1px solid ${activeCategory === cat ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.5)'}`,
                    color: activeCategory === cat ? '#1a0d00' : C.muted,
                    boxShadow: activeCategory === cat ? SKU.shadow_raised : SKU.shadow_raised,
                    transition: 'all 0.1s' }}>
                  {cat}
                </button>
              ))}
            </div>
            {!selectedElement && (
              <div style={{ margin: '8px', padding: '10px 12px', fontSize: 10, color: C.muted, background: SKU.bar, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, boxShadow: SKU.shadow_sunken }}>
                <FiZap size={12} color={C.accent} style={{ filter: `drop-shadow(0 0 4px ${C.accent}66)` }} />
                <span>Click an element on the canvas to preview animations.</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 8px 12px' }}>
              {filteredPresets.map(p => {
                const isSelected = animationConfig.preset === p.name;
                const isPreviewing = previewingPreset === p.name;
                return (
                  <button key={p.name}
                    onClick={() => {
                      const meta = PRESET_BY_NAME[p.name];
                      setAnimationConfig({ preset: p.name, ...(meta ? { duration: String(meta.defaultDuration), easing: meta.defaultEasing, iteration: meta.defaultIteration || '1' } : {}) });
                      previewAnimation(p.name);
                      if (selectedElement && selectedSelector) {
                        applyAnimationForPreset(p.name, meta || null);
                        showNotification(`Applied "${p.name}" to timeline`);
                      }
                    }}
                    title={selectedElement ? `Preview "${p.name}" on selected element` : p.description}
                    style={{
                      padding: '8px 10px', textAlign: 'left', cursor: 'pointer', borderRadius: 6, position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: isPreviewing ? 'rgba(78,201,176,0.15)' : isSelected ? 'rgba(229,164,90,0.1)' : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${C.border}`,
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected && !isPreviewing) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)'); }}
                    onMouseLeave={e => { if (!isSelected && !isPreviewing) (e.currentTarget.style.background = 'transparent'); }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: 5, background: isPreviewing ? C.green : isSelected ? C.accent : SKU.btn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: (isPreviewing || isSelected) ? '#000' : '#888', fontWeight: 900, boxShadow: SKU.shadow_raised }}>
                      {isPreviewing ? '▶' : isSelected ? '✓' : ''}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isPreviewing ? C.green : isSelected ? C.accent : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 8, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{p.category}</div>
                    </div>
                    {isPreviewing && (
                      <span style={{ fontSize: 8, color: C.green, fontWeight: 800, letterSpacing: '0.04em', animation: '__panelBlink 0.6s ease-in-out infinite alternate' }}>LIVE</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Config Tab */}
        {tab === 'config' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!selectedElement && (
              <div style={{ padding: '12px 10px', fontSize: 11, color: C.muted, textAlign: 'center', background: SKU.bar, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: SKU.shadow_sunken }}>
                Click an element on the canvas to apply animations
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.dim, minWidth: 52, flexShrink: 0, fontWeight: 700, textTransform: 'uppercase' }}>Preset</span>
              <select style={{ ...sel, background: SKU.btn, boxShadow: SKU.shadow_raised }} value={animationConfig.preset || 'none'}
                onChange={e => {
                  const v = e.target.value;
                  const meta = PRESET_BY_NAME[v];
                  setAnimationConfig({ preset: v, ...(meta ? { duration: String(meta.defaultDuration), easing: meta.defaultEasing, iteration: meta.defaultIteration || '1' } : {}) });
                }}>
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.dim, minWidth: 52, flexShrink: 0, fontWeight: 700, textTransform: 'uppercase' }}>Trigger</span>
              <div style={{ display: 'flex', gap: 2, flex: 1, background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 6, padding: 2, boxShadow: SKU.shadow_sunken }}>
                {(['load', 'hover', 'click'] as const).map(opt => {
                  const sel2 = (animationConfig.trigger || 'load') === opt;
                  return (
                    <button key={opt} onClick={() => setAnimationConfig({ trigger: opt })}
                      style={{ flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: sel2 ? SKU.abtn : 'transparent',
                        color: sel2 ? '#1a0d00' : C.dim,
                        boxShadow: sel2 ? SKU.shadow_raised : 'none' }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Duration', 'duration', '0.6s'], ['Delay', 'delay', '0s']].map(([label, key, ph]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</span>
                  <input style={{ ...inp, background: SKU.btn, boxShadow: SKU.shadow_raised, padding: '5px 8px' }} value={(animationConfig as any)[key] || ''} placeholder={ph}
                    onChange={e => setAnimationConfig({ [key]: e.target.value } as any)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Repeat</span>
                <select style={{ ...sel, background: SKU.btn, boxShadow: SKU.shadow_raised, padding: '5px 8px' }} value={animationConfig.iteration || '1'} onChange={e => setAnimationConfig({ iteration: e.target.value })}>
                  {['1','2','3','5','infinite'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Direction</span>
                <select style={{ ...sel, background: SKU.btn, boxShadow: SKU.shadow_raised, padding: '5px 8px' }} value={animationConfig.direction || 'normal'} onChange={e => setAnimationConfig({ direction: e.target.value })}>
                  {['normal','reverse','alternate','alternate-reverse'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <CubicBezierEditor
              value={animationConfig.easing || 'ease'}
              onChange={v => setAnimationConfig({ easing: v })}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => animationConfig.preset && animationConfig.preset !== 'none' && previewAnimation(animationConfig.preset)}
                disabled={!animationConfig.preset || animationConfig.preset === 'none' || !selectedElement}
                style={{ flex: 1, padding: '8px', background: previewingPreset ? 'rgba(78,201,176,0.15)' : SKU.btn, border: `1px solid ${previewingPreset ? 'rgba(78,201,176,0.4)' : 'rgba(0,0,0,0.5)'}`, borderRadius: 8, cursor: (!animationConfig.preset || animationConfig.preset === 'none' || !selectedElement) ? 'not-allowed' : 'pointer', color: previewingPreset ? C.green : C.muted, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !selectedElement ? 0.5 : 1, transition: 'all 0.15s', boxShadow: SKU.shadow_raised }}>
                {previewingPreset ? <><span style={{ animation: '__panelBlink 0.6s infinite alternate' }}>▶</span> Playing…</> : <><FiPlay size={12} /> Preview</>}
              </button>
              <button onClick={applyAnimation}
                style={{ flex: 2, padding: '8px', background: applied ? 'rgba(78,201,176,0.2)' : SKU.abtn, border: `1px solid ${applied ? 'rgba(78,201,176,0.4)' : 'rgba(0,0,0,0.5)'}`, borderRadius: 8, cursor: 'pointer', color: applied ? C.green : '#1a0d00', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s', boxShadow: SKU.shadow_raised }}>
                {applied ? <><FiCheck size={13} /> Applied!</> : 'Apply to Element'}
              </button>
            </div>
          </div>
        )}

        {/* Tracks Tab */}
        {tab === 'tracks' && (
          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tracks.length === 0 ? (
              <div style={{ padding: '24px 10px', fontSize: 11, color: C.muted, textAlign: 'center', background: SKU.bar, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: SKU.shadow_sunken }}>
                No animation tracks yet.<br />
                <span style={{ fontSize: 10, color: C.dim, marginTop: 4, display: 'block' }}>Apply animations from Presets tab.</span>
              </div>
            ) : tracks.map(track => (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: SKU.btn, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: SKU.shadow_raised }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: track.color, flexShrink: 0, boxShadow: `0 0 6px ${track.color}44` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.element}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{track.animation} · {track.duration}s · {track.trigger}</div>
                </div>
                <button onClick={() => setTimelineState(prev => ({ ...prev, tracks: prev.tracks.filter(t => t.id !== track.id) }))}
                  style={{ background: 'rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer', color: C.dim, padding: 4, borderRadius: 4, display: 'flex' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f44')}
                  onMouseLeave={e => (e.currentTarget.style.color = C.dim)}>
                  <FiX size={12} />
                </button>
              </div>
            ))}
            {tracks.length > 0 && (
              <div style={{ fontSize: 9, color: C.dim, textAlign: 'center', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Open Timeline panel for full control
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default AnimationConfigPanel;
