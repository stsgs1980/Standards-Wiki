import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import { revalidatePath } from 'next/cache';
import { bumpVersion } from '@/lib/version';
import { getContentDir, isDocFile, stripDocExtension } from '@/lib/content';

const CONTENT_DIR = getContentDir();

function buildMdxFile(data: {
  title: string;
  order: number;
  slug: string;
  content: string;
}): string {
  return `---
title: "${data.title.replace(/"/g, '\\"')}"
order: ${data.order}
slug: "${data.slug}"
---

${data.content}`;
}

function getSectionDirs(): string[] {
  return fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * GET /api/docs — list all docs with metadata
 */
export async function GET() {
  const dirs = getSectionDirs();
  const docs: Record<string, unknown>[] = [];

  for (const dir of dirs) {
    const dirPath = path.join(CONTENT_DIR, dir);
    const files = fs.readdirSync(dirPath).filter(isDocFile);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);
      docs.push({
        slug: stripDocExtension(file),
        title: data.title || file,
        section: dir,
        order: data.order ?? 0,
      });
    }
  }

  return NextResponse.json({ docs });
}

/**
 * POST /api/docs — create a new doc page
 * Section is used to determine which folder to write into.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title || !body.content || !body.slug) {
    return NextResponse.json(
      { error: 'Title, slug, and content are required' },
      { status: 400 }
    );
  }

  const section = body.section || 'Uncategorized';

  // Sanitize slug
  const slug = body.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const sectionDir = path.join(CONTENT_DIR, section);
  if (!fs.existsSync(sectionDir)) {
    fs.mkdirSync(sectionDir, { recursive: true });
  }

  const filePath = path.join(sectionDir, `${slug}.mdx`);

  if (fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `Page "${slug}" already exists` },
      { status: 409 }
    );
  }

  const mdxContent = buildMdxFile({
    title: body.title,
    order: body.order ?? 0,
    slug,
    content: body.content,
  });

  fs.writeFileSync(filePath, mdxContent, 'utf-8');

  // Bump version
  const ver = bumpVersion();

  // Git commit
  const commitMsg = body.commitMessage || `docs: create ${slug} (v${ver.version})`;
  try {
    execSync(`git add "${filePath}"`, { cwd: process.cwd(), stdio: 'pipe' });
    execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    try {
      execSync('git push', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
    } catch {}
  } catch {}

  // Revalidate
  revalidatePath('/docs');

  return NextResponse.json({ success: true, slug }, { status: 201 });
}
