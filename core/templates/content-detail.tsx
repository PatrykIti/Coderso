import type { ContentDetailTemplateProps } from "../site/renderPublicEntry";

const renderEntryData = (data: Record<string, unknown>) => {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text)]/70">
        No structured fields yet.
      </p>
    );
  }

  return (
    <dl className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/60">
            {key}
          </dt>
          <dd className="mt-1 text-sm text-[var(--color-text)]/80">
            {typeof value === "string" ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export default function ContentDetailTemplate({
  entry,
}: ContentDetailTemplateProps) {
  return (
    <main
      data-template="content-detail"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
    >
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{entry.title}</h1>
        <p className="text-sm text-[var(--color-text)]/70">Entry preview</p>
      </header>
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {renderEntryData(entry.data ?? {})}
      </section>
    </main>
  );
}
