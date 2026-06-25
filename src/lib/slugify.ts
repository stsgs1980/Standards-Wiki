/**
 * Shared Cyrillic-to-Latin transliteration map and slugify utility.
 * Used by sidebar (section names) and new-page form (title → slug).
 */

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

/** Transliterate and slugify a string (handles Cyrillic). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sа-яА-ЯёЁ-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/[а-яА-ЯёЁ]/g, (c) => CYRILLIC_MAP[c.toLowerCase()] || c)
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Slugify a section name — appends '-index' suffix. */
export function slugifySectionName(name: string): string {
  return slugify(name) + '-index';
}