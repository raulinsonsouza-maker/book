import type { FunnelBlock } from "@/types/funnel-config";

export function FunnelLandingBlocks({ blocks }: { blocks: FunnelBlock[] }) {
  if (!blocks.length) return null;

  return (
    <div className="space-y-3 border-b border-border pb-4">
      {blocks.map((block) => {
        switch (block.type) {
          case "text":
            return (
              <p
                key={block.id}
                className={`text-sm leading-relaxed text-muted ${
                  block.align === "center" ? "text-center" : ""
                }`}
              >
                {block.content}
              </p>
            );
          case "image":
            return block.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={block.id}
                src={block.url}
                alt={block.alt || ""}
                className="max-h-32 w-full rounded-lg object-cover"
              />
            ) : null;
          case "divider":
            return <hr key={block.id} className="border-border" />;
          case "testimonial":
            return (
              <blockquote
                key={block.id}
                className="rounded-lg border border-border bg-white p-3 text-xs italic text-muted"
              >
                &ldquo;{block.quote}&rdquo;
                {block.author && (
                  <footer className="mt-1 not-italic font-medium text-foreground">
                    — {block.author}
                  </footer>
                )}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
