import { describe, it, expect } from 'vitest';
import {
  BADGE_BASE,
  BADGE_VARIANTS,
  STATUS_BADGES,
  STATUSES,
  badgeClassFor,
  statusBadgeClass,
  buildStatusRegex,
} from '@/lib/statuses';

describe('BADGE_VARIANTS', () => {
  it('содержит все семантические варианты включая info', () => {
    expect(Object.keys(BADGE_VARIANTS).sort()).toEqual(
      ['danger', 'default', 'info', 'success', 'warning']
    );
  });

  it('info — синий (устранённое расхождение с FROZEN)', () => {
    expect(BADGE_VARIANTS.info).toBe('bg-blue-500/10 text-blue-600 dark:text-blue-400');
  });

  it('success — зелёный, danger — красный', () => {
    expect(BADGE_VARIANTS.success).toContain('bg-green-500/10');
    expect(BADGE_VARIANTS.danger).toContain('bg-red-500/10');
  });
});

describe('STATUS_BADGES', () => {
  it('каждый статус маппится на валидный variant', () => {
    const validVariants = Object.keys(BADGE_VARIANTS);
    for (const variant of Object.values(STATUS_BADGES)) {
      expect(validVariants).toContain(variant);
    }
  });

  it('ACTIVE → success (зелёный)', () => {
    expect(STATUS_BADGES.ACTIVE).toBe('success');
  });

  it('FROZEN → info (синий) — регрессия расхождения', () => {
    // Раньше FROZEN был только в mdx-plugins.ts, но отсутствовал в badge.tsx.
    expect(STATUS_BADGES.FROZEN).toBe('info');
  });

  it('REFERENCE → default (muted)', () => {
    expect(STATUS_BADGES.REFERENCE).toBe('default');
  });
});

describe('STATUSES', () => {
  it('содержит те же имена, что и ключи STATUS_BADGES', () => {
    expect(STATUSES.sort()).toEqual(Object.keys(STATUS_BADGES).sort());
  });

  it('включает все 5 статусов', () => {
    expect(STATUSES).toHaveLength(5);
    expect(STATUSES).toContain('FROZEN');
  });
});

describe('badgeClassFor', () => {
  it('склеивает базовый класс с цветом варианта', () => {
    expect(badgeClassFor('success')).toBe(`${BADGE_BASE} ${BADGE_VARIANTS.success}`);
  });

  it('возвращает класс default для неизвестного варианта', () => {
    expect(badgeClassFor('nonexistent')).toBe(`${BADGE_BASE} ${BADGE_VARIANTS.default}`);
  });
});

describe('statusBadgeClass', () => {
  it('ACTIVE даёт зелёный класс', () => {
    expect(statusBadgeClass('ACTIVE')).toBe(`${BADGE_BASE} ${BADGE_VARIANTS.success}`);
  });

  it('FROZEN даёт синий класс', () => {
    expect(statusBadgeClass('FROZEN')).toBe(`${BADGE_BASE} ${BADGE_VARIANTS.info}`);
  });

  it('неизвестный статус падает на default', () => {
    expect(statusBadgeClass('UNKNOWN')).toBe(`${BADGE_BASE} ${BADGE_VARIANTS.default}`);
  });
});

describe('buildStatusRegex', () => {
  it('совпадает со всеми именами из STATUSES', () => {
    const re = buildStatusRegex();
    for (const status of STATUSES) {
      re.lastIndex = 0;
      expect(re.test(`[${status}]`)).toBe(true);
    }
  });

  it('не совпадает с произвольным текстом без маркеров', () => {
    const re = buildStatusRegex();
    expect(re.test('обычный текст без статусов')).toBe(false);
  });

  it('новый regex — без протекающего lastIndex между вызовами', () => {
    // /g флаг сохраняет состояние; каждый вызов buildStatusRegex даёт свежий экземпляр
    const re = buildStatusRegex();
    re.test('[ACTIVE]');
    re.lastIndex = 0;
    expect(re.test('[FROZEN]')).toBe(true);
  });
});
