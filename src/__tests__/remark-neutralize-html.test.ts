import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import type { Root, RootContent, Element } from 'hast';
import { remarkNeutralizeHtml } from '@/lib/mdx-plugins';

/**
 * Регрессионные тесты для plain-markdown пайплайна (`.md`).
 *
 * Контекст: контент типа `- [ ] lang attribute on <html>` ронял MDX-компилятор
 * с "Expected a closing tag for `<html>`" → страница отдавала HTTP 500.
 * Плагин remarkNeutralizeHtml превращает raw `html` mdast-узлы в `text`,
 * чтобы угловые скобки рендерились как литеральный текст, а не как разметка.
 *
 * Тесты прогоняют реальный markdown через unified и проверяют hast-дерево.
 */

function toHast(source: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkNeutralizeHtml)
    .use(remarkRehype);
  return processor.runSync(processor.parse(source)) as Root;
}

/** Собрать весь видимый текст из hast-дерева (для утверждений). */
function textOf(node: RootContent | Root): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return (node as Element).children.map(textOf).join('');
  if (node.type === 'root') return (node as Root).children.map(textOf).join('');
  return '';
}

describe('remarkNeutralizeHtml', () => {
  it('сохраняет <html> как текст в элементе списка (регрессия A11Y-001)', () => {
    // Этот контент падал с HTTP 500 через MDX.
    const tree = toHast('- [ ] lang attribute on <html>');
    const text = textOf(tree);

    // Плейсхолдер должен остаться видимым, а не быть выброшенным или
    // превратиться в живой <html>-тег.
    expect(text).toContain('lang attribute on <html>');
  });

  it('не выбрасывает угловые плейсхолдеры вида <DOMAIN>-<NNN>', () => {
    // Дефолтный remark-rehype молча выкинул бы <DOMAIN> и <NNN>,
    // превратив строку в "ID format: -". Плагин должен сохранить их.
    const tree = toHast('ID format: <DOMAIN>-<NNN>');
    const text = textOf(tree);

    expect(text).toContain('<DOMAIN>');
    expect(text).toContain('<NNN>');
    expect(text).toContain('-');
  });

  it('не создаёт element-узлов из нейтрализованного html', () => {
    const tree = toHast('Use <DOMAIN> here');

    // В дереве не должно быть элемента с tagName 'domain' — только текст.
    const hasDomainElement = JSON.stringify(tree).includes('"tagName":"domain"');
    expect(hasDomainElement).toBe(false);
  });

  it('не трогает угловые скобки внутри инлайн-кода', () => {
    // Бэктики уже сохраняются remark-parse как текст — плагин их не должен менять.
    const tree = toHast('См. `<html>` в коде');
    const text = textOf(tree);

    expect(text).toContain('<html>');
  });

  it('не трогает угловые скобки внутри fenced code block', () => {
    const src = '```\n<span className="x">hi</span>\n```';
    const tree = toHast(src);
    const text = textOf(tree);

    expect(text).toContain('<span className="x">hi</span>');
  });

  it('оставляет обычный markdown без угловых скобок нетронутым', () => {
    const tree = toHast('Заголовок\n\nПростой **текст** с [ссылкой](/docs/foo/).');
    const text = textOf(tree);

    expect(text).toContain('Заголовок');
    expect(text).toContain('Простой текст с ссылкой.');
  });
});
