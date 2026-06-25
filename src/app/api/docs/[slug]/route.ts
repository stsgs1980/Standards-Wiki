import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import { revalidatePath } from 'next/cache';
import { bumpVersion } from '@/lib/version';
import { getContentDir, SUPPORTED_EXTENSIONS } from '@/lib/content';

const CONTENT_DIR = getContentDir();

interface DocBody {
  title: string;
  section: string;
  order: number;
  slug: string;
  content: string;
  commitMessage?: string;
}

function getSectionDirs(): string[] {
  return fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

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

function buildMdxFile(data: Omit<DocBody, 'commitMessage'>): string {
  const sectionLine = data.section ? `\nsection: "${data.section.replace(/"/g, '\\"')}"` : '';
  return `---
title: "${data.title.replace(/"/g, '\\"')}"${sectionLine}
order: ${data.order}
slug: "${data.slug}"
---

${data.content}`;
}

function gitCommit(filePath: string, message: string): void {
  try {
    execSync(`git add "${filePath}"`, { cwd: process.cwd(), stdio: 'pipe' });
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    try {
      execSync('git push', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
    } catch {}
  } catch {}
}

/**
 * GET /api/docs/[slug] — read a doc page
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const filePath = findFileBySlug(slug);

  if (!filePath) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return NextResponse.json({
    meta: { ...data, section: path.basename(path.dirname(filePath)) },
    content,
  });
}

/**
 * PUT /api/docs/[slug] — update an existing doc page
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body: DocBody = await request.json();

  if (!body.title || !body.content) {
    return NextResponse.json(
      { error: 'Title and content are required' },
      { status: 400 }
    );
  }

  const filePath = findFileBySlug(slug);

  if (!filePath) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // If section changed, move file to new folder
  const currentSection = path.basename(path.dirname(filePath));
  const newSection = body.section || currentSection;
  let targetPath = filePath;

  if (newSection !== currentSection) {
    const newDir = path.join(CONTENT_DIR, newSection);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    targetPath = path.join(newDir, `${slug}.mdx`);
    fs.renameSync(filePath, targetPath);
  }

  const mdxContent = buildMdxFile(body);
  fs.writeFileSync(targetPath, mdxContent, 'utf-8');

  const ver = bumpVersion();
  const commitMsg = body.commitMessage || `docs: update ${slug} (v${ver.version})`;
  gitCommit(targetPath, commitMsg);

  revalidatePath(`/docs/${slug}`);
  revalidatePath('/docs');

  return NextResponse.json({ success: true, slug });
}

/**
 * DELETE /api/docs/[slug] — delete a doc page
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const filePath = findFileBySlug(slug);

  if (!filePath) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  fs.unlinkSync(filePath);

  // Remove parent section folder if empty
  const parentDir = path.dirname(filePath);
  try {
    const remaining = fs.readdirSync(parentDir);
    if (remaining.length === 0) {
      fs.rmdirSync(parentDir);
    }
  } catch {}

  const ver = bumpVersion();
  try {
    execSync(`git add "${filePath}"`, { cwd: process.cwd(), stdio: 'pipe' });
    execSync(`git commit -m "docs: delete ${slug} (v${ver.version})"`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    try {
      execSync('git push', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 });
    } catch {}
  } catch {}

  revalidatePath('/docs');

  return NextResponse.json({ success: true });
}
