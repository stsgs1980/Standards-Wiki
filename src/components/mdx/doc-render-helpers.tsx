import React from 'react';
import Link from 'next/link';
import { CodeBlock, InlineCode, PlainCodeBlock, MermaidDiagram, Callout, Badge } from '@/components/mdx/mdx-components';

/**
 * Shared render helpers used by both renderers:
 *   - MDXContent  (`.mdx`): MDXRemote receives the component map directly
 *   - MarkdownContent (`.md`): hast→React walker looks up components by tag name
 *
 * Keeping the overrides in one place guarantees the two formats render with
 * identical typography, tables, code blocks, mermaid diagrams, callouts and
 * link validation. Only the parser differs (JSX-enabled vs plain-markdown).
 */

function cleanChildren(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).filter(
    (child) => typeof child !== 'string' || child.trim()
  );
}

export function typographyOverrides() {
  return {
    h1: () => null,
    h2: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 id={id} className="text-[30px] font-medium leading-tight text-foreground mb-4 mt-10 scroll-mt-20" {...props}>{children}</h2>
    ),
    h3: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 id={id} className="text-[20px] font-semibold leading-snug text-foreground mb-3 mt-8 scroll-mt-20" {...props}>{children}</h3>
    ),
    h4: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h4 id={id} className="text-[16px] font-semibold leading-snug text-foreground mb-2 mt-6 scroll-mt-20" {...props}>{children}</h4>
    ),
    p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-4">{children}</p>
    ),
    strong: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <strong className="font-medium text-foreground">{children}</strong>
    ),
    em: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <em className="italic text-foreground/80">{children}</em>
    ),
    ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }: React.HTMLAttributes<HTMLLIElement>) => (
      <li className="text-[16px] leading-relaxed text-muted-foreground">{children}</li>
    ),
    del: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <del className="line-through text-muted-foreground">{children}</del>
    ),
  };
}

export function tableOverrides() {
  return {
    table: ({ children }: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">{cleanChildren(children)}</table>
      </div>
    ),
    thead: ({ children }: React.HTMLAttributes<HTMLTableSectionElement>) => (
      <thead className="bg-muted">{cleanChildren(children)}</thead>
    ),
    tbody: ({ children }: React.HTMLAttributes<HTMLTableSectionElement>) => (
      <tbody>{cleanChildren(children)}</tbody>
    ),
    tr: ({ children }: React.HTMLAttributes<HTMLTableRowElement>) => (
      <tr>{cleanChildren(children)}</tr>
    ),
    th: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
      <th className="px-4 py-3 text-left font-medium text-foreground border-b border-border whitespace-nowrap">{children}</th>
    ),
    td: ({ children }: React.HTMLAttributes<HTMLTableCellElement>) => (
      <td className="px-4 py-3 text-muted-foreground border-b border-border/50">{children}</td>
    ),
  };
}

export function codeOverrides() {
  return {
    code: ({
      className,
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
      const match = /language-([\w+.-]+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');

      if (!match) return <InlineCode>{children}</InlineCode>;
      if (match[1] === 'plain') return <PlainCodeBlock>{codeString}</PlainCodeBlock>;
      if (match[1] === 'mermaid') return <MermaidDiagram code={codeString} />;

      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
    },
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
      if (React.isValidElement(children)) {
        if (children.type === InlineCode) {
          const text = String((children.props as { children: React.ReactNode }).children).replace(/\n$/, '');
          return <PlainCodeBlock>{text}</PlainCodeBlock>;
        }
        return <>{children}</>;
      }
      const text = String(children).replace(/\n$/, '');
      return <PlainCodeBlock>{text}</PlainCodeBlock>;
    },
  };
}

export function linkOverrides(validSlugs: string[]) {
  const linkClass = "text-[oklch(0.45_0.15_250)] hover:underline dark:text-[oklch(0.685_0.169_237.323)]";
  const brokenLinkClass = "text-red-500/70 hover:underline dark:text-red-400/70 line-through decoration-red-400/50";

  return {
    a: ({ children, href }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const isExternal = href?.startsWith('http') || href?.startsWith('//');

      if (isExternal) {
        return (
          <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">{children}</a>
        );
      }

      const rawSlug = (href || '/').replace(/^\/docs\//, '').replace(/\/$/, '');
      const isValid = rawSlug === '' || validSlugs.includes(rawSlug);

      if (!isValid) {
        return (
          <span className={brokenLinkClass} title={`Broken link: /docs/${rawSlug}/ does not exist`}>
            {children}
          </span>
        );
      }

      return <Link href={href || '/'} className={linkClass}>{children}</Link>;
    },
  };
}

export function blockquoteOverride() {
  return {
    blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote className="my-4 pl-4 border-l-2 border-border text-muted-foreground not-italic [&_p]:mb-1 [&_p:last-child]:mb-0 [&_p]:text-[var(--text-base)] [&_p]:leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground [&_em]:italic [&_em]:text-foreground/80 [&_code]:text-[var(--text-sm)] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_a]:text-[oklch(0.45_0.15_250)] [&_a:hover]:underline dark:[&_a]:text-[oklch(0.685_0.169_237.323)]">{children}</blockquote>
    ),
  };
}

export function miscOverrides() {
  return {
    hr: () => <hr className="my-8 border-border" />,
    img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
      <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-4" loading="lazy" {...props} />
    ),
  };
}

/**
 * Full component map for the MDX renderer (next-mdx-remote).
 * The plain-markdown renderer resolves the same overrides by tag name.
 */
export function buildMdxComponents(validSlugs: string[]) {
  return {
    CodeBlock,
    Callout,
    Badge,
    MermaidDiagram,
    ...typographyOverrides(),
    ...tableOverrides(),
    ...codeOverrides(),
    ...linkOverrides(validSlugs),
    ...blockquoteOverride(),
    ...miscOverrides(),
  };
}
