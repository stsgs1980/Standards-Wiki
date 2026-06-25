import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Element } from 'hast';
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
