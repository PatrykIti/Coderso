import type { ContentListTemplateProps } from "../site/renderPublicEntry";

export default function ContentListTemplate({
  title,
  items,
}: ContentListTemplateProps) {
  return (
    <main
      data-template="content-list"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12"
    >
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-[var(--color-text)]/70">Latest entries</p>
      </header>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className="text-lg font-medium text-[var(--color-primary)] hover:underline"
              href={item.href}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
