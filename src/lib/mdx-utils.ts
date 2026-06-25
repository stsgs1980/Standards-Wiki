import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import { getContentDir, isDocFile, stripDocExtension, SUPPORTED_EXTENSIONS } from '@/lib/content';

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
      title: data.title || slug,
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
    const files = fs.readdirSync(dirPath)
      .filter(isDocFile)
      .sort();

    const items: { slug: string; title: string; order: number; snippet?: string }[] = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      const slug = stripDocExtension(file);
      items.push({
        slug: data.slug || slug,
        title: data.title || slug,
        order: data.order ?? 0,
        snippet: extractSnippet(content),
      });
    }

    items.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

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
