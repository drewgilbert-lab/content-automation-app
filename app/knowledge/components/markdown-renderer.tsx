"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-medium text-white mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-300 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 space-y-1 text-gray-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 space-y-1 text-gray-300">{children}</ol>
  ),
  li: ({ children }) => <li className="text-gray-300">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-400 hover:text-blue-300 underline">
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-700 pl-4 italic text-gray-400">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <table className="w-full border-collapse">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-gray-700 px-3 py-2 text-left text-white bg-gray-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-700 px-3 py-2 text-gray-300">
      {children}
    </td>
  ),
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-gray-300 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
