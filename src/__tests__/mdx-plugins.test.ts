import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import type { Root, Text, Element } from 'hast';
import { rehypeStatusBadges } from '@/lib/mdx-plugins';
import { BADGE_BASE, BADGE_VARIANTS } from '@/lib/statuses';

/**
 * Integration-тесты rehype-плагина: прогоняют настоящий hast-узел через
 * плагин и проверяют результат. Ловят регрессии вида «переменная не
 * определена» (плагин падает при вызове), которые не видны чистым тестам
 * модуля statuses.ts.
 */

// Запуск плагина над hast-деревом и возврат результата.
function runPlugin(html: string): Root {
  const tree: Root = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'text', value: html }],
      },
    ],
  };

  // Плагин мутирует дерево in-place. Оборачиваем в Processor, чтобы пройти
  // типобезопасную проверку unified Transformer API.
  const processor = unified().use(rehypeStatusBadges);
  processor.runSync(tree);
  return tree;
}

// Извлечение дочерних узлов единственного <p> в дереве.
function paragraphChildren(tree: Root): Array<Text | Element> {
  const p = tree.children[0] as Element;
  return p.children as Array<Text | Element>;
}

// Поиск первого сгенерированного <span class="...">badge</span>.
function firstBadgeSpan(tree: Root): Element | undefined {
  return paragraphChildren(tree).find(
    (c): c is Element => c.type === 'element' && c.tagName === 'span'
  );
}

describe('rehypeStatusBadges', () => {
  it('не падает при вызове (регрессия STATUS_RE is not defined)', () => {
    // Если внутри плагина осталась ссылка на удалённую переменную,
    // этот вызов выбросит ReferenceError и тест упадёт.
    expect(() => runPlugin('Текст со статусом [ACTIVE]')).not.toThrow();
  });

  it('преобразует [ACTIVE] в span с зелёным классом', () => {
    const tree = runPlugin('Статус: [ACTIVE]');
    const span = firstBadgeSpan(tree);

    expect(span).toBeDefined();
    expect(span!.children[0]).toMatchObject({ type: 'text', value: 'ACTIVE' });
    expect((span!.properties!.className as string[]).join(' ')).toBe(
      `${BADGE_BASE} ${BADGE_VARIANTS.success}`
    );
  });

  it('преобразует [FROZEN] в span с синим классом', () => {
    const tree = runPlugin('Заморожен: [FROZEN]');
    const span = firstBadgeSpan(tree);

    expect((span!.properties!.className as string[]).join(' ')).toBe(
      `${BADGE_BASE} ${BADGE_VARIANTS.info}`
    );
    expect(span!.children[0]).toMatchObject({ type: 'text', value: 'FROZEN' });
  });

  it('обрабатывает несколько статусов в одном тексте', () => {
    const tree = runPlugin('[ACTIVE] и [ARCHIVED] вместе');
    const spans = paragraphChildren(tree).filter(
      (c): c is Element => c.type === 'element' && c.tagName === 'span'
    );

    expect(spans).toHaveLength(2);
    expect(spans[0].children[0]).toMatchObject({ type: 'text', value: 'ACTIVE' });
    expect(spans[1].children[0]).toMatchObject({ type: 'text', value: 'ARCHIVED' });
  });

  it('сохраняет текст вокруг маркеров нетронутым', () => {
    const tree = runPlugin('до [NEW] после');
    const nodes = paragraphChildren(tree);

    // 'до ' | <span>NEW</span> | ' после'
    expect(nodes[0]).toMatchObject({ type: 'text', value: 'до ' });
    expect(nodes[2]).toMatchObject({ type: 'text', value: ' после' });
  });

  it('не меняет текст без маркеров статуса', () => {
    const tree = runPlugin('обычный текст без статусов');
    const nodes = paragraphChildren(tree);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      type: 'text',
      value: 'обычный текст без статусов',
    });
  });

  it('оставляет корректное значение класса для всех статусов', () => {
    const cases: Array<[string, keyof typeof BADGE_VARIANTS]> = [
      ['ACTIVE', 'success'],
      ['NEW', 'warning'],
      ['ARCHIVED', 'danger'],
      ['FROZEN', 'info'],
      ['REFERENCE', 'default'],
    ];

    for (const [status, variant] of cases) {
      const span = firstBadgeSpan(runPlugin(`[${status}]`));
      const className = (span!.properties!.className as string[]).join(' ');
      expect(className).toBe(`${BADGE_BASE} ${BADGE_VARIANTS[variant]}`);
    }
  });
});
