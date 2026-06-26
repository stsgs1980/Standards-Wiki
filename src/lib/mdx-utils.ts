import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import { getContentDir, isDocFile, stripDocExtension, SUPPORTED_EXTENSIONS } from '@/lib/content';
import { readFolderOrder, applyFolderOrder, isIndexDoc } from '@/lib/folder-index';
import { resolveTitle } from '@/lib/doc-title';

const CONTENT_DIR = getContentDir();

export interface DocMeta {
  title: string;
  section: string;
  sectionOrder: number;
  order: number;
  slug: string;
}

export interface DocPage {
  meta: DocMeta;
  content: string;
}

export interface NavSection {
  title: string;
  order: number;
  items: { slug: string; title: string; order: number; snippet?: string }[];
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

function getSectionDirs(): string[] {
  return fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * Find a file by slug across all section folders.
 * Returns the full path or null if not found.
 */
function findFileBySlug(slug: string): string | null {
  const dirs = getSectionDirs();
  for (const dir of dirs) {
    for (const ext of SUPPORTED_EXTENSIONS) {
      const filePath = path.join(CONTENT_DIR, dir, `${slug}${ext}`);
      if (fs.existsSync(filePath)) return filePath;
    }
  }
  return null;
}

/**
 * Extension of the source file backing a slug — determines the render path:
 *   '.mdx' → MDX compiler (JSX components allowed, bare `<tag>` is markup)
 *   '.md'  → plain-markdown pipeline (bare `<tag>` is literal text, no JSX)
 * Returns null if no file matches (caller will 404 / throw).
 */
export function getDocExtension(slug: string): '.mdx' | '.md' | null {
  const filePath = findFileBySlug(slug);
  if (!filePath) return null;
  return filePath.endsWith('.mdx') ? '.mdx' : '.md';
}

export function getAllSlugs(): string[] {
  const slugs: string[] = [];
  const dirs = getSectionDirs();
  for (const dir of dirs) {
    const dirPath = path.join(CONTENT_DIR, dir);
    const files = fs.readdirSync(dirPath).filter(isDocFile);
    for (const file of files) {
      slugs.push(stripDocExtension(file));
    }
  }
  return slugs;
}

export function getDocBySlug(slug: string): DocPage {
  const filePath = findFileBySlug(slug);
  if (!filePath) {
    throw new Error(`Doc not found: ${slug}`);
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  // Section is derived from the parent folder name, with frontmatter fallback
  const section = path.basename(path.dirname(filePath));

  return {
    meta: {
      title: resolveTitle(data.title, fileContent, slug),
      section: data.section || section,
      sectionOrder: data.sectionOrder ?? data['section-order'] ?? 0,
      order: data.order ?? 0,
      slug: data.slug || slug,
    },
    content,
  };
}

export function getAllDocs(): DocPage[] {
  const slugs = getAllSlugs();
  return slugs.map((slug) => getDocBySlug(slug));
}

function extractSnippet(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/, '')
    .replace(/#{1,6}\s+.+/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[>\-\*|]\s?/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function getNavigation(): NavSection[] {
  const dirs = getSectionDirs();
  const sections: NavSection[] = [];

  for (const dir of dirs) {
    const dirPath = path.join(CONTENT_DIR, dir);
    const allFiles = fs.readdirSync(dirPath).filter(isDocFile);

    // Resolve the per-folder display order from INDEX.md (optional manifest).
    // Falls back to alphabetical when no INDEX.md / no `order` array.
    const order = readFolderOrder(dirPath);
    const orderedSlugs = applyFolderOrder(
      allFiles.map(stripDocExtension),
      order
    );

    const items: { slug: string; title: string; order: number; snippet?: string }[] = [];

    for (const slug of orderedSlugs) {
      // INDEX.md is the folder manifest, not a navigable page — skip it.
      if (isIndexDoc(slug)) continue;

      const filePath = findFileBySlug(slug) ?? path.join(dirPath, `${slug}.md`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      items.push({
        slug,
        title: resolveTitle(data.title, fileContent, slug),
        order: data.order ?? 0,
        snippet: extractSnippet(content),
      });
    }

    sections.push({
      title: dir,
      order: sections.length,
      items,
    });
  }

  return sections;
}

export function getAllPageIds(): string[] {
  const nav = getNavigation();
  return nav.flatMap((section) => section.items.map((item) => item.slug));
}

export function getSectionForPage(slug: string): string {
  const doc = getDocBySlug(slug);
  return doc.meta.section;
}

export function getAdjacentPages(slug: string): {
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
} {
  const allIds = getAllPageIds();
  const idx = allIds.indexOf(slug);
  return {
    prev: idx > 0 ? { slug: allIds[idx - 1], title: getDocBySlug(allIds[idx - 1]).meta.title } : undefined,
    next: idx < allIds.length - 1 ? { slug: allIds[idx + 1], title: getDocBySlug(allIds[idx + 1]).meta.title } : undefined,
  };
}

export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/`/g, '');
      const id = slugger.slug(text);
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function getPageTitle(slug: string): string {
  const doc = getDocBySlug(slug);
  return doc.meta.title;
}
