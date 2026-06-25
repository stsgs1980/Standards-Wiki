'use client';

import React from 'react';
import { BadgeVariant, badgeClassFor } from '@/lib/statuses';

/**
 * Badge component for labels/tags.
 * Variant colors are sourced from the single source of truth in
 * @/lib/statuses so they stay in sync with the [STATUS] text channel.
 */
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return <span className={badgeClassFor(variant)}>{children}</span>;
}
