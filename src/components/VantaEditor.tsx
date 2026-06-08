import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getTargetHtmlFile, insertBeforeClosingTag } from '../utils/projectFiles';
import { FiZap, FiCopy, FiCheck, FiPlus, FiMousePointer, FiSettings, FiEye, FiChevronDown, FiTarget } from 'react-icons/fi';

/* ══════════════════════════════════════════════════════
   DESIGN TOKENS
══════════════════════════════════════════════════════ */
const SK = {
  bg:          '#1e1e22',
  surface:     '#252528',
  surface2:    '#2a2a30',
  raised:      '#323238',
  border:      'rgba(0,0,0,0.55)',
  borderHi:    'rgba(255,255,255,0.10)',
  text:        '#d8d8d8',
  textDim:     '#888890',
  textMuted:   '#555560',
  amber:       '#e5a45a',
  amberDim:    'rgba(229,164,90,0.12)',
  amberBrd:    'rgba(229,164,90,0.45)',
  purple:      '#a78bfa',
  purpleDim:   'rgba(167,139,250,0.12)',
  purpleBrd:   'rgba(167,139,250,0.4)',
  green:       '#4ec98e',
  greenBrd:    'rgba(78,201,142,0.4)',
};

const BTN_RAISED  = 'linear-gradient(180deg,#3a3a42 0%,#2e2e35 50%,#2a2a31 100%)';
const BTN_AMBER   = 'linear-gradient(180deg,#c8913c 0%,#e5a45a 40%,#c8913c 100%)';
const BTN_PURPLE  = 'linear-gradient(180deg,#5b21b6 0%,#7c3aed 40%,#5b21b6 100%)';
const BTN_GREEN   = 'linear-gradient(180deg,#14532d 0%,#22c55e 40%,#14532d 100%)';
const SHADOW_RAISED = 'inset 0 1px 0 rgba(255,255,255,0.13),0 2px 5px rgba(0,0,0,0.5)';
const SHADOW_SUNKEN = 'inset 0 2px 4px rgba(0,0,0,0.55)';

/* ══════════════════════════════════════════════════════
   CDNs
══════════════════════════════════════════════════════ */
const THREE_CDN  = 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js';
const P5_CDN     = 'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js';
const VANTA_BASE = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist';

/* ══════════════════════════════════════════════════════
   CONFIG PARAM TYPES
══════════════════════════════════════════════════════ */
type ParamType = 'color' | 'range' | 'int' | 'toggle';

interface Param {
  key: string;
  label: string;
  type: ParamType;
  defaultVal: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

/* ══════════════════════════════════════════════════════
   EFFECT DEFINITIONS WITH ALL CONFIG PARAMS
══════════════════════════════════════════════════════ */
interface Effect {
  id: string;
  label: string;
  emoji: string;
  lib: 'three' | 'p5';
  params: Param[];
}

const EFFECTS: Effect[] = [
  {
    id: 'BIRDS', label: 'Birds', emoji: '🐦', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background',   type: 'color',  defaultVal: '#111111' },
      { key: 'color1',          label: 'Color 1',      type: 'color',  defaultVal: '#a855f7' },
      { key: 'color2',          label: 'Color 2',      type: 'color',  defaultVal: '#ff00aa' },
      { key: 'birdSize',        label: 'Bird Size',    type: 'range',  defaultVal: 1.5,  min: 0.1, max: 5,   step: 0.1 },
      { key: 'wingSpan',        label: 'Wing Span',    type: 'range',  defaultVal: 30,   min: 10,  max: 60,  step: 1   },
      { key: 'speedLimit',      label: 'Speed Limit',  type: 'range',  defaultVal: 5,    min: 1,   max: 10,  step: 0.5 },
      { key: 'separation',      label: 'Separation',   type: 'range',  defaultVal: 20,   min: 5,   max: 100, step: 1   },
      { key: 'alignment',       label: 'Alignment',    type: 'range',  defaultVal: 20,   min: 5,   max: 100, step: 1   },
      { key: 'cohesion',        label: 'Cohesion',     type: 'range',  defaultVal: 20,   min: 5,   max: 100, step: 1   },
      { key: 'quantity',        label: 'Quantity',     type: 'int',    defaultVal: 3,    min: 1,   max: 10,  step: 1   },
    ],
  },
  {
    id: 'FOG', label: 'Fog', emoji: '🌫️', lib: 'three',
    params: [
      { key: 'highlightColor', label: 'Highlight',   type: 'color', defaultVal: '#a855f7' },
      { key: 'midtoneColor',   label: 'Midtone',     type: 'color', defaultVal: '#ff00aa' },
      { key: 'lowlightColor',  label: 'Lowlight',    type: 'color', defaultVal: '#111111' },
      { key: 'baseColor',      label: 'Base',        type: 'color', defaultVal: '#111111' },
      { key: 'blurFactor',     label: 'Blur',        type: 'range', defaultVal: 0.6,  min: 0.1, max: 1.0, step: 0.05 },
      { key: 'speed',          label: 'Speed',       type: 'range', defaultVal: 1.0,  min: 0.1, max: 5.0, step: 0.1  },
      { key: 'zoom',           label: 'Zoom',        type: 'range', defaultVal: 1.0,  min: 0.1, max: 3.0, step: 0.1  },
    ],
  },
  {
    id: 'WAVES', label: 'Waves', emoji: '🌊', lib: 'three',
    params: [
      { key: 'color',       label: 'Color',       type: 'color', defaultVal: '#a855f7' },
      { key: 'shininess',   label: 'Shininess',   type: 'range', defaultVal: 40,   min: 0,   max: 150, step: 1   },
      { key: 'waveHeight',  label: 'Wave Height', type: 'range', defaultVal: 20,   min: 0,   max: 40,  step: 1   },
      { key: 'waveSpeed',   label: 'Wave Speed',  type: 'range', defaultVal: 1.0,  min: 0.1, max: 3.0, step: 0.1 },
      { key: 'zoom',        label: 'Zoom',        type: 'range', defaultVal: 1.0,  min: 0.5, max: 2.0, step: 0.1 },
    ],
  },
  {
    id: 'CLOUDS', label: 'Clouds', emoji: '☁️', lib: 'three',
    params: [
      { key: 'backgroundColor',   label: 'Background',    type: 'color', defaultVal: '#111111' },
      { key: 'skyColor',          label: 'Sky',           type: 'color', defaultVal: '#1a1a3e' },
      { key: 'cloudColor',        label: 'Cloud',         type: 'color', defaultVal: '#888888' },
      { key: 'cloudShadowColor',  label: 'Cloud Shadow',  type: 'color', defaultVal: '#333333' },
      { key: 'sunColor',          label: 'Sun',           type: 'color', defaultVal: '#ffcc88' },
      { key: 'sunGlareColor',     label: 'Sun Glare',     type: 'color', defaultVal: '#ff6622' },
      { key: 'sunlightX',         label: 'Sun X',         type: 'range', defaultVal: 1.0, min: -1, max: 1, step: 0.05 },
      { key: 'sunlightY',         label: 'Sun Y',         type: 'range', defaultVal: 1.0, min: -1, max: 1, step: 0.05 },
      { key: 'speed',             label: 'Speed',         type: 'range', defaultVal: 1.0, min: 0, max: 3, step: 0.1   },
    ],
  },
  {
    id: 'CLOUDS2', label: 'Clouds 2', emoji: '🌤️', lib: 'p5',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'speed',           label: 'Speed',      type: 'range', defaultVal: 1.0, min: 0.1, max: 5.0, step: 0.1 },
      { key: 'quantity',        label: 'Quantity',   type: 'int',   defaultVal: 3,   min: 1,   max: 10,  step: 1   },
      { key: 'size',            label: 'Size',       type: 'range', defaultVal: 1.5, min: 0.5, max: 5.0, step: 0.1 },
      { key: 'xOffset',         label: 'X Offset',  type: 'range', defaultVal: 0,   min: -1,  max: 1,   step: 0.05 },
      { key: 'yOffset',         label: 'Y Offset',  type: 'range', defaultVal: 0,   min: -1,  max: 1,   step: 0.05 },
    ],
  },
  {
    id: 'GLOBE', label: 'Globe', emoji: '🌐', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color',           label: 'Color 1',    type: 'color', defaultVal: '#a855f7' },
      { key: 'color2',          label: 'Color 2',    type: 'color', defaultVal: '#ff00aa' },
      { key: 'size',            label: 'Size',       type: 'range', defaultVal: 1.0, min: 0.3, max: 3.0, step: 0.1 },
      { key: 'offsetX',         label: 'Offset X',  type: 'range', defaultVal: 0,   min: -100, max: 100, step: 1  },
      { key: 'offsetY',         label: 'Offset Y',  type: 'range', defaultVal: 0,   min: -100, max: 100, step: 1  },
    ],
  },
  {
    id: 'NET', label: 'Net', emoji: '🕸️', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background',   type: 'color',  defaultVal: '#111111' },
      { key: 'color',           label: 'Net Color',    type: 'color',  defaultVal: '#a855f7' },
      { key: 'points',          label: 'Points',       type: 'int',    defaultVal: 10,  min: 1,   max: 30,  step: 1   },
      { key: 'maxDistance',     label: 'Max Distance', type: 'range',  defaultVal: 20,  min: 5,   max: 40,  step: 1   },
      { key: 'spacing',         label: 'Spacing',      type: 'range',  defaultVal: 18,  min: 5,   max: 40,  step: 1   },
      { key: 'showDots',        label: 'Show Dots',    type: 'toggle', defaultVal: true },
    ],
  },
  {
    id: 'CELLS', label: 'Cells', emoji: '🔬', lib: 'p5',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color1',          label: 'Color 1',    type: 'color', defaultVal: '#a855f7' },
      { key: 'color2',          label: 'Color 2',    type: 'color', defaultVal: '#ff00aa' },
      { key: 'size',            label: 'Cell Size',  type: 'range', defaultVal: 1.5, min: 0.5, max: 5.0, step: 0.1 },
      { key: 'speed',           label: 'Speed',      type: 'range', defaultVal: 1.0, min: 0.1, max: 5.0, step: 0.1 },
    ],
  },
  {
    id: 'TRUNK', label: 'Trunk', emoji: '🌳', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color',           label: 'Branch Color', type: 'color', defaultVal: '#a855f7' },
      { key: 'chaos',           label: 'Chaos',      type: 'range', defaultVal: 2.0, min: 0.1, max: 10,  step: 0.1 },
      { key: 'spacing',         label: 'Spacing',    type: 'range', defaultVal: 100, min: 10,  max: 500, step: 5   },
    ],
  },
  {
    id: 'TOPOLOGY', label: 'Topology', emoji: '📐', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color',           label: 'Line Color', type: 'color', defaultVal: '#a855f7' },
    ],
  },
  {
    id: 'DOTS', label: 'Dots', emoji: '⬤', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color',           label: 'Color 1',    type: 'color', defaultVal: '#a855f7' },
      { key: 'color2',          label: 'Color 2',    type: 'color', defaultVal: '#ff00aa' },
      { key: 'size',            label: 'Dot Size',   type: 'range', defaultVal: 3.0, min: 1, max: 10, step: 0.5 },
      { key: 'spacing',         label: 'Spacing',    type: 'range', defaultVal: 35,  min: 10, max: 80, step: 1  },
      { key: 'showLines',       label: 'Show Lines', type: 'toggle', defaultVal: true },
    ],
  },
  {
    id: 'RINGS', label: 'Rings', emoji: '💫', lib: 'three',
    params: [
      { key: 'backgroundColor', label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'color',           label: 'Ring Color', type: 'color', defaultVal: '#a855f7' },
    ],
  },
  {
    id: 'HALO', label: 'Halo', emoji: '✨', lib: 'three',
    params: [
      { key: 'backgroundColor',  label: 'Background', type: 'color', defaultVal: '#111111' },
      { key: 'baseColor',        label: 'Base Color', type: 'color', defaultVal: '#a855f7' },
      { key: 'amplitudeFactor',  label: 'Amplitude',  type: 'range', defaultVal: 1.0, min: 0.1, max: 5.0, step: 0.1 },
      { key: 'xOffset',          label: 'X Offset',   type: 'range', defaultVal: 0,   min: -0.5, max: 0.5, step: 0.01 },
      { key: 'yOffset',          label: 'Y Offset',   type: 'range', defaultVal: 0,   min: -0.5, max: 0.5, step: 0.01 },
      { key: 'size',             label: 'Size',       type: 'range', defaultVal: 1.5, min: 0.5, max: 5.0, step: 0.1  },
    ],
  },
];

/* ══════════════════════════════════════════════════════
   DEFAULT PARAMS FOR AN EFFECT
══════════════════════════════════════════════════════ */
function defaultParams(effect: Effect): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  effect.params.forEach(p => { out[p.key] = p.defaultVal; });
  return out;
}

/* ══════════════════════════════════════════════════════
   COLOR HELPER: "#rrggbb" → 0xrrggbb
══════════════════════════════════════════════════════ */
function hexToNum(hex: string): string {
  return '0x' + hex.replace('#', '').toUpperCase();
}

/* ══════════════════════════════════════════════════════
   BUILD PREVIEW HTML
══════════════════════════════════════════════════════ */
function buildPreview(effect: Effect, params: Record<string, any>): string {
  const libSrc = effect.lib === 'p5' ? P5_CDN : THREE_CDN;

  const configLines: string[] = [];
  effect.params.forEach(p => {
    const val = params[p.key] ?? p.defaultVal;
    if (p.type === 'color') {
      configLines.push(`      ${p.key}: ${hexToNum(val as string)},`);
    } else if (p.type === 'toggle') {
      configLines.push(`      ${p.key}: ${val},`);
    } else {
      configLines.push(`      ${p.key}: ${val},`);
    }
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;}
#bg{width:100%;height:100%;}
</style>
</head>
<body>
<div id="bg"></div>
<script>
function load(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
(async()=>{
  try{
    await load('${libSrc}');
    await new Promise(r=>setTimeout(r,250));
    window.THREE=window.THREE||THREE;
    await load('${VANTA_BASE}/vanta.${effect.id.toLowerCase()}.min.js');
    await new Promise(r=>setTimeout(r,150));
    if(!window.VANTA||!VANTA.${effect.id}){
      document.body.innerHTML='<div style="color:#e05555;padding:16px;font-family:monospace;font-size:12px">Effect not available</div>';return;
    }
    VANTA.${effect.id}({
      el:'#bg',
      mouseControls:true,touchControls:true,gyroControls:false,
      minHeight:200,minWidth:200,
${configLines.join('\n')}
    });
  }catch(err){
    document.body.innerHTML='<pre style="padding:16px;color:#e05555;font-size:11px;font-family:monospace">'+err+'</pre>';
  }
})();
</script>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════
   UNIQUE MARKERS — used to find & replace existing code
══════════════════════════════════════════════════════ */
const MARKER_CDN_START  = '<!-- vanta-cdn-start -->';
const MARKER_CDN_END    = '<!-- vanta-cdn-end -->';
const MARKER_INIT_START = '<!-- vanta-init-start -->';
const MARKER_INIT_END   = '<!-- vanta-init-end -->';

/* ══════════════════════════════════════════════════════
   BUILD HEAD BLOCK  (CDN scripts only)
══════════════════════════════════════════════════════ */
function buildHeadBlock(effect: Effect): string {
  const libSrc = effect.lib === 'p5' ? P5_CDN : THREE_CDN;
  return `${MARKER_CDN_START}
<script src="${libSrc}"></script>
<script src="${VANTA_BASE}/vanta.${effect.id.toLowerCase()}.min.js"></script>
${MARKER_CDN_END}`;
}

/* ══════════════════════════════════════════════════════
   BUILD BODY BLOCK  (init call only)
══════════════════════════════════════════════════════ */
function buildInitBlock(effect: Effect, params: Record<string, any>, selector: string): string {
  const configLines: string[] = [];
  effect.params.forEach(p => {
    const val = params[p.key] ?? p.defaultVal;
    const v = p.type === 'color' ? hexToNum(val as string) : val;
    configLines.push(`        ${p.key}: ${v},`);
  });

  return `${MARKER_INIT_START}
<script>
(function(){
  function initVanta(){
    if(window.VANTA && VANTA.${effect.id}){
      VANTA.${effect.id}({
        el: "${selector}",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
${configLines.join('\n')}
      });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initVanta);
  else initVanta();
})();
</script>
${MARKER_INIT_END}`;
}

/* ══════════════════════════════════════════════════════
   SMART INJECT — replaces existing blocks or inserts fresh
══════════════════════════════════════════════════════ */
function smartInjectVanta(
  html: string,
  effect: Effect,
  params: Record<string, any>,
  selector: string
): string {
  const headBlock = buildHeadBlock(effect);
  const initBlock = buildInitBlock(effect, params, selector);

  // ── Replace or insert CDN block in <head> ──────────────
  const cdnRe = new RegExp(
    `${MARKER_CDN_START}[\\s\\S]*?${MARKER_CDN_END}`, 'i'
  );
  if (cdnRe.test(html)) {
    html = html.replace(cdnRe, headBlock);
  } else {
    // Insert before </head>, or prepend if no <head>
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${headBlock}\n</head>`);
    } else if (/<head>/i.test(html)) {
      html = html.replace(/<head>/i, `<head>\n${headBlock}`);
    } else {
      html = headBlock + '\n' + html;
    }
  }

  // ── Replace or insert init block in <body> ─────────────
  const initRe = new RegExp(
    `${MARKER_INIT_START}[\\s\\S]*?${MARKER_INIT_END}`, 'i'
  );
  if (initRe.test(html)) {
    html = html.replace(initRe, initBlock);
  } else {
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${initBlock}\n</body>`);
    } else {
      html = html + '\n' + initBlock;
    }
  }

  return html;
}

/* ── keep for Copy Code ── */
function buildVantaCode(effect: Effect, params: Record<string, any>, selector: string): string {
  return buildHeadBlock(effect) + '\n\n' + buildInitBlock(effect, params, selector);
}

/* ══════════════════════════════════════════════════════
   SELECTOR FROM SELECTED ELEMENT (visual mode)
══════════════════════════════════════════════════════ */
function buildSelector(sel: { tagName: string; id: string; className: string } | null): string {
  if (!sel) return 'body';
  if (sel.id) return `#${sel.id}`;
  if (sel.className) return `.${sel.className.trim().split(/\s+/)[0]}`;
  return sel.tagName.toLowerCase() || 'body';
}

/* ══════════════════════════════════════════════════════
   PARSE HTML → ELEMENT SELECTOR OPTIONS
══════════════════════════════════════════════════════ */
interface SelectorOption {
  value: string;
  label: string;
  tag: string;
  type: 'body' | 'id' | 'class' | 'tag';
}

function parseHtmlSelectors(html: string): SelectorOption[] {
  const results: SelectorOption[] = [
    { value: 'body', label: 'body', tag: 'body', type: 'body' },
  ];

  // More robust regex for id and class extraction
  // 1. IDs
  const idMatches = Array.from(html.matchAll(/<[a-z0-9-]+[^>]*\sid=["']([^"']+)["']/gi));
  const seenIds = new Set<string>();
  idMatches.forEach(m => {
    const id = m[1].trim();
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      results.push({ value: `#${id}`, label: `#${id}`, tag: '', type: 'id' });
    }
  });

  // 2. Classes
  const classMatches = Array.from(html.matchAll(/<[a-z0-9-]+[^>]*\sclass=["']([^"']+)["']/gi));
  const seenClasses = new Set<string>();
  classMatches.forEach(m => {
    const classes = m[1].trim().split(/\s+/);
    classes.forEach(cls => {
      if (cls && !seenClasses.has(cls) && !/[:{]/.test(cls)) {
        seenClasses.add(cls);
        results.push({ value: `.${cls}`, label: `.${cls}`, tag: '', type: 'class' });
      }
    });
  });

  // Collect semantic/structural tags (unique)
  const SEMANTIC = ['header','nav','main','section','article','aside','footer','div','hero','h1','h2','h3','p','ul','ol','li','a','button','form','input','table'];
  const tagMatches = Array.from(html.matchAll(/<([\w-]+)[\s>]/gi));
  const seenTags = new Set<string>(['html','head','body','meta','link','script','style','title','br','hr','img','span']);
  tagMatches.forEach(m => {
    const tag = m[1].toLowerCase();
    if (!seenTags.has(tag) && SEMANTIC.includes(tag)) {
      seenTags.add(tag);
      results.push({ value: tag, label: tag, tag, type: 'tag' });
    }
  });

  return results;
}

/* ══════════════════════════════════════════════════════
   CUSTOM SELECTOR DROPDOWN
══════════════════════════════════════════════════════ */
const TYPE_COLORS: Record<string, string> = {
  body:  '#e5a45a',
  id:    '#60a5fa',
  class: '#a78bfa',
  tag:   '#4ec98e',
};

function SelectorDropdown({
  options, value, onChange,
}: { options: SelectorOption[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
          background: 'linear-gradient(180deg,#2e2e36 0%,#252530 100%)',
          border: `1px solid ${open ? SK.amberBrd : 'rgba(255,255,255,0.1)'}`,
          boxShadow: open
            ? `inset 0 2px 4px rgba(0,0,0,0.5),0 0 0 2px rgba(229,164,90,0.15)`
            : SHADOW_SUNKEN,
          color: SK.text, fontFamily: 'inherit', transition: 'all 0.12s',
        }}
      >
        {/* Type badge */}
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
          color: TYPE_COLORS[selected?.type ?? 'body'],
          background: `${TYPE_COLORS[selected?.type ?? 'body']}18`,
          border: `1px solid ${TYPE_COLORS[selected?.type ?? 'body']}40`,
          borderRadius: 4, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase',
        }}>{selected?.type ?? 'body'}</span>

        <code style={{ flex: 1, textAlign: 'left', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: TYPE_COLORS[selected?.type ?? 'body'], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.value ?? 'body'}
        </code>

        {selected?.tag && selected.type !== 'body' && selected.type !== 'tag' && (
          <span style={{ fontSize: 9, color: SK.textMuted, flexShrink: 0 }}>&lt;{selected.tag}&gt;</span>
        )}

        <FiChevronDown size={11} color={SK.textMuted} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', left: 0, right: 0, zIndex: 9999,
          background: '#1e1e26',
          border: `1px solid ${SK.amberBrd}`,
          borderRadius: 8,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.7),0 0 0 1px rgba(229,164,90,0.08)',
          maxHeight: 240, overflowY: 'auto',
          padding: 4,
        }}>
          {/* Group header helper */}
          {(['body', 'id', 'class', 'tag'] as const).map(grp => {
            const items = options.filter(o => o.type === grp);
            if (!items.length) return null;
            const grpLabels: Record<string, string> = { body: 'Page', id: 'IDs', class: 'Classes', tag: 'Tags' };
            return (
              <div key={grp}>
                <div style={{ fontSize: 9, fontWeight: 800, color: TYPE_COLORS[grp], letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 8px 2px' }}>
                  {grpLabels[grp]}
                </div>
                {items.map(opt => {
                  const active = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', borderRadius: 5, cursor: 'pointer',
                        background: active ? `${TYPE_COLORS[grp]}18` : 'transparent',
                        border: `1px solid ${active ? `${TYPE_COLORS[grp]}40` : 'transparent'}`,
                        marginBottom: 1, transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: active ? TYPE_COLORS[grp] : SK.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opt.value}
                      </code>
                      {opt.tag && opt.type !== 'body' && opt.type !== 'tag' && (
                        <span style={{ fontSize: 9, color: SK.textMuted, flexShrink: 0 }}>&lt;{opt.tag}&gt;</span>
                      )}
                      {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: TYPE_COLORS[grp], boxShadow: `0 0 5px ${TYPE_COLORS[grp]}`, flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BUTTON
══════════════════════════════════════════════════════ */
function Btn({ onClick, bg = BTN_RAISED, color = SK.text, border = SK.border, shadow = SHADOW_RAISED, title, disabled, children, style }: {
  onClick: () => void; bg?: string; color?: string; border?: string; shadow?: string;
  title?: string; disabled?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 5, cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? 'rgba(255,255,255,0.03)' : bg,
      border: `1px solid ${border}`,
      color: disabled ? SK.textMuted : color,
      boxShadow: disabled ? 'none' : shadow,
      fontSize: 11, fontFamily: 'inherit', fontWeight: 700,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      opacity: disabled ? 0.45 : 1, transition: 'all 0.12s',
      ...style,
    }}>{children}</button>
  );
}

/* ══════════════════════════════════════════════════════
   SINGLE PARAM CONTROL
══════════════════════════════════════════════════════ */
function ParamControl({ param, value, onChange }: {
  param: Param;
  value: string | number | boolean;
  onChange: (key: string, val: string | number | boolean) => void;
}) {
  if (param.type === 'color') {
    const hex = value as string;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ fontSize: 10, color: SK.textMuted, width: 90, flexShrink: 0, fontWeight: 600 }}>{param.label}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <input type="color" value={hex} onChange={e => onChange(param.key, e.target.value)}
              style={{ width: 30, height: 22, cursor: 'pointer', border: `1px solid ${SK.border}`, borderRadius: 4, padding: 1, background: 'rgba(0,0,0,0.4)', boxShadow: SHADOW_RAISED }} />
          </div>
          <code style={{ fontSize: 10, color: SK.textDim, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>{hex}</code>
        </label>
      </div>
    );
  }

  if (param.type === 'toggle') {
    const checked = value as boolean;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ fontSize: 10, color: SK.textMuted, width: 90, flexShrink: 0, fontWeight: 600 }}>{param.label}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
          <div
            onClick={() => onChange(param.key, !checked)}
            style={{
              width: 32, height: 16, borderRadius: 8, cursor: 'pointer',
              background: checked ? SK.amber : 'rgba(255,255,255,0.1)',
              border: `1px solid ${checked ? SK.amberBrd : SK.border}`,
              position: 'relative', transition: 'all 0.15s',
              boxShadow: checked ? `0 0 6px ${SK.amberBrd}` : SHADOW_SUNKEN,
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: checked ? 16 : 2,
              width: 10, height: 10, borderRadius: '50%',
              background: checked ? '#fff' : SK.textMuted,
              transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }} />
          </div>
          <span style={{ fontSize: 10, color: checked ? SK.amber : SK.textMuted }}>{checked ? 'On' : 'Off'}</span>
        </label>
      </div>
    );
  }

  if (param.type === 'range' || param.type === 'int') {
    const num = value as number;
    return (
      <div style={{ padding: '3px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: SK.textMuted, fontWeight: 600 }}>{param.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={num}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={e => onChange(param.key, parseFloat(e.target.value) || 0)}
              style={{
                width: 48, fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                color: SK.amber, background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${SK.border}`, borderRadius: 3,
                padding: '1px 4px', textAlign: 'right',
                boxShadow: SHADOW_SUNKEN,
              }}
            />
          </div>
        </div>
        <input
          type="range"
          min={param.min} max={param.max} step={param.step}
          value={num}
          onChange={e => onChange(param.key, parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: SK.amber, cursor: 'pointer', height: 3 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
          <span style={{ fontSize: 9, color: SK.textMuted }}>{param.min}</span>
          <span style={{ fontSize: 9, color: SK.textMuted }}>{param.max}</span>
        </div>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const VantaEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, showNotification, selectedElement } = useEditorStore();
  const htmlFile = getTargetHtmlFile(files, activeFileId);

  const [selectedEffect, setSelectedEffect] = useState(EFFECTS[0]);
  const [params, setParams]                 = useState<Record<string, any>>(() => defaultParams(EFFECTS[0]));
  const [tab, setTab]                       = useState<'effects' | 'config'>('effects');
  const [copied,       setCopied]           = useState(false);
  const [appliedMsg,   setAppliedMsg]       = useState(false);
  const [chosenSel,    setChosenSel]        = useState('body');

  // Parse HTML elements whenever the file changes
  const selectorOptions = useMemo(() => {
    if (!htmlFile?.content) return [{ value: 'body', label: 'body', tag: 'body', type: 'body' as const }];
    return parseHtmlSelectors(htmlFile.content);
  }, [htmlFile?.content]);

  // Keep chosenSel valid when file changes
  useEffect(() => {
    if (!selectorOptions.find(o => o.value === chosenSel)) setChosenSel('body');
  }, [selectorOptions]);

  // Auto-sync visual-mode selection into dropdown
  useEffect(() => {
    if (!selectedElement) return;
    const autoSel = buildSelector(selectedElement as any);
    if (selectorOptions.find(o => o.value === autoSel)) setChosenSel(autoSel);
  }, [selectedElement, selectorOptions]);

  useEffect(() => {
    setParams(defaultParams(selectedEffect));
  }, [selectedEffect]);

  const preview = useMemo(
    () => buildPreview(selectedEffect, params),
    [selectedEffect, params]
  );

  const setProp = useCallback((key: string, val: string | number | boolean) => {
    setParams(prev => ({ ...prev, [key]: val }));
  }, []);

  const inject = useCallback(() => {
    if (!htmlFile) { showNotification('No HTML file found'); return; }
    try {
      const newContent = smartInjectVanta(htmlFile.content, selectedEffect, params, chosenSel);
      updateFileContent(htmlFile.id, newContent);
      setAppliedMsg(true);
      showNotification(`✦ Vanta ${selectedEffect.label} → ${chosenSel}`);
      setTimeout(() => setAppliedMsg(false), 2400);
    } catch {
      showNotification('Could not insert Vanta code');
    }
  }, [htmlFile, selectedEffect, params, chosenSel, updateFileContent, showNotification]);

  const copyCode = () => {
    navigator.clipboard.writeText(buildVantaCode(selectedEffect, params, chosenSel)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };

  const resetParams = () => setParams(defaultParams(selectedEffect));

  /* ── Render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SK.bg, color: SK.text, fontFamily: "'Inter',-apple-system,sans-serif", overflow: 'hidden', fontSize: 12 }}>

      {/* ── TOOLBAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
        height: 34, flexShrink: 0,
        background: 'linear-gradient(180deg,#2e2e34 0%,#252528 50%,#222225 100%)',
        borderBottom: `1px solid ${SK.border}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.07),0 2px 6px rgba(0,0,0,0.4)',
      }}>
        <FiZap size={11} color={SK.amber} />
        <span style={{ fontSize: 11, fontWeight: 700, color: SK.amber, letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>VANTA JS</span>
        <span style={{ fontSize: 10, color: SK.textMuted }}>— {selectedEffect.emoji} {selectedEffect.label}</span>
        <div style={{ flex: 1 }} />
        <Btn onClick={resetParams} title="Reset to defaults" style={{ padding: '3px 7px', fontSize: 9 }}>Reset</Btn>
        <Btn onClick={copyCode} title="Copy inject code" style={{ padding: '3px 8px', fontSize: 10 }}>
          {copied ? <><FiCheck size={10} color={SK.green} /> Copied</> : <><FiCopy size={10} /> Copy</>}
        </Btn>
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ height: 160, flexShrink: 0, position: 'relative', background: '#0a0a0a', borderBottom: `1px solid ${SK.border}` }}>
        <iframe
          key={JSON.stringify({ id: selectedEffect.id, ...params })}
          srcDoc={preview}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
        <div style={{
          position: 'absolute', top: 7, left: 7,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
          padding: '4px 9px', fontSize: 11, fontWeight: 700, color: SK.text,
          pointerEvents: 'none',
        }}>
          {selectedEffect.emoji} {selectedEffect.label}
          <span style={{ marginLeft: 5, fontSize: 9, color: SK.textMuted }}>{selectedEffect.lib}.js</span>
        </div>
        {/* Live indicator */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)', borderRadius: 5, padding: '2px 6px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: SK.green, boxShadow: `0 0 6px ${SK.green}` }} />
          <span style={{ fontSize: 9, color: SK.green, fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', flexShrink: 0, background: SK.surface, borderBottom: `1px solid ${SK.border}` }}>
        {([
          ['effects', <FiEye size={10} />, 'Effects'],
          ['config',  <FiSettings size={10} />, 'Config'],
        ] as const).map(([id, icon, label]) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id as any)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: active ? SK.surface2 : 'transparent',
              color: active ? SK.amber : SK.textMuted,
              borderBottom: `2px solid ${active ? SK.amber : 'transparent'}`,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              transition: 'all 0.12s',
            }}>
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: EFFECTS ── */}
      {tab === 'effects' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {EFFECTS.map(effect => {
              const active = selectedEffect.id === effect.id;
              return (
                <div
                  key={effect.id}
                  onClick={() => setSelectedEffect(effect)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px',
                    borderRadius: 6, cursor: 'pointer',
                    background: active ? SK.amberDim : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? SK.amberBrd : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: active ? `0 2px 8px rgba(229,164,90,0.1),inset 0 1px 0 rgba(255,255,255,0.06)` : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{effect.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? SK.amber : SK.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {effect.label}
                    </div>
                    <div style={{ fontSize: 9, color: SK.textMuted, marginTop: 1 }}>{effect.lib}.js</div>
                  </div>
                  {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: SK.amber, boxShadow: `0 0 6px ${SK.amber}`, flexShrink: 0, marginLeft: 'auto' }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: CONFIG ── */}
      {tab === 'config' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: SK.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 0 6px', textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>
            {selectedEffect.emoji} {selectedEffect.label} — Options
          </div>
          {selectedEffect.params.map(p => (
            <ParamControl key={p.key} param={p} value={params[p.key] ?? p.defaultVal} onChange={setProp} />
          ))}
        </div>
      )}

      {/* ── TARGET SELECTOR + APPLY ── */}
      <div style={{
        flexShrink: 0,
        background: SK.surface,
        borderTop: `1px solid ${SK.border}`,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.35)',
      }}>

        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px 4px' }}>
          <FiTarget size={10} color={SK.amber} />
          <span style={{ fontSize: 10, fontWeight: 700, color: SK.amber, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Target Element
          </span>
          <span style={{ fontSize: 9, color: SK.textMuted, marginLeft: 2 }}>
            — {selectorOptions.length - 1} found
          </span>
          {selectedElement && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, color: SK.purple,
              background: SK.purpleDim, border: `1px solid ${SK.purpleBrd}`,
              borderRadius: 4, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <FiMousePointer size={8} /> Visual
            </span>
          )}
        </div>

        {/* Dropdown row */}
        <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <SelectorDropdown
            options={selectorOptions}
            value={chosenSel}
            onChange={setChosenSel}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 10px' }} />

        {/* Apply button */}
        <div style={{ padding: '8px 10px' }}>
          <button
            onClick={inject}
            disabled={!htmlFile}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 7, cursor: !htmlFile ? 'not-allowed' : 'pointer',
              background: appliedMsg
                ? `linear-gradient(135deg,#14532d,#166534)`
                : `linear-gradient(135deg,#5b21b6,#7c3aed,#6d28d9)`,
              border: `1px solid ${appliedMsg ? 'rgba(78,201,142,0.5)' : 'rgba(167,139,250,0.5)'}`,
              boxShadow: appliedMsg
                ? '0 0 16px rgba(78,201,142,0.25),inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 4px 16px rgba(109,40,217,0.35),inset 0 1px 0 rgba(255,255,255,0.15)',
              color: '#fff', fontFamily: 'inherit', fontWeight: 800,
              fontSize: 12, letterSpacing: '0.03em',
              transition: 'all 0.18s', opacity: !htmlFile ? 0.4 : 1,
            }}
          >
            {appliedMsg ? (
              <><FiCheck size={13} color="#4ec98e" /> <span style={{ color: '#4ec98e' }}>Applied to </span><code style={{ fontFamily: 'monospace', fontSize: 11, color: '#4ec98e' }}>{chosenSel}</code></>
            ) : (
              <><FiZap size={13} /> Apply {selectedEffect.emoji} {selectedEffect.label} to <code style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(0,0,0,0.25)', padding: '0 5px', borderRadius: 3 }}>{chosenSel}</code></>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

export default VantaEditor;
