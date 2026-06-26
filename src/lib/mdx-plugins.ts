import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Element } from 'hast';
import type { Root as MdxRoot, RootContent, Code, Html } from 'mdast';
import { buildStatusRegex, statusBadgeClass } from '@/lib/statuses';

/**
 * Rehype plugin: auto-converts [ACTIVE], [NEW], [ARCHIVED], [FROZEN],
 * [REFERENCE] text patterns into colored badge spans.
 * Works in table cells, paragraphs, list items — everywhere.
 *
 * Colors are resolved through @/lib/statuses so they stay in sync with the
 * <Badge> component channel.
 */

export const rehypeStatusBadges: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      // Fresh regex per text node: a /g flag keeps lastIndex state across calls.
      const statusRe = buildStatusRegex();
      if (!statusRe.test(node.value)) return;
      statusRe.lastIndex = 0;

      const fragments: Array<Text | Element> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = statusRe.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          fragments.push({ type: 'text', value: node.value.slice(lastIndex, match.index) } as Text);
        }
        const status = match[1] as string;
        fragments.push({
          type: 'element',
          tagName: 'span',
          properties: { className: statusBadgeClass(status).split(' ') },
          children: [{ type: 'text', value: status }],
        } as Element);
        lastIndex = statusRe.lastIndex;
      }

      if (lastIndex < node.value.length) {
        fragments.push({ type: 'text', value: node.value.slice(lastIndex) } as Text);
      }

      (parent.children as Array<Text | Element>).splice(index, 1, ...fragments);
    });
  };
};

/**
 * Remark plugin: assigns 'plain' as default language to fenced code blocks
 * that have no language specified.
 */
export function remarkFencedCodeDefaultLang() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (!node.lang && !node.meta) {
        node.lang = 'plain';
      }
    });
  };
}

/**
 * Remark plugin for the plain-markdown (`.md`) pipeline: turns raw `html`
 * mdast nodes into `text` nodes so their angle brackets render as literal
 * text instead of being treated as markup.
 *
 * Why this exists: plain Markdown documents use bare `<DOMAIN>`, `<NNN>`,
 * `<html>` etc. as placeholders (a documentation convention). The MDX
 * compiler would parse these as JSX tags and throw ("Expected a closing
 * tag for `<html>`"); default remark-rehype would silently drop them
 * (data loss). Neutralising to text keeps the placeholder visible verbatim
 * and is the predictable, safe behaviour for `.md` content.
 *
 * Angle brackets inside inline code (`` `<html>` ``) and fenced code are
 * already stored as plain text nodes by remark-parse, so they are untouched.
 */
export function remarkNeutralizeHtml() {
  return (tree: MdxRoot) => {
    visit(tree, 'html', (node: Html) => {
      // Mutate the node in place: raw HTML becomes literal text. Cast because
      // the mdast `html` literal type narrows `type` to 'html' — the reassign
      // is intentional and the surrounding shape (value) is compatible.
      (node as unknown as { type: 'text' }).type = 'text';
    });
  };
}
