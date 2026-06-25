# WORKLOG

Хронологический журнал работы над StsDev Wiki Template. Новые записи добавляются сверху.

---

## 2026-06-25 — SSOT бейджей статусов, фикс mermaid, тесты покрытия

### Контекст

Обнаружено расхождение между двумя каналами рендеринга бейджей статусов в MDX-контенте:
- **JSX-компонент** `<Badge variant="...">` (`src/components/mdx/badge.tsx`) — 4 variant (success/warning/danger/default), **нет FROZEN**
- **Текстовый канал** `[ACTIVE]` / `[NEW]` (rehype-плагин `src/lib/mdx-plugins.ts`) — 5 статусов, **включая FROZEN**

Так как это шаблон для разных wiki, расхождение нужно устранить через единый источник истины (SSOT), а не точечную латку.

### Что сделано

**1. Создан SSOT-модуль `src/lib/statuses.ts`**
- `BADGE_VARIANTS` — семантические variant → Tailwind-классы (добавлен `info` для синего)
- `STATUS_BADGES` — имена статусов → variant
- `BADGE_BASE`, `STATUSES`, типы `BadgeVariant` / `StatusName`
- Функции lookup: `badgeClassFor()`, `statusBadgeClass()`, `buildStatusRegex()`

**2. Рефакторинг потребителей**
- `src/components/mdx/badge.tsx` (29→19 строк) — импорт из SSOT, добавлен `variant="info"`
- `src/lib/mdx-plugins.ts` — локальные карты удалены, regex строится динамически из `STATUSES` (исключает рассинхрон)

**3. Тесты**
- `src/__tests__/statuses.test.ts` — 17 тестов (маппинги, fallback, regex)
- `src/__tests__/mdx-plugins.test.ts` — 7 integration-тестов (прогон hast через плагин, ловит регрессии «переменная не определена»)

**4. Фикс рендеринга Mermaid** (`src/components/mdx/mermaid-diagram.tsx`)
- Стабильный id через `useId()` вместо `Math.random()` — Mermaid переиспользует узлы вместо порождения висячих
- Изолированный off-screen контейнер для рендера + очистка в `finally` — убирает `body > div[id^="dmermaid-"]`

### Допущенные ошибки и исправления

- **`STATUS_RE is not defined`** — переходный баг во время рефакторинга (между двумя Edit-операциями). Логи сервера зафиксировали 2 ошибки, после второго Edit устранено. Это показало пропуск тест-покрытия → добавлен integration-тест на плагин.
- **Ошибки TypeScript в тесте** (3 шт.) — `this` context и аргументы при прямом вызове Transformer. Исправлено через `unified().use(plugin).runSync(tree)`.
- **Ошибочная диагностика mermaid** — первичный зонд считал легитимные SVG как «висячие» (ошибка измерения: `svg[id^="mermaid-"]` ловил диаграммы в контенте). Корректное измерение — `svg[id^="mermaid-"]:not([data-expandable] *)` — показало 0 висячих узлов.

### Верификация

- 109/109 тестов зелёные (9 файлов, vitest, Node 22 через fnm)
- TypeScript: 0 моих ошибок (diff с чистым `origin/main` пустой)
- **Браузерная проверка через Chrome CDP** (headless, после переключения темы тёмная↔светлая):
  - висячие SVG mermaid: **0**
  - висячие wrapper-ы `dmermaid-`: **0**
  - диаграммы в контенте: 3 ✓

### Архитектурные решения

- **Семантические variant** (success/warning/danger/info/default), а не имена статусов — сохраняет обратную совместимость с существующим контентом `<Badge variant="success">`
- **Цвета — хардкод Tailwind-классов**, не токены (вне scope этой задачи; `callout.tsx` использует тот же паттерн)
- Frontmatter **не получил поле `status`** — статусы остаются текстовыми маркерами в контенте, как задумано архитектурой

### Затронутые файлы

- `src/lib/statuses.ts` (новый)
- `src/components/mdx/badge.tsx`
- `src/lib/mdx-plugins.ts`
- `src/components/mdx/mermaid-diagram.tsx`
- `src/__tests__/statuses.test.ts` (новый)
- `src/__tests__/mdx-plugins.test.ts` (новый)
- `WORKLOG.md` (новый)

---

## 2026-06-25 — Переход FabInspector с git submodule на npm-пакет

### Что сделано

- `@stsgs1980/fab-inspector@3.6.6` установлен через `bun add -D`
- Интеграция подключена **через официальный CLI** `fab-inspector init` (не ручные правки):
  - `src/app/layout.tsx` — `import { SelectElementFab }` + `<SelectElementFab />`
  - `src/app/api/source/route.ts` — `export { GET } from '@stsgs1980/fab-inspector/api/source'`
- Унаследованная 50-строчная локальная копия `route.ts` (наследие submodule-эпохи) удалена, чтобы установщик создал чистый re-export

### История коммитов (для прозрачности)

- `bc822c0` — удаление git submodule + код-потребитель
- `4d05deb` — синхронизация bun.lock
- `79b2090` — npm-пакет + (самовольная ручная интеграция)
- `48992e6` — revert ручной интеграции
- `c1b98d3` — корректная установка через `fab-inspector init`

### Урок

Ручная интеграция компонентов поверх решения пользователя «только установить пакет» — превышение полномочий. Использовать официальный установщик автора пакета, а не свои руки.
