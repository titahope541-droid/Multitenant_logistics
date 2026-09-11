import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders project documentation markdown (/docs/*.md) with the platform's
 * editorial styling. Server component — markdown is read from disk by the
 * docs routes, never shipped raw to the client.
 */

const components: Components = {
  /* The in-app page header owns the title; the doc's own H1 is redundant. */
  h1: () => null,
  h2: ({ children }) => (
    <h2 className="mt-12 border-t border-line pt-8 text-2xl font-bold tracking-tight text-paper">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-9 text-lg font-semibold text-paper">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-7 text-base font-semibold tracking-wide text-paper">{children}</h4>
  ),
  p: ({ children }) => <p className="mt-4 text-[15px] leading-7 text-fog">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-signal underline decoration-line-strong underline-offset-4 transition-colors hover:text-signal-hot hover:decoration-signal"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-paper">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-fog marker:text-dim">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-fog marker:text-dim">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-signal bg-panel px-5 py-1 [&>p]:text-paper/85">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => (
    <code
      className={`${className ?? ""} border border-line bg-panel px-1.5 py-0.5 font-mono text-[0.82em] text-paper/90`}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto border border-line bg-panel p-4 font-mono text-[12.5px] leading-6 text-paper/85 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[inherit]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto border border-line">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line bg-panel px-3 py-2.5 text-left font-mono text-[10px] font-medium tracking-[0.18em] whitespace-nowrap text-dim uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-3 py-2.5 align-top text-[13.5px] leading-6 text-fog">
      {children}
    </td>
  ),
  hr: () => <hr className="my-10 border-line" />,
};

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
