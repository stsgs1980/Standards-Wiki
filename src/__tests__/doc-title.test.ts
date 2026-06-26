import { describe, it, expect } from 'vitest';
import { extractH1Title, resolveTitle } from '@/lib/doc-title';

/**
 * Тесты разрешения заголовка документа (правило 2 контракта из TEMPLATE.md):
 * frontmatter title > первый # > слаг.
 */

describe('extractH1Title', () => {
  it('берёт первый # заголовок', () => {
    expect(extractH1Title('# Мой заголовок\n\nТекст')).toBe('Мой заголовок');
  });

  it('пропускает frontmatter и берёт H1 из тела', () => {
    const raw = '---\norder: [a]\n---\n\n# Настоящий заголовок';
    expect(extractH1Title(raw)).toBe('Настоящий заголовок');
  });

  it('не путает # внутри code fence с заголовком', () => {
    const raw = '```\n# это не заголовок\n```\n\n# А это заголовок';
    expect(extractH1Title(raw)).toBe('А это заголовок');
  });

  it('не путает ## (H2) с H1', () => {
    expect(extractH1Title('## Подраздел\n\n# Главный')).toBe('Глава');
  });

  it('возвращает null когда H1 нет', () => {
    expect(extractH1Title('## Только H2\n\nТекст')).toBeNull();
  });
});

describe('resolveTitle', () => {
  it('frontmatter title имеет приоритет', () => {
    expect(resolveTitle('Из Frontmatter', '# H1', 'slug')).toBe('Из Frontmatter');
  });

  it('без frontmatter берёт H1', () => {
    expect(resolveTitle(undefined, '# H1 заголовок', 'slug')).toBe('H1 заголовок');
  });

  it('без frontmatter и H1 → слаг', () => {
    expect(resolveTitle(undefined, 'просто текст', 'meta-001')).toBe('meta-001');
  });
});
