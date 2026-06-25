/**
 * Single source of truth for badge status colors.
 *
 * Two rendering channels share these maps so a status always resolves to the
 * same Tailwind classes regardless of how it is authored in MDX:
 *   - <Badge variant="success">  (component, src/components/mdx/badge.tsx)
 *   - [ACTIVE]                   (rehype plugin, src/lib/mdx-plugins.ts)
 *
 * To add a status: extend `STATUS_BADGES`, `STATUSES`, and (if a new hue is
 * needed) `BADGE_VARIANTS`. Both channels pick it up automatically.
 */

/**
 * Shared base layout for every badge.
 * Kept here so the component and the rehype plugin never drift apart.
 */
export const BADGE_BASE =
  'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium';

/**
 * Semantic badge variants → color classes.
 * `info` (blue) mirrors the info block in src/components/mdx/callout.tsx.
 */
export const BADGE_VARIANTS = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
} as const;

export type BadgeVariant = keyof typeof BADGE_VARIANTS;

/**
 * Status names authored in MDX → semantic variant.
 * Keys are the literal text used inside [STATUS] markers and <Badge>.
 */
export const STATUS_BADGES = {
  ACTIVE: 'success',
  NEW: 'warning',
  ARCHIVED: 'danger',
  FROZEN: 'info',
  REFERENCE: 'default',
} as const satisfies Record<string, BadgeVariant>;

export type StatusName = keyof typeof STATUS_BADGES;

/**
 * Ordered list of status names. Drives the [STATUS] regex so it can never
 * desynchronize from STATUS_BADGES.
 */
export const STATUSES = Object.keys(STATUS_BADGES) as StatusName[];

/**
 * Lookup the full className for a badge variant (component channel).
 * Falls back to the `default` variant for unknown input.
 */
export function badgeClassFor(variant: string): string {
  return `${BADGE_BASE} ${BADGE_VARIANTS[variant as BadgeVariant] ?? BADGE_VARIANTS.default}`;
}

/**
 * Lookup the full className for a status name (text channel).
 * Falls back to the `default` variant for unknown input.
 */
export function statusBadgeClass(status: string): string {
  const variant = STATUS_BADGES[status as StatusName] ?? 'default';
  return `${BADGE_BASE} ${BADGE_VARIANTS[variant]}`;
}

/**
 * Regex matching [STATUS] markers in MDX text.
 * Built from STATUSES so it tracks STATUS_BADGES automatically.
 */
export function buildStatusRegex(): RegExp {
  return new RegExp(`\\[(${STATUSES.join('|')})\\]`, 'g');
}
