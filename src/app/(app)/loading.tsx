export default function Loading() {
  return (
    <div className="page">
      <div className="mb-6 h-8 w-44 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-20 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
