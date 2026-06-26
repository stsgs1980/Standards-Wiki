import { describe, it, expect } from 'vitest';
import { applyFolderOrder, isIndexDoc } from '@/lib/folder-index';

/**
 * Тесты порядка документов внутри папки (LEVEL 2 контракта из TEMPLATE.md).
 * Логика чистая, без ФС — ядро навигации.
 */

describe('applyFolderOrder', () => {
  it('сортирует перечисленные слаги в порядке INDEX order', () => {
    const result = applyFolderOrder(['a', 'b', 'c'], ['c', 'a', 'b']);
    expect(result).toEqual(['c', 'a', 'b']);
  });

  it('дописывает неперечисленные слаги в конец по алфавиту (ничего не теряется)', () => {
    const result = applyFolderOrder(['a', 'b', 'c', 'd'], ['c', 'a']);
    // 'c' и 'a' по индексу, 'b' и 'd' (не в списке) — в конец, алфавитно.
    expect(result).toEqual(['c', 'a', 'b', 'd']);
  });

  it('без order (null) → чистый алфавит (zero-config fallback)', () => {
    const result = applyFolderOrder(['c', 'a', 'b'], null);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('пустой order → алфавит', () => {
    const result = applyFolderOrder(['c', 'a', 'b'], []);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('всегда исключает INDEX (это манифест, не страница)', () => {
    const result = applyFolderOrder(['a', 'INDEX', 'b'], ['b', 'a']);
    expect(result).toEqual(['b', 'a']);
    expect(result).not.toContain('INDEX');
  });

  it('игнорирует слаги из order, которых нет среди файлов', () => {
    const result = applyFolderOrder(['a', 'b'], ['a', 'x', 'b', 'y']);
    expect(result).toEqual(['a', 'b']);
  });

  it('регистронезависим: order в нижнем регистре匹配ает файлы в верхнем', () => {
    // Файлы на диске часто в верхнем регистре (META-001), автор INDEX пишет
    // в нижнем (meta-001) — сопоставление не должно зависеть от регистра.
    const result = applyFolderOrder(['META-001', 'ARCH-001', 'DOC-002'], ['meta-001', 'doc-002', 'arch-001']);
    expect(result).toEqual(['META-001', 'DOC-002', 'ARCH-001']);
  });
});

describe('isIndexDoc', () => {
  it('распознаёт INDEX в любом регистре', () => {
    expect(isIndexDoc('INDEX')).toBe(true);
    expect(isIndexDoc('index')).toBe(true);
    expect(isIndexDoc('Index')).toBe(true);
  });

  it('не путает INDEX с обычными слагами', () => {
    expect(isIndexDoc('meta-001')).toBe(false);
    expect(isIndexDoc('indexing')).toBe(false);
  });
});
