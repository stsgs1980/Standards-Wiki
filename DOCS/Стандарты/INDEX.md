---
title: Стандарты
order:
  # Фундамент: система идентификаторов, архитектура, формат документов
  - meta-001-standard-id-system
  - meta-001-id-registry
  - meta-001-faq
  - arch-001-architecture-and-repo-layout
  - arch-002-implementation-order
  - doc-002-markdown-standard
  - doc-002-eslint-integration
  - doc-003-unicode-policy
  # Окружение
  - env-001-reproducibility
  - env-002-zai-integration
  # Дизайн и фронтенд
  - design-001-design-system
  - design-001-profile-cards
  - design-001-profile-terminal-dashboard
  - fe-001-frontend
  - a11y-001-wcag-2-1-aa
  # Безопасность, ошибки, тестирование
  - sec-001-security-core
  - sec-002-security-extended
  - err-001-error-handling
  - err-002-error-recovery
  - test-001-testing
  # Процессы: агенты, git, навыки
  - agent-001-subagent
  - agent-002-orchestration
  - git-001-github
  - git-002-github-sandbox
  - skill-001-skill-format
  # Корневой обзор
  - z-ai-standards
---

# Стандарты — индекс

> Manifest-файл папки. Список `order:` выше задаёт порядок документов в
> навигации. Документы не из списка добавляются в конец (алфавитно) —
> ничего не теряется.

## Назначение

Эта папка содержит нормативные стандарты экосистемы. Каждый стандарт —
самостоятельный `.md`-файл, идентифицируемый своим ID (`STD-<DOMAIN>-<NUMBER>`).

## Как добавить новый стандарт

1. Создай `<DOMAIN>-<NNN>-<name>.md` в этой папке.
2. Добавь его слаг в список `order:` выше (в желаемой позиции).
3. Стандарт автоматически появится в навигации — без правок кода.
