import React from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import ExpandableContent from '@/components/mdx/expandable-content';
import { getAllSlugs } from '@/lib/mdx-utils';
import { rehypeStatusBadges, remarkFencedCodeDefaultLang } from '@/lib/mdx-plugins';
import { buildMdxComponents } from '@/components/mdx/doc-render-helpers';

interface MDXContentProps {
  source: string;
}

/**
 * Server component that renders `.mdx` content through the MDX compiler.
 * JSX components are allowed, so bare `<tag>` is treated as markup.
 * Validates internal links against known slugs at render time.
 *
 * For `.md` content see MarkdownContent — it renders plain markdown where
 * bare `<tag>` is literal text (no JSX), preventing the
 * "Expected a closing tag for `<html>`" compile error.
 */
export default function MDXContent({ source }: MDXContentProps) {
  const validSlugs = getAllSlugs();
  const components = buildMdxComponents(validSlugs);

  return (
    <ExpandableContent>
      <MDXRemote source={source} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm, remarkFencedCodeDefaultLang], rehypePlugins: [rehypeSlug, rehypeStatusBadges] } }} />
    </ExpandableContent>
  );
}
