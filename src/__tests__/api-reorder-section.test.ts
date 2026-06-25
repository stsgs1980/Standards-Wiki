import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('child_process', () => ({ default: { execSync: vi.fn() }, execSync: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const memFS = new Map<string, string>();
const norm = (p: string) => p.replace(/\\/g, '/');

vi.mock('@/lib/content', () => {
  const SUPPORTED_EXTENSIONS = ['.mdx', '.md'];
  return {
    getContentDir: () => require('path').join(process.cwd(), 'DOCS'),
    SUPPORTED_EXTENSIONS,
    isDocFile: (f: string) => SUPPORTED_EXTENSIONS.some((ext: string) => f.endsWith(ext)),
    stripDocExtension: (f: string) => {
      for (const ext of SUPPORTED_EXTENSIONS) {
        if (f.endsWith(ext)) return f.slice(0, -ext.length);
      }
      return f;
    },
  };
});

const CONTENT_DIR = path.join(process.cwd(), 'DOCS');
const SECTIONS = new Set<string>();

vi.mock('fs', () => ({
  default: {
    readdirSync: (dir: string, opts?: { withFileTypes?: boolean }) => {
      const ndir = norm(dir);
      if (ndir === norm(CONTENT_DIR)) {
        const names = [...SECTIONS].sort();
        if (opts?.withFileTypes) return names.map((n) => ({ name: n, isDirectory: () => true, isFile: () => false }));
        return names;
      }
      const prefix = ndir.endsWith('/') ? ndir : ndir + '/';
      return [...memFS.keys()]
        .filter((k) => norm(k).startsWith(prefix) && norm(k).endsWith('.mdx'))
        .map((k) => norm(k).slice(prefix.length));
    },
    readFileSync: (p: string) => {
      const c = memFS.get(norm(p));
      if (c === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return c;
    },
    writeFileSync: (p: string, data: string) => { memFS.set(norm(p), data); },
    existsSync: (p: string) => memFS.has(norm(p)),
    unlinkSync: (p: string) => { memFS.delete(norm(p)); },
  },
  existsSync: (p: string) => memFS.has(norm(p)),
}));

import { revalidatePath } from 'next/cache';
import matter from 'gray-matter';
import { PUT as reorderSections } from '@/app/api/docs/reorder-section/route';

function putMdx(slug: string, section: string, frontmatter: Record<string, unknown>, body: string) {
  SECTIONS.add(section);
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${v}`)
    .join('\n');
  memFS.set(norm(`${CONTENT_DIR}/${section}/${slug}.mdx`), `---\n${fm}\n---\n\n${body}`);
}

function getFrontmatter(slug: string, section: string) {
  const raw = memFS.get(norm(`${CONTENT_DIR}/${section}/${slug}.mdx`));
  return matter(raw!).data;
}

beforeEach(() => {
  memFS.clear();
  SECTIONS.clear();
  vi.clearAllMocks();
});

describe('PUT /api/docs/reorder-section', () => {
  it('обновляет sectionOrder (flat format)', async () => {
    putMdx('a1', 'Alpha', { title: 'A1', order: 1, slug: 'a1' }, 'body');
    putMdx('a2', 'Alpha', { title: 'A2', order: 2, slug: 'a2' }, 'body');

    const res = await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { Alpha: 500 } }),
    }));

    expect(res.status).toBe(200);
    expect(getFrontmatter('a1', 'Alpha').sectionOrder).toBe(500);
    expect(getFrontmatter('a2', 'Alpha').sectionOrder).toBe(500);
  });

  it('обновляет order (per-slug format)', async () => {
    putMdx('a1', 'Alpha', { title: 'A1', order: 1, slug: 'a1' }, 'body');
    putMdx('a2', 'Alpha', { title: 'A2', order: 2, slug: 'a2' }, 'body');

    const res = await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { Alpha: { a1: 10, a2: 20 } } }),
    }));

    expect(res.status).toBe(200);
    expect(getFrontmatter('a1', 'Alpha').order).toBe(10);
    expect(getFrontmatter('a2', 'Alpha').order).toBe(20);
  });

  it('возвращает 400 если sections не передан', async () => {
    const res = await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it('не трогает файлы из секций не указанных в sections', async () => {
    putMdx('x', 'Gamma', { title: 'X', order: 999, slug: 'x' }, 'body');

    await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { Alpha: 100 } }),
    }));

    expect(getFrontmatter('x', 'Gamma').order).toBe(999);
  });

  it('вызывает revalidatePath("/docs")', async () => {
    await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { A: 0 } }),
    }));

    expect(revalidatePath).toHaveBeenCalledWith('/docs');
  });

  it('возвращает пустой updatedSections если ни один файл не совпал', async () => {
    const res = await reorderSections(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { NonExistent: 0 } }),
    }));

    const data = await res.json();
    expect(data.updatedSections).toEqual([]);
  });
});
