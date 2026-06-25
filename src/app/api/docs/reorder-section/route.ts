import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';
import { revalidatePath } from 'next/cache';
import { getContentDir } from '@/lib/content';

const CONTENT_DIR = getContentDir();

function getSectionDirs(): string[] {
  return fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function gitCommitAll(message: string): void {
  try {
    execSync(`git add -A "${CONTENT_DIR}/"`, { cwd: process.cwd(), stdio: 'pipe' });
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
 * PUT /api/docs/reorder-section
 *
 * Body (flat format): { sections: { "SectionName": number } }
 *   Writes `sectionOrder` value into every file in each section.
 *
 * Body (per-slug format): { sections: { "SectionName": { "slug": number } } }
 *   Writes per-file `order` values.
 */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { sections } = body as { sections: Record<string, unknown> };

  if (!sections || typeof sections !== 'object') {
    return NextResponse.json(
      { error: 'sections object is required' },
      { status: 400 }
    );
  }

  const updatedSections = new Set<string>();
  const dirs = getSectionDirs();

  for (const dir of dirs) {
    if (!(dir in sections)) continue;
    const dirPath = path.join(CONTENT_DIR, dir);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.mdx'));

    const value = sections[dir];

    // Detect format: if value is a number → flat format (sectionOrder)
    // If value is an object → per-slug format (order per file)
    const isFlat = typeof value === 'number';

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);

      if (isFlat) {
        data.sectionOrder = value;
      } else {
        const slug = file.replace(/\.mdx$/, '');
        const slugOrders = value as Record<string, number>;
        if (slug in slugOrders) {
          data.order = slugOrders[slug];
        } else {
          continue;
        }
      }

      const newFrontmatter = Object.entries(data)
        .map(([key, val]) => {
          if (typeof val === 'string') return `${key}: "${(val as string).replace(/"/g, '\\"')}"`;
          if (typeof val === 'number') return `${key}: ${val}`;
          if (typeof val === 'boolean') return `${key}: ${val}`;
          if (val === null || val === undefined) return `${key}: null`;
          return `${key}: ${JSON.stringify(val)}`;
        })
        .join('\n');

      const newContent = `---\n${newFrontmatter}\n---\n\n${content}`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      updatedSections.add(dir);
    }
  }

  if (updatedSections.size > 0) {
    gitCommitAll(`docs: reorder — ${[...updatedSections].join(', ')}`);
  }

  revalidatePath('/docs');

  return NextResponse.json({
    success: true,
    updatedSections: [...updatedSections],
  });
}
