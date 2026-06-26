import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import type { Element, ElementContent, Root, RootContent, Text as HastText, Properties } from 'hast';
import ExpandableContent from '@/components/mdx/expandable-content';
import { getAllSlugs } from '@/lib/mdx-utils';
import { rehypeStatusBadges, remarkNeutralizeHtml, remarkFencedCodeDefaultLang } from '@/lib/mdx-plugins';
import {
  typographyOverrides,
  tableOverrides,
  codeOverrides,
  linkOverrides,
  blockquoteOverride,
  miscOverrides,
} from '@/components/mdx/doc-render-helpers';

interface MarkdownContentProps {
  source: string;
}

/**
 * Server component that renders `.md` content as plain markdown.
 *
 * Unlike MDXContent, no JSX is permitted: bare angle brackets (`<html>`,
 * `<DOMAIN>-<NNN>` placeholders) are literal text, never markup. This is the
 * predictable, safe behaviour for documentation-style Markdown and avoids the
 * MDX "Expected a closing tag for `<html>`" compile error.
 *
 * Pipeline: remark-parse → remark-gfm → remarkNeutralizeHtml (raw html → text)
 * → remarkFencedCodeDefaultLang → remark-rehype → rehype-slug →
 * rehypeStatusBadges, then a hast→React walker that resolves the SAME component
 * overrides MDX uses, so code blocks, mermaid diagrams, callouts, link
 * validation and typography render identically across both formats.
 */
export default function MarkdownContent({ source }: MarkdownContentProps) {
  const components = resolveComponents(getAllSlugs());

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkNeutralizeHtml)
    .use(remarkFencedCodeDefaultLang)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStatusBadges);

  const tree = processor.runSync(processor.parse(source)) as Root;

  return (
    <ExpandableContent>
      {renderNodes(tree.children, components)}
    </ExpandableContent>
  );
}

/**
 * Component map keyed by lowercase hast tag name — what the walker resolves
 * against. The merge order mirrors buildMdxComponents so precedence is
 * identical to the MDX path.
 */
function resolveComponents(validSlugs: string[]) {
  return {
    ...typographyOverrides(),
    ...tableOverrides(),
    ...codeOverrides(),
    ...linkOverrides(validSlugs),
    ...blockquoteOverride(),
    ...miscOverrides(),
  };
}

type ComponentMap = ReturnType<typeof resolveComponents>;

/** hast properties → React props, keeping only the keys we care about. */
function propsFromProperties(properties: Properties | undefined): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (!properties) return props;
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'className') props.className = Array.isArray(value) ? value.join(' ') : value;
    else if (key === 'htmlFor') props.htmlFor = value;
    else if (key === 'id') props.id = value;
    else if (key === 'href') props.href = value;
    else if (key === 'src') props.src = value;
    else if (key === 'alt') props.alt = value;
    else if (key === 'checked') props.checked = value;
    else if (key === 'disabled') props.disabled = value;
    else if (key === 'title') props.title = value;
    else if (key === 'colSpan') props.colSpan = value;
    else if (key === 'rowSpan') props.rowSpan = value;
    else if (key === 'style' && typeof value === 'object') props.style = value;
  }
  return props;
}

/**
 * HTML void elements — self-closing, must not receive `children` (React throws
 * "input is a self-closing tag and must neither have children"). GFM task-list
 * items produce `<input type="checkbox">`, so this is hit on any checklist.
 */
const VOID_TAGS = new Set(['input', 'img', 'hr', 'br', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

function renderNodes(nodes: RootContent[], components: ComponentMap): React.ReactNode[] {
  return nodes.map((node, i) => renderNode(node, components, i));
}

function renderNode(node: RootContent, components: ComponentMap, key: number): React.ReactNode {
  if (node.type === 'text') {
    return (node as HastText).value;
  }

  // remark-rehype never emits `raw` unless given allowDangerousHtml (we don't).
  // Defensive: render any stray raw as literal text.
  if (node.type === 'raw') {
    return node.value;
  }

  if (node.type !== 'element') {
    return null; // comments, doctypes, etc.
  }

  const el = node as Element;
  const isVoid = VOID_TAGS.has(el.tagName);
  // Render children only for non-void elements; void elements must not get any.
  const children = !isVoid && el.children ? renderNodes(el.children, components) : undefined;
  const props = propsFromProperties(el.properties);

  const Override = (components as Record<string, React.ComponentType<any> | undefined>)[el.tagName];
  if (Override) {
    // key is passed directly, never via spread (React requirement).
    return (
      <Override key={key} {...props}>
        {children}
      </Override>
    );
  }

  // Fallback: native HTML tag with converted props.
  return React.createElement(el.tagName, { key, ...props }, children);
}
