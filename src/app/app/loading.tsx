export default function AppLoading() {
  return (
    <div className="space-y-4 p-1">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted-bg" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted-bg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-border bg-muted-bg/60"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-muted-bg/40" />
    </div>
  );
}
