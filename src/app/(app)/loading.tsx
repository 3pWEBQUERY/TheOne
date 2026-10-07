export default function Loading() {
  return (
    <div className="page">
      <div className="mb-5 h-10 w-48 animate-pulse rounded-2xl" style={{ background: "var(--glass-bg)" }} />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-24 animate-pulse rounded-[26px]" />
        ))}
      </div>
    </div>
  );
}
