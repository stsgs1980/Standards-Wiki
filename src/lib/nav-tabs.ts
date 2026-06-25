import fs from 'fs';
import path from 'path';
import { getContentDir } from '@/lib/content';
import { getNavigation } from '@/lib/mdx-utils';
import type { NavTab } from '@/lib/nav-tabs-types';

export function loadTabs(): NavTab[] {
  const contentDir = getContentDir();
  const folders = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // nav-tabs.json controls tab order. If absent, alphabetical order.
  const configPath = path.join(process.cwd(), 'src', 'data', 'nav-tabs.json');
  const folderSet = new Set(folders);

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const entries = JSON.parse(raw) as { label: string }[];
      const tabs: NavTab[] = [];
      const used = new Set<string>();
      for (const entry of entries) {
        const match = folders.find((f) => f === entry.label && !used.has(f));
        if (match) {
          tabs.push({ id: match, label: entry.label });
          used.add(match);
        }
      }
      // Add any remaining folders not listed in config
      for (const folder of folders) {
        if (!used.has(folder)) {
          tabs.push({ id: folder, label: folder });
        }
      }
      return tabs;
    } catch {
      // fall through to alphabetical
    }
  }

  return folders.sort().map((f) => ({ id: f, label: f }));
}

export function resolveActiveTab(tabs: NavTab[], currentSection: string): NavTab {
  return tabs.find((t) => t.id === currentSection) ?? tabs[0];
}

export function getTabHref(tab: NavTab): string {
  const nav = getNavigation();
  for (const sec of nav) {
    if (sec.title === tab.id && sec.items.length > 0) {
      return `/docs/${sec.items[0].slug}/`;
    }
  }
  const all = nav.flatMap((s) => s.items);
  return all.length > 0 ? `/docs/${all[0].slug}/` : '/docs/';
}
