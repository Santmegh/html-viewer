import React, {
  useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState,
} from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { GoldenLayout } from 'golden-layout';
import type { LayoutConfig, ComponentContainer } from 'golden-layout';

import FilePanel from './FilePanel';
import CodeEditor from './CodeEditor';
import PreviewPane from './PreviewPane';
import VisualEditor from './VisualEditor';
import PropertiesPanel from './PropertiesPanel';
import TimelinePanel from './TimelinePanel';
import AnimPresetsPanel from './AnimPresetsPanel';
import AnimConfigSubPanel from './AnimConfigSubPanel';
import AnimTracksSubPanel from './AnimTracksSubPanel';
import ConsolePanel from './ConsolePanel';
import EventListenersPanel from './EventListenersPanel';

export type PanelType = 'files' | 'code' | 'preview' | 'properties' | 'timeline' | 'events' | 'console' | 'anim-presets' | 'anim-config' | 'anim-tracks';
export type Mode = 'code' | 'split' | 'visual';

export interface GoldenLayoutEditorHandle {
  addPanel: (type: PanelType) => void;
  focusOrAddPanel: (type: PanelType) => void;
  resetLayout: () => void;
  getOpenPanels: () => PanelType[];
}

/* ─── Layout Presets ─── */
function getCodeLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        {
          type: 'component', componentType: 'files',
          title: '⬡ Explorer', width: 17,
        },
        {
          type: 'stack', width: 83,
          content: [
            { type: 'component', componentType: 'code', title: '⌨ Code Editor' },
            { type: 'component', componentType: 'console', title: '▶ Console' },
          ],
        },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getSplitLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        { type: 'component', componentType: 'files', title: '⬡ Explorer', width: 17 },
        {
          type: 'stack', width: 48,
          content: [
            { type: 'component', componentType: 'code', title: '⌨ Code Editor' },
            { type: 'component', componentType: 'console', title: '▶ Console' },
          ],
        },
        { type: 'component', componentType: 'preview', title: '◉ Preview', width: 35 },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getVisualLayout(): LayoutConfig {
  return {
    root: {
      type: 'row',
      content: [
        {
          type: 'stack', width: 18,
          content: [
            { type: 'component', componentType: 'anim-presets', title: '✦ Anim Presets' },
            { type: 'component', componentType: 'anim-config', title: '⊛ Anim Config' },
            { type: 'component', componentType: 'anim-tracks', title: '≋ Anim Tracks' },
          ],
        },
        {
          type: 'column', width: 56,
          content: [
            { type: 'component', componentType: 'preview', title: '◈ Visual Editor', height: 75 },
            { type: 'component', componentType: 'timeline', title: '◷ Timeline', height: 25 },
          ],
        },
        {
          type: 'stack', width: 26,
          content: [
            { type: 'component', componentType: 'properties', title: '⊞ Properties' },
            { type: 'component', componentType: 'events', title: '⚡ Events' },
          ],
        },
      ],
    },
    settings: { showPopoutIcon: false, showMaximiseIcon: true, showCloseIcon: true },
    dimensions: { borderWidth: 4, headerHeight: 28 },
  };
}

function getLayout(mode: Mode): LayoutConfig {
  if (mode === 'code')   return getCodeLayout();
  if (mode === 'visual') return getVisualLayout();
  return getSplitLayout();
}

const PANEL_TITLES: Record<PanelType, string> = {
  files: '⬡ Explorer', code: '⌨ Code Editor', preview: '◉ Preview',
  properties: '⊞ Properties', timeline: '◷ Timeline',
  events: '⚡ Events', console: '▶ Console',
  'anim-presets': '✦ Anim Presets', 'anim-config': '⊛ Anim Config', 'anim-tracks': '≋ Anim Tracks',
};

/* ─── Panel Renderer ─── */
function renderPanelContent(type: PanelType, mode: Mode): React.ReactElement {
  switch (type) {
    case 'files':
      return <FilePanel hideHeader />;
    case 'code':
      return <CodeEditor />;
    case 'preview':
      return mode === 'visual' ? <VisualEditor /> : <PreviewPane />;
    case 'properties':
      return <PropertiesPanel hideHeader />;
    case 'timeline':
      return <TimelinePanel />;
    case 'events':
      return <EventListenersPanel />;
    case 'console':
      return <ConsolePanel />;
    case 'anim-presets':
      return <AnimPresetsPanel />;
    case 'anim-config':
      return <AnimConfigSubPanel />;
    case 'anim-tracks':
      return <AnimTracksSubPanel />;
  }
}

/* ─── Main Component ─── */
interface GoldenLayoutEditorProps {
  mode: Mode;
  onPanelsChange?: (openPanels: PanelType[]) => void;
}

const GoldenLayoutEditor = forwardRef<GoldenLayoutEditorHandle, GoldenLayoutEditorProps>(
  ({ mode, onPanelsChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const glRef = useRef<GoldenLayout | null>(null);
    const rootsRef = useRef<Map<ComponentContainer, ReactDOMClient.Root>>(new Map());
    const modeRef = useRef<Mode>(mode);
    const [resetKey, setResetKey] = useState(0);
    const onPanelsChangeRef = useRef(onPanelsChange);
    useEffect(() => { onPanelsChangeRef.current = onPanelsChange; }, [onPanelsChange]);

    const getOpenPanelTypes = useCallback((): PanelType[] => {
      const gl = glRef.current as any;
      if (!gl) return [];
      const found: PanelType[] = [];
      try {
        gl.getAllContentItems?.().forEach((item: any) => {
          const ct = item._myType as PanelType | undefined;
          if (ct && !found.includes(ct)) found.push(ct);
        });
      } catch {}
      return found;
    }, []);

    const notifyPanelsChange = useCallback(() => {
      onPanelsChangeRef.current?.(getOpenPanelTypes());
    }, [getOpenPanelTypes]);

    useEffect(() => { modeRef.current = mode; }, [mode]);

    const mountPanel = useCallback((type: PanelType, container: ComponentContainer) => {
      const el = container.element as HTMLElement;
      el.style.cssText = 'height:100%;width:100%;overflow:hidden;position:relative;';
      const root = ReactDOMClient.createRoot(el);
      root.render(renderPanelContent(type, modeRef.current));
      rootsRef.current.set(container, root);
    }, []);

    /* ── Re-render all roots when mode changes (so panels get the right content) ── */
    useEffect(() => {
      rootsRef.current.forEach((root, container) => {
        const type = container.title?.replace(/^[^\w]+\s*/, '').toLowerCase();
        // find the type from the component type stored in the container
        const compType = (container as any)._initialState?.componentType as PanelType | undefined
          ?? detectType(container);
        if (compType) root.render(renderPanelContent(compType, mode));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    function detectType(container: ComponentContainer): PanelType | undefined {
      const types: PanelType[] = ['files', 'code', 'preview', 'properties', 'timeline', 'components', 'console'];
      const titleLc = (container.title || '').toLowerCase();
      return types.find(t => titleLc.includes(t));
    }

    /* ── Initialize GoldenLayout ── */
    useEffect(() => {
      if (!containerRef.current) return;

      /* Destroy existing instance */
      if (glRef.current) {
        try { glRef.current.destroy(); } catch {}
        glRef.current = null;
        rootsRef.current.forEach(r => { try { r.unmount(); } catch {} });
        rootsRef.current.clear();
      }

      const gl = new GoldenLayout(containerRef.current);
      glRef.current = gl;

      const TYPES: PanelType[] = ['files', 'code', 'preview', 'properties', 'timeline', 'events', 'console', 'anim-presets', 'anim-config', 'anim-tracks'];
      TYPES.forEach(type => {
        gl.registerComponentFactoryFunction(type, (container) => {
          (container as any)._myType = type;
          mountPanel(type, container);
        });
      });

      try {
        gl.loadLayout(getLayout(modeRef.current));
      } catch (e) {
        console.warn('GL loadLayout failed:', e);
        gl.loadLayout(getSplitLayout());
      }

      /* Notify after layout loads */
      setTimeout(() => notifyPanelsChange(), 100);

      /* Listen for panel add/remove to keep menu in sync */
      try {
        (gl as any).on?.('itemDestroyed', () => { setTimeout(notifyPanelsChange, 50); });
        (gl as any).on?.('itemCreated', () => { setTimeout(notifyPanelsChange, 50); });
      } catch {}

      /* ── ResizeObserver: keeps GL in sync with container size (fixes fullscreen glitch) ── */
      const ro = new ResizeObserver(() => {
        try { (gl as any).updateSize?.(); } catch {}
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        try { gl.destroy(); } catch {}
        rootsRef.current.forEach(r => { try { r.unmount(); } catch {} });
        rootsRef.current.clear();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, resetKey]);

    /* ── Imperative handle ── */
    useImperativeHandle(ref, () => ({
      resetLayout() {
        setResetKey(k => k + 1);
      },
      addPanel(type: PanelType) {
        const gl = glRef.current;
        if (!gl) return;
        try {
          const root = gl.groundItem;
          if (!root) return;
          (gl as any).addComponentAsColumn(type, {}, PANEL_TITLES[type]);
        } catch (e) {
          console.warn('addPanel failed:', e);
        }
      },
      focusOrAddPanel(type: PanelType) {
        const gl = glRef.current;
        if (!gl) return;
        /* Check if already in layout — focus it */
        let found = false;
        try {
          gl.getAllContentItems().forEach(item => {
            const ct = (item as any).componentType ?? (item as any)._myType;
            if (ct === type) {
              found = true;
              try { (item as any).parent?.setActiveContentItem?.(item); } catch {}
            }
          });
        } catch {}
        if (found) return;
        /* Not found — add it to the first available stack, else to root */
        try {
          let added = false;
          gl.getAllContentItems().forEach(item => {
            if (!added && item.type === 'stack') {
              try {
                (item as any).addItem({ type: 'component', componentType: type, title: PANEL_TITLES[type] });
                added = true;
              } catch {
                try {
                  (item as any).addChild({ type: 'component', componentType: type, title: PANEL_TITLES[type] });
                  added = true;
                } catch {}
              }
            }
          });
          if (!added) {
            gl.addComponent(type, {}, PANEL_TITLES[type]);
          }
        } catch (e) {
          console.warn('focusOrAddPanel failed:', e);
        }
        setTimeout(notifyPanelsChange, 100);
      },
      getOpenPanels() {
        return getOpenPanelTypes();
      },
    }));

    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
    );
  }
);

GoldenLayoutEditor.displayName = 'GoldenLayoutEditor';
export default GoldenLayoutEditor;
