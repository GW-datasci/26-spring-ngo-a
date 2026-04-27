import { useMemo } from 'react'
import { CAUCUS_FLAGS } from '../hooks/useMembers'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

// Stat helpers
function median(arr) {
  if (!arr.length) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}
function mean(arr) {
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

const HIGHLIGHT_NOTE = {
  is_squad: 'Squad members average ~7pp more than peers — even after controlling for virality.',
}

// Visual range for the strip plot — matches scatter plot
const X_MIN = 0
const X_MAX = 80

export default function CaucusComparison({ members }) {
  const baseline = useMemo(() => {
    const vals = members
      .map(m => m.pct_small_donors)
      .filter(v => v != null && Number.isFinite(v))
    return { mean: mean(vals), median: median(vals), n: vals.length }
  }, [members])

  const rows = useMemo(() => {
    const data = []
    for (const { key, label } of CAUCUS_FLAGS) {
      const subset = members.filter(m => m[key] && m.pct_small_donors != null)
      if (subset.length === 0) continue
      const vals = subset.map(m => m.pct_small_donors)
      data.push({
        key, label,
        n: subset.length,
        mean: mean(vals),
        median: median(vals),
        members: subset,
        delta: mean(vals) - baseline.mean,
      })
    }
    return data.sort((a, b) => b.mean - a.mean)
  }, [members, baseline])

  return (
    <div className="card">
      {/* Baseline */}
      <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-border">
        <div>
          <div className="label">House baseline</div>
          <div className="mono text-lg text-ink mt-0.5">
            {fmt(baseline.mean, 1)}% <span className="text-ink-faint text-xs">avg small-donor share</span>
          </div>
        </div>
        <div className="text-right">
          <div className="label">Median</div>
          <div className="mono text-sm text-ink-muted mt-0.5">{fmt(baseline.median, 1)}%</div>
        </div>
      </div>

      {/* Per-caucus rows */}
      <div className="flex flex-col gap-4">
        {rows.map(r => {
          const deltaPos = r.delta >= 0
          const noteHighlight = HIGHLIGHT_NOTE[r.key]
          return (
            <div key={r.key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] text-ink font-medium">{r.label}</span>
                  <span className="text-[11px] mono text-ink-faint">n = {r.n}</span>
                </div>
                <div className="flex items-baseline gap-3 mono text-[12px]">
                  <span className="text-ink">{fmt(r.mean, 1)}%</span>
                  <span style={{ color: deltaPos ? 'var(--pos)' : 'var(--neg)' }}>
                    {deltaPos ? '+' : ''}{fmt(r.delta, 1)} pp
                  </span>
                </div>
              </div>

              {/* Strip plot: each member as a tick on the line */}
              <div className="relative h-7 flex items-center">
                {/* baseline reference */}
                <div
                  className="absolute top-1/2 h-px bg-border"
                  style={{ left: 0, right: 0 }}
                />
                {/* baseline marker */}
                <div
                  className="absolute h-3 w-px bg-ink-faint -translate-x-1/2 top-1/2 -translate-y-1/2"
                  style={{ left: `${(baseline.mean / X_MAX) * 100}%` }}
                  title={`House baseline: ${fmt(baseline.mean, 1)}%`}
                />
                {/* mean marker (caucus) */}
                <div
                  className="absolute h-4 w-0.5 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${(r.mean / X_MAX) * 100}%`,
                    background: deltaPos ? 'var(--gold)' : 'var(--neg)',
                  }}
                  title={`Caucus mean: ${fmt(r.mean, 1)}%`}
                />
                {/* individual member ticks */}
                {r.members.map(m => (
                  <div
                    key={m.handle_lower}
                    className="absolute h-2 w-0.5 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-ink-muted opacity-60"
                    style={{ left: `${(m.pct_small_donors / X_MAX) * 100}%` }}
                    title={`${m.official_full}: ${fmt(m.pct_small_donors, 1)}%`}
                  />
                ))}
              </div>

              {noteHighlight && (
                <div
                  className="text-[11px] mt-1.5 px-2 py-1 rounded"
                  style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
                >
                  {noteHighlight}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Axis label */}
      <div className="relative mt-3 pt-2 border-t border-border">
        <div className="flex justify-between text-[10px] mono text-ink-faint">
          <span>0%</span>
          <span>20%</span>
          <span>40%</span>
          <span>60%</span>
          <span>80%</span>
        </div>
        <div className="text-[11px] text-ink-faint mt-1 text-center">Small-donor funding share</div>
      </div>
    </div>
  )
}
