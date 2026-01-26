import { MediaCard } from "@/ui/media/MediaCard";

const sampleMedia = [
  { name: "hero-banner_v2.jpg", size: "2.4 MB", type: "image" as const },
  { name: "coding-session.jpg", size: "1.8 MB", type: "image" as const },
  { name: "Q1_Financial_Report.pdf", size: "840 KB", type: "document" as const },
  { name: "abstract-bg-04.png", size: "4.1 MB", type: "image" as const },
  { name: "office_interior_day.jpg", size: "3.2 MB", type: "image" as const },
  { name: "podcast-episode-01.mp3", size: "42 MB", type: "audio" as const },
];

export function MediaGrid() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
      {sampleMedia.map((item, index) => (
        <MediaCard
          key={item.name}
          name={item.name}
          size={item.size}
          type={item.type}
          selected={index === 0}
        />
      ))}
    </div>
  );
}
