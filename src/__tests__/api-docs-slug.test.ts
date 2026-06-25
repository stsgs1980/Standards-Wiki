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
import { GET as getDoc, PUT as updateDoc, DELETE as deleteDoc } from '@/app/api/docs/[slug]/route';

function putMdx(slug: string, section: string, frontmatter: Record<string, unknown>, body: string) {
  SECTIONS.add(section);
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${v}`)
    .join('\n');
  memFS.set(norm(`${CONTENT_DIR}/${section}/${slug}.mdx`), `---\n${fm}\n---\n\n${body}`);
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(slug: string) {
  return Promise.resolve({ slug });
}

beforeEach(() => {
  memFS.clear();
  SECTIONS.clear();
  vi.clearAllMocks();
});

describe('GET /api/docs/[slug]', () => {
  it('возвращает метаданные и контент', async () => {
    putMdx('test-page', 'Demo', { title: 'Test Page' }, '# Hello\n\nBody text');

    const res = await getDoc(new Request('http://localhost'), { params: makeParams('test-page') });
    const data = await res.json();

    expect(data.meta.title).toBe('Test Page');
    expect(data.content).toContain('# Hello');
  });

  it('возвращает 404 для несуществующего slug', async () => {
    const res = await getDoc(new Request('http://localhost'), { params: makeParams('nonexistent') });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/docs/[slug]', () => {
  it('обновляет существующий файл', async () => {
    putMdx('editable', 'S', { title: 'Old Title', order: 1, slug: 'editable' }, 'Old body');

    const res = await updateDoc(jsonRequest({
      title: 'New Title',
      section: 'S',
      order: 5,
      slug: 'editable',
      content: '# New Content',
    }), { params: makeParams('editable') });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const raw = memFS.get(norm(`${CONTENT_DIR}/S/editable.mdx`));
    expect(raw).toContain('title: "New Title"');
    expect(raw).toContain('# New Content');
  });

  it('возвращает 400 если нет title', async () => {
    putMdx('ed2', 'S', { title: 'T', slug: 'ed2' }, 'body');

    const res = await updateDoc(jsonRequest({ content: 'C', slug: 'ed2' }), {
      params: makeParams('ed2'),
    });
    expect(res.status).toBe(400);
  });

  it('возвращает 400 если нет content', async () => {
    putMdx('ed3', 'S', { title: 'T', slug: 'ed3' }, 'body');

    const res = await updateDoc(jsonRequest({ title: 'T', slug: 'ed3' }), {
      params: makeParams('ed3'),
    });
    expect(res.status).toBe(400);
  });

  it('возвращает 404 для несуществующего файла', async () => {
    const res = await updateDoc(jsonRequest({
      title: 'X',
      content: 'Y',
      slug: 'nope',
    }), { params: makeParams('nope') });
    expect(res.status).toBe(404);
  });

  it('вызывает revalidatePath для страницы и /docs', async () => {
    putMdx('rv', 'S', { title: 'Rv', slug: 'rv' }, 'body');

    await updateDoc(jsonRequest({
      title: 'Rv',
      section: 'S',
      content: 'updated',
      slug: 'rv',
    }), { params: makeParams('rv') });

    expect(revalidatePath).toHaveBeenCalledWith('/docs/rv');
    expect(revalidatePath).toHaveBeenCalledWith('/docs');
  });
});

describe('DELETE /api/docs/[slug]', () => {
  it('удаляет существующий файл', async () => {
    putMdx('del-me', 'S', { title: 'Delete Me', slug: 'del-me' }, '# Bye');

    const res = await deleteDoc(new Request('http://localhost'), {
      params: makeParams('del-me'),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(memFS.has(norm(`${CONTENT_DIR}/S/del-me.mdx`))).toBe(false);
  });

  it('возвращает 404 для несуществующего файла', async () => {
    const res = await deleteDoc(new Request('http://localhost'), {
      params: makeParams('ghost'),
    });
    expect(res.status).toBe(404);
  });

  it('вызывает revalidatePath("/docs")', async () => {
    putMdx('rv-del', 'S', { title: 'Rv Del', slug: 'rv-del' }, 'body');

    await deleteDoc(new Request('http://localhost'), {
      params: makeParams('rv-del'),
    });

    expect(revalidatePath).toHaveBeenCalledWith('/docs');
  });
});
