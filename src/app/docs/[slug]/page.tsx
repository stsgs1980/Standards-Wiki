import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import React from 'react';
import {
  getDocBySlug,
  getDocExtension,
  getNavigation,
  extractHeadings,
} from '@/lib/mdx-utils';
import {
  loadTabs,
  resolveActiveTab,
  getTabHref,
} from '@/lib/nav-tabs';
import MDXContent from '@/components/mdx/mdx-content';
import MarkdownContent from '@/components/mdx/markdown-content';
import DocsShell from './docs-shell';
import { getVersion } from '@/lib/version';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Fully dynamic — no ISR cache, always reads fresh files from disk.
// This ensures newly created pages are immediately accessible.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const doc = getDocBySlug(slug);
    return {
      title: `${doc.meta.title} — StsDev Wiki`,
      description: `Documentation: ${doc.meta.title} (${doc.meta.section})`,
    };
  } catch {
    return { title: 'StsDev Wiki' };
  }
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  
  let doc;
  try {
    doc = getDocBySlug(slug);
  } catch {
    notFound();
  }

  const navigation = getNavigation();
  const headings = extractHeadings(doc.content);
  const section = doc.meta.section;
  const canEdit = process.env.CAN_EDIT !== 'false';

  // Tabs
  const tabs = loadTabs();
  const activeTab = resolveActiveTab(tabs, section);
  const activeTabId = activeTab.id;
  const tabHrefs: Record<string, string> = {};
  for (const tab of tabs) {
    tabHrefs[tab.id] = getTabHref(tab);
  }

  // Adjacent pages within active tab context
  const contextNav = navigation.filter((s) => s.title === activeTab.id);
  const contextSlugs = contextNav.flatMap((s) => s.items.map((i) => i.slug));
  const contextIdx = contextSlugs.indexOf(slug);
  const adjacent = {
    prev: contextIdx > 0
      ? { slug: contextSlugs[contextIdx - 1], title: getDocBySlug(contextSlugs[contextIdx - 1]).meta.title }
      : undefined,
    next: contextIdx < contextSlugs.length - 1
      ? { slug: contextSlugs[contextIdx + 1], title: getDocBySlug(contextSlugs[contextIdx + 1]).meta.title }
      : undefined,
  };

  // Pre-render content on the server. Render path depends on source format:
  //   .mdx → MDX compiler (JSX allowed, bare `<tag>` is markup)
  //   .md  → plain-markdown pipeline (bare `<tag>` is literal text, no JSX)
  // Splitting prevents the "Expected a closing tag for `<html>`" MDX error on
  // docs that use angle-bracket placeholders (e.g. A11Y, META, ARCH).
  const ext = getDocExtension(slug);
  const renderedContent = ext === '.mdx'
    ? <MDXContent source={doc.content} />
    : <MarkdownContent source={doc.content} />;

  const version = getVersion();

  return (
    <DocsShell
      slug={slug}
      title={doc.meta.title}
      section={section}
      renderedContent={renderedContent}
      navigation={navigation}
      headings={headings}
      adjacent={adjacent}
      canEdit={canEdit}
      version={version.version}
      build={version.build}
      tabs={tabs}
      activeTabId={activeTabId}
      tabHrefs={tabHrefs}
    />
  );
}
