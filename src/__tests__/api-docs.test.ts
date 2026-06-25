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
        // Top-level: return section folders
        const names = [...SECTIONS].sort();
        if (opts?.withFileTypes) {
          return names.map((n) => ({ name: n, isDirectory: () => true, isFile: () => false }));
        }
        return names;
      }
      // Inside a section: return .mdx files
      const prefix = ndir.endsWith('/') ? ndir : ndir + '/';
      return [...memFS.keys()]
        .filter((k) => norm(k).startsWith(prefix) && norm(k).endsWith('.mdx'))
        .map((k) => norm(k).slice(prefix.length));
    },
    mkdirSync: (dir: string) => { SECTIONS.add(path.basename(dir)); },
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
import { GET, POST } from '@/app/api/docs/route';

function putMdx(slug: string, section: string, frontmatter: Record<string, unknown>, body: string) {
  SECTIONS.add(section);
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => typeof v === 'string' ? `${k}: "${v}"` : `${k}: ${v}`)
    .join('\n');
  const dir = `${CONTENT_DIR}/${section}`;
  memFS.set(norm(`${dir}/${slug}.mdx`), `---\n${fm}\n---\n\n${body}`);
}

function jsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  memFS.clear();
  SECTIONS.clear();
  vi.clearAllMocks();
});

describe('GET /api/docs', () => {
  it('возвращает пустой список при отсутствии файлов', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.docs).toEqual([]);
  });

  it('возвращает метаданные всех .mdx файлов', async () => {
    putMdx('intro', 'Getting Started', { title: 'Intro', order: 1 }, '# Intro');
    putMdx('api-ref', 'Advanced', { title: 'API Reference', order: 2 }, '# API');

    const res = await GET();
    const data = await res.json();

    expect(data.docs).toHaveLength(2);
    expect(data.docs[0]).toMatchObject({ slug: 'api-ref', title: 'API Reference', section: 'Advanced' });
    expect(data.docs[1]).toMatchObject({ slug: 'intro', title: 'Intro', section: 'Getting Started' });
  });

  it('использует имя файла как title если нет frontmatter', async () => {
    SECTIONS.add('Uncategorized');
    memFS.set(norm(`${CONTENT_DIR}/Uncategorized/no-fm.mdx`), '# No Frontmatter');

    const res = await GET();
    const data = await res.json();
    expect(data.docs[0].title).toBe('no-fm.mdx');
    expect(data.docs[0].section).toBe('Uncategorized');
  });
});

describe('POST /api/docs', () => {
  it('создаёт новый .mdx файл с корректным frontmatter', async () => {
    const res = await POST(jsonRequest({
      title: 'New Page',
      slug: 'new-page',
      content: '# Hello World\n\nSome content',
      section: 'Testing',
      order: 5,
    }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.slug).toBe('new-page');

    const raw = memFS.get(norm(`${CONTENT_DIR}/Testing/new-page.mdx`));
    expect(raw).toContain('title: "New Page"');
    expect(raw).toContain('order: 5');
    expect(raw).toContain('slug: "new-page"');
    expect(raw).toContain('# Hello World');
  });

  it('возвращает 400 если нет title', async () => {
    const res = await POST(jsonRequest({ slug: 'x', content: 'y' }));
    expect(res.status).toBe(400);
  });

  it('возвращает 400 если нет content', async () => {
    const res = await POST(jsonRequest({ title: 'T', slug: 'x' }));
    expect(res.status).toBe(400);
  });

  it('возвращает 400 если нет slug', async () => {
    const res = await POST(jsonRequest({ title: 'T', content: 'C' }));
    expect(res.status).toBe(400);
  });

  it('возвращает 409 при дублировании slug', async () => {
    putMdx('dup', 'Uncategorized', { title: 'Dup', slug: 'dup' }, '# Dup');

    const res = await POST(jsonRequest({
      title: 'Another',
      slug: 'dup',
      content: 'content',
    }));
    expect(res.status).toBe(409);
  });

  it('санитизирует slug', async () => {
    const res = await POST(jsonRequest({
      title: 'Test',
      slug: 'My New---Page!!',
      content: 'C',
    }));
    const data = await res.json();
    expect(data.slug).toBe('my-new-page');
  });

  it('использует "Uncategorized" как секцию по умолчанию', async () => {
    const res = await POST(jsonRequest({
      title: 'Test',
      slug: 'no-section',
      content: 'C',
    }));
    expect(res.status).toBe(201);

    const raw = memFS.get(norm(`${CONTENT_DIR}/Uncategorized/no-section.mdx`));
    expect(raw).toContain('slug: "no-section"');
  });

  it('вызывает revalidatePath("/docs")', async () => {
    await POST(jsonRequest({
      title: 'Test',
      slug: 'reval',
      content: 'C',
    }));
    expect(revalidatePath).toHaveBeenCalledWith('/docs');
  });

  it('экранирует кавычки в title', async () => {
    const res = await POST(jsonRequest({
      title: 'He said "hello"',
      slug: 'quotes',
      content: 'C',
      section: 'Testing',
    }));
    expect(res.status).toBe(201);

    const raw = memFS.get(norm(`${CONTENT_DIR}/Testing/quotes.mdx`));
    expect(raw).toContain('title: "He said \\"hello\\""');
  });
});
