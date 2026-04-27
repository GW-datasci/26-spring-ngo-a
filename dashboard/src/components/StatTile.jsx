export default function StatTile({ label, value, sub, highlight = false }) {
  const wrapStyle = {
    borderColor: highlight ? 'rgba(240,180,41,0.3)' : 'var(--border)',
    background: highlight ? 'rgba(240,180,41,0.04)' : 'var(--surface)',
  }

  return (
    <div
      className="rounded-xl p-4 border transition-colors"
      style={wrapStyle}
    >
      <div className="label mb-1.5">{label}</div>
      <div
        className="text-2xl mono leading-none"
        style={{ color: highlight ? 'var(--gold)' : 'var(--ink)', fontWeight: 500 }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-muted mt-1.5">{sub}</div>}
    </div>
  )
}
