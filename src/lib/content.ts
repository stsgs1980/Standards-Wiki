import path from 'path';

export const SUPPORTED_EXTENSIONS = ['.mdx', '.md'];

export function getContentDir(): string {
  const envDir = process.env.DOCS_DIR;
  if (envDir) return path.resolve(envDir);
  return path.join(process.cwd(), 'DOCS');
}

export function isDocFile(filename: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

export function stripDocExtension(filename: string): string {
  for (const ext of SUPPORTED_EXTENSIONS) {
    if (filename.endsWith(ext)) return filename.slice(0, -ext.length);
  }
  return filename;
}
