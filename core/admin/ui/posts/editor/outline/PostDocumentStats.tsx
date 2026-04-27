import type { PostDocumentStats as PostDocumentStatsValue } from "../../../../../services/posts/editor/postDocumentStats";

type PostDocumentStatsProps = {
  stats: PostDocumentStatsValue;
};

export function PostDocumentStats({ stats }: PostDocumentStatsProps) {
  const metrics: Array<{ label: string; value: number | string }> = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.characters },
    { label: "Read time", value: `${stats.readingTimeMinutes} min` },
    { label: "Headings", value: stats.headings },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Blocks", value: stats.blocks },
  ];

  return (
    <section
      className="border-b px-4 py-3"
      aria-label="Document statistics"
      data-post-editor-overview="stats"
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Document stats
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border bg-muted/20 px-2 py-1.5"
          >
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </dt>
            <dd className="text-sm font-semibold text-foreground">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
