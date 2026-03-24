"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-display text-text-primary mt-8 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-heading text-text-primary mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-subheading text-text-primary mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-text-secondary leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-1 text-text-secondary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-1 text-text-secondary">{children}</ol>
  ),
  li: ({ children }) => <li className="text-text-secondary">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} className="text-hg-blue-bright hover:text-hg-blue-muted underline">
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="text-text-primary font-semibold">{children}</strong>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="bg-surface-input text-text-primary px-1.5 py-0.5 rounded text-body-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-input rounded-lg p-4 overflow-x-auto">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border-default pl-4 italic text-text-secondary">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <table className="w-full border-collapse">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-border-default px-3 py-2 text-left text-text-primary bg-surface-input">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border-default px-3 py-2 text-text-secondary">
      {children}
    </td>
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-text-secondary leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
