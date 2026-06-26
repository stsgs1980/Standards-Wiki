import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Per-folder order manifest.
 *
 * A folder may contain an `INDEX.md` whose YAML frontmatter declares the
 * display order of the documents inside that folder:
 *
 *   ---
 *   title: Стандарты
 *   order:
 *     - meta-001-standard-id-system
 *     - arch-001-architecture-and-repo-layout
 *   ---
 *
 * This module reads that manifest. It is fully optional: a folder without an
 * INDEX.md (or an INDEX.md without an `order` array) returns null, and the
 * caller falls back to alphabetical sorting. Nothing about the document files
 * themselves is required to change.
 *
 * `INDEX.md` is a folder's manifest, not a navigable page, so consumers should
 * exclude it from the navigation item list (see `isIndexDoc`).
 */

export const INDEX_FILENAMES = ['INDEX.md', 'INDEX.mdx'];

export function isIndexDoc(slug: string): boolean {
  return slug.toLowerCase() === 'index';
}

/**
 * Read the order manifest for a folder.
 *
 * @param dirPath  absolute path to a content folder (e.g. .../DOCS/Стандарты)
 * @returns array of slugs in declared order, or null when no manifest exists
 *          (missing INDEX.md, or INDEX.md without a valid `order` array).
 */
export function readFolderOrder(dirPath: string): string[] | null {
  for (const name of INDEX_FILENAMES) {
    const indexPath = path.join(dirPath, name);
    if (!fs.existsSync(indexPath)) continue;

    try {
      const raw = fs.readFileSync(indexPath, 'utf-8');
      const { data } = matter(raw);
      const order = data?.order;
      if (Array.isArray(order) && order.every((s) => typeof s === 'string')) {
        return order.map((s) => s.trim()).filter((s) => s.length > 0);
      }
      return null; // INDEX.md exists but has no usable order array
    } catch {
      return null; // unreadable / unparseable — fall back to alphabetical
    }
  }
  return null;
}

/**
 * Sort a list of document slugs by a folder manifest.
 *
 * Behaviour:
 *   - Slugs listed in `order` come first, in the declared sequence.
 *   - Slugs NOT listed are appended afterwards, sorted alphabetically, so no
 *     document is ever silently dropped from navigation.
 *   - `INDEX` itself is excluded (it is the manifest, not a page).
 *   - When `order` is null, returns the alphabetical list of all slugs
 *     (minus INDEX) — the zero-config fallback.
 *
 * Matching is case-insensitive: an `order` entry written as `meta-001` matches
 * a file named `META-001.md`. Authors should not have to mirror the exact
 * on-disk casing of filenames when writing an INDEX.
 */
export function applyFolderOrder(
  slugs: string[],
  order: string[] | null
): string[] {
  const nonIndex = slugs.filter((s) => !isIndexDoc(s));

  if (!order || order.length === 0) {
    return [...nonIndex].sort();
  }

  // Case-insensitive rank lookup, preserving the original on-disk slug.
  const lower = nonIndex.map((s) => [s, s.toLowerCase()] as const);
  const rank = new Map<string, number>();
  order.forEach((slug, i) => rank.set(slug.trim().toLowerCase(), i));

  const listed = lower.filter(([, lc]) => rank.has(lc)).map(([s]) => s);
  const unlisted = lower.filter(([, lc]) => !rank.has(lc)).map(([s]) => s);

  listed.sort((a, b) => (rank.get(a.toLowerCase())! - rank.get(b.toLowerCase())!));
  unlisted.sort();

  return [...listed, ...unlisted];
}
