"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 text-[15px] leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-white/80">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 break-all hover:text-primary/80"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1.5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1.5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-3 mt-5 text-xl font-bold text-white first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-lg font-bold text-white first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-primary/60 pl-4 text-white/70">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-white/90">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-[13px]">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          table: ({ children }) => (
            <div className="mb-3 w-full overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.07]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 px-3 py-2.5 font-semibold text-white whitespace-nowrap">
              {children}
            </th>
          ),
          tr: ({ children }) => <tr className="border-b border-white/5 last:border-0">{children}</tr>,
          td: ({ children }) => (
            <td className="px-3 py-2.5 align-top text-white/80">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
