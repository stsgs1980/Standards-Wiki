'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '@/components/docs/theme-provider';

const DARK_THEME_VARS = {
  background: '#0a0a0f',
  primaryColor: '#1e1e30',
  primaryTextColor: '#E6E6E6',
  primaryBorderColor: 'rgba(125,211,252,0.35)',
  lineColor: 'rgba(125,211,252,0.5)',
  secondaryColor: '#1a1a2a',
  tertiaryColor: '#15151f',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '13px',
  nodeBorder: 'rgba(125,211,252,0.3)',
  mainBkg: '#1e1e30',
  clusterBkg: '#0d0d14',
};

const LIGHT_THEME_VARS = {
  background: '#ffffff',
  primaryColor: '#dbeafe',
  primaryTextColor: '#1e293b',
  primaryBorderColor: '#93c5fd',
  lineColor: '#64748b',
  secondaryColor: '#e0e7ff',
  tertiaryColor: '#f8fafc',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '13px',
  nodeBorder: '#93c5fd',
  mainBkg: '#dbeafe',
  clusterBkg: '#f0f9ff',
  edgeLabelBackground: '#ffffff',
};

function getMermaidThemeConfig(isDark: boolean) {
  return {
    startOnLoad: false,
    theme: isDark ? 'dark' as const : 'default' as const,
    themeVariables: isDark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
  };
}

/**
 * Hook that renders a Mermaid diagram and returns the SVG output.
 * Encapsulates mount tracking, async rendering, and error state.
 */
function useMermaidRender(code: string) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  // Stable id across re-renders: Mermaid keys its temp DOM nodes by this id,
  // so a stable value lets it reuse/replace the node instead of orphaning a
  // new dangling <svg id="mermaid-..."> on every effect run.
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const renderDiagram = async () => {
      // Detached container keeps Mermaid's temp SVG out of document.body so
      // it can't leak as a dangling <svg id="mermaid-..."> node (the cause of
      // "hanging" mermaid elements after re-render / theme switch).
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = resolvedTheme === 'dark';
        mermaid.initialize(getMermaidThemeConfig(isDark));
        const { svg: renderedSvg } = await mermaid.render(diagramId, code.trim());
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        // Always remove the temp container and any stray nodes Mermaid left
        // behind (it appends a <div id="d<id>"> wrapper + the rendered svg to
        // body on render). Stable diagramId lets us target them precisely.
        container.remove();
        document.getElementById(`d${diagramId}`)?.remove();
        document.getElementById(diagramId)?.remove();
      }
    };
    renderDiagram();
    return () => { cancelled = true; };
  }, [code, resolvedTheme, mounted, diagramId]);

  return { svg, error };
}

/**
 * Mermaid diagram component
 */
export function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { svg, error } = useMermaidRender(code);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-border bg-muted p-4 overflow-x-auto">
        <pre className="text-sm text-muted-foreground font-mono">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 rounded-lg border border-border bg-muted/50 p-4 overflow-auto"
      data-expandable
    >
      {svg ? (
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="[&>svg]:max-w-full"
        />
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}
