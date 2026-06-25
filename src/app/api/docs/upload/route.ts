import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { revalidatePath } from 'next/cache';
import { getContentDir, stripDocExtension } from '@/lib/content';
import { bumpVersion } from '@/lib/version';

const CONTENT_DIR = getContentDir();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const section = (formData.get('section') as string) || 'Uploaded';
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const sectionDir = path.join(CONTENT_DIR, section);
    if (!fs.existsSync(sectionDir)) {
      fs.mkdirSync(sectionDir, { recursive: true });
    }

    const results: { slug: string; title: string; error?: string }[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const name = stripDocExtension(file.name);
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'untitled';

        // Extract title from first H1 or use filename
        const titleMatch = text.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : name;

        const filePath = path.join(sectionDir, `${slug}.mdx`);
        if (fs.existsSync(filePath)) {
          results.push({ slug, title, error: 'already exists' });
          continue;
        }

        const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
order: 0
slug: "${slug}"
---

${text}`;

        fs.writeFileSync(filePath, mdxContent, 'utf-8');
        results.push({ slug, title });
      } catch (err) {
        results.push({
          slug: file.name,
          title: file.name,
          error: err instanceof Error ? err.message : 'upload failed',
        });
      }
    }

    if (results.some((r) => !r.error)) {
      bumpVersion();
      try {
        execSync(`git add -A "${CONTENT_DIR}/"`, { cwd: process.cwd(), stdio: 'pipe' });
        execSync(`git commit -m "docs: upload ${results.length} file(s)"`, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });
        try { execSync('git push', { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 }); } catch {}
      } catch {}
    }

    revalidatePath('/docs');

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
