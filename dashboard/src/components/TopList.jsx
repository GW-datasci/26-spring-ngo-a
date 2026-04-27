import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PARTY_COLOR, PARTY_LABEL } from '../hooks/useMembers'
import MemberPhoto from './MemberPhoto'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

const METRICS = [
  { key: 'pct_small_donors', label: 'Small Donor %',  fmt: v => `${fmt(v, 1)}%` },
  { key: 'avg_retweets_raw', label: 'Avg Retweets',   fmt: v => fmt(v, 0) },
  { key: 'outrage_index',    label: 'Outrage Index',  fmt: v => fmt(v, 2) },
  { key: 'avg_anger',        label: 'Avg Anger',      fmt: v => fmt(v, 3) },
]

export default function TopList({ members, defaultMetric = 'pct_small_donors', n = 10 }) {
  const navigate = useNavigate()
  const [metricKey, setMetricKey] = useState(defaultMetric)
  const metric = METRICS.find(m => m.key === metricKey) ?? METRICS[0]

  const top = [...members]
    .filter(m => m[metricKey] != null)
    .sort((a, b) => b[metricKey] - a[metricKey])
    .slice(0, n)

  const max = top[0]?.[metricKey] ?? 1

  return (
    <div className="card">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetricKey(m.key)}
            className={`chip ${metricKey === m.key ? 'active' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {top.map((m, i) => {
          const v = m[metricKey] ?? 0
          const pct = max > 0 ? (v / max) * 100 : 0
          const color = PARTY_COLOR[m.party_code] ?? '#888'

          return (
            <div
              key={m.handle_lower}
              onClick={() => navigate(`/member/${m.handle_lower}`)}
              className="flex items-center gap-3 cursor-pointer rounded px-2 py-1.5 -mx-2 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="mono text-[11px] text-ink-faint w-5 text-right shrink-0">
                {i + 1}
              </span>

              <MemberPhoto bioguide={m.bioguide} name={m.official_full} size={28} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[13px] text-ink truncate">
                    {m.official_full}
                  </span>
                  <span className="mono text-[12px] shrink-0" style={{ color }}>
                    {metric.fmt(v)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-border rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${pct}%`, background: color, opacity: 0.8 }}
                    />
                  </div>
                  <span className="text-[10px] mono text-ink-faint shrink-0 w-14 text-right">
                    {m.state_abbrev} · {m.party_code ?? '?'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
