'use client';

import React from 'react';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  frontmatterPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  ListsToggle,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  InsertFrontmatter,
  DiffSourceToggleWrapper,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';

export const CODE_BLOCK_LANGUAGES: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript (React)',
  jsx: 'JavaScript (React)',
  python: 'Python',
  css: 'CSS',
  html: 'HTML',
  bash: 'Bash',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'Markdown',
  sql: 'SQL',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  mermaid: 'Mermaid',
};

export function EditorToolbar({
  withFrontmatter,
}: {
  withFrontmatter?: boolean;
}) {
  return (
    <DiffSourceToggleWrapper>
      <UndoRedo />
      <Separator />
      <BoldItalicUnderlineToggles />
      <StrikeThroughSupSubToggles />
      <Separator />
      <BlockTypeSelect />
      <ListsToggle />
      <Separator />
      <CreateLink />
      <InsertTable />
      <InsertThematicBreak />
      <InsertCodeBlock />
      {withFrontmatter && <InsertFrontmatter />}
      <Separator />
    </DiffSourceToggleWrapper>
  );
}

export function getEditorPlugins(options?: {
  markdown: string;
  withFrontmatter?: boolean;
  defaultViewMode?: 'rich-text' | 'source';
}): any[] {
  return [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin(),
    codeMirrorPlugin({
      codeBlockLanguages: CODE_BLOCK_LANGUAGES,
    }),
    ...(options?.withFrontmatter ? [frontmatterPlugin()] : []),
    diffSourcePlugin({
      viewMode: options?.defaultViewMode || 'rich-text',
      diffMarkdown: options?.markdown || '',
    }),
    toolbarPlugin({
      toolbarContents: () => (
        <EditorToolbar withFrontmatter={options?.withFrontmatter} />
      ),
    }),
  ];
}