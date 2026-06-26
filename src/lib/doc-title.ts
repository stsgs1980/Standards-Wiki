/**
 * Title resolution for a document — used by navigation, search and page header.
 *
 * Resolution order (first hit wins):
 *   1. `title:` in YAML frontmatter (explicit, opt-in)
 *   2. The first `# Heading` line in the body (works for any markdown)
 *   3. The slug (last-resort fallback, never throws)
 *
 * Frontmatter is optional across the template contract: documents without
 * frontmatter still resolve a readable title from their H1, so a freshly
 * dropped `.md` file appears in the sidebar with a real name, not its slug.
 */

/** Strip YAML frontmatter block, if present, returning the body. */
function stripFrontmatter(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? raw.slice(match[0].length) : raw;
}

/**
 * Extract the first H1 (`# `) heading text from a document body.
 * Returns null if there is no H1. Skips fenced code blocks so a `#` inside
 * a code fence is never mistaken for a heading.
 */
export function extractH1Title(raw: string): string | null {
  const body = stripFrontmatter(raw);
  const lines = body.split(/\r?\n/);

  let inFence = false;
  let fenceMarker = '';

  for (const line of lines) {
    // Detect fenced code block boundaries (``` or ~~~), possibly with a language.
    const fenceStart = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceStart) {
      const marker = fenceStart[2][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;

    // First H1 in the body (not inside a code fence).
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      // Trim inline markdown emphasis but keep readability.
      return h1[1].replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();
    }
  }
  return null;
}

/**
 * Resolve the display title for a document.
 *
 * @param frontmatterTitle  value of `title:` from frontmatter (may be undefined)
 * @param raw               full raw file content (body inspected for H1)
 * @param slug              filename stem, used as last-resort fallback
 */
export function resolveTitle(
  frontmatterTitle: string | undefined,
  raw: string,
  slug: string
): string {
  if (frontmatterTitle) return frontmatterTitle;
  const h1 = extractH1Title(raw);
  if (h1) return h1;
  return slug;
}
