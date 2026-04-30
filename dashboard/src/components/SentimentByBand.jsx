import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PARTY_COLOR } from '../hooks/useMembers'

const fmt = (v, decimals = 2) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

// X-axis metric options
const METRICS = [
  { key: 'avg_sentiment',    label: 'Avg Sentiment',         decimals: 3 },
  { key: 'outrage_index',    label: 'Outrage Index',         decimals: 3 },
  { key: 'avg_anger',        label: 'Avg Anger',             decimals: 3 },
  { key: 'avg_fear',         label: 'Avg Fear',              decimals: 3 },
  { key: 'avg_joy',          label: 'Avg Joy',               decimals: 3 },
  { key: 'avg_retweets_raw', label: 'Avg Retweets',          decimals: 0 },
]

const BAND_COUNTS = [4, 8, 10]
const BAND_LABEL = { 4: 'Quartiles', 8: 'Eighths', 10: 'Deciles' }

const COLOR_MODES = [
  { key: 'band',  label: 'By small-donor band' },
  { key: 'party', label: 'By party' },
]

// Diverging palette for bands (low → high)
function bandColor(idx, total) {
  // Sequential blue→orange→red palette mirroring matplotlib coolwarm
  const palette10 = [
    '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7',
    '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f',
  ]
  // Resample to `total` bands
  const i = Math.round((idx / Math.max(1, total - 1)) * (palette10.length - 1))
  return palette10[Math.min(i, palette10.length - 1)]
}

// Compute band boundaries from quantiles
function computeBands(values, n) {
  const sorted = [...values].sort((a, b) => a - b)
  const breaks = []
  for (let i = 1; i < n; i++) {
    const q = (i / n) * (sorted.length - 1)
    const lo = Math.floor(q)
    const hi = Math.ceil(q)
    breaks.push(sorted[lo] + (sorted[hi] - sorted[lo]) * (q - lo))
  }
  return breaks
}

function bandIndex(value, breaks) {
  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return i
  }
  return breaks.length
}

export default function SentimentByBand({ members }) {
  const navigate = useNavigate()
  const [metricKey, setMetricKey] = useState('avg_sentiment')
  const [bandCount, setBandCount] = useState(8)
  const [colorMode, setColorMode] = useState('band')

  const metric = METRICS.find(m => m.key === metricKey) ?? METRICS[0]

  // Filter to members with both metrics present, group into bands by small_donor %
  const grouped = useMemo(() => {
    const valid = members.filter(m =>
      m.pct_small_donors != null &&
      m[metricKey] != null &&
      Number.isFinite(m.pct_small_donors) &&
      Number.isFinite(m[metricKey])
    )

    const breaks = computeBands(valid.map(m => m.pct_small_donors), bandCount)

    const bands = Array.from({ length: bandCount }, () => [])
    for (const m of valid) {
      const idx = bandIndex(m.pct_small_donors, breaks)
      bands[idx].push(m)
    }

    // Sort within each band by metric ascending so each row is a sorted stripe
    bands.forEach(band => band.sort((a, b) => a[metricKey] - b[metricKey]))

    // Compute domain for x axis
    const allMetricVals = valid.map(m => m[metricKey])
    const minVal = Math.min(...allMetricVals)
    const maxVal = Math.max(...allMetricVals)
    const padding = (maxVal - minVal) * 0.05

    return {
      bands,
      breaks,
      domain: [minVal - padding, maxVal + padding],
      hasNegative: minVal < 0,
    }
  }, [members, metricKey, bandCount])

  // Convert metric value → x position (%)
  const xPos = (v) => {
    const [lo, hi] = grouped.domain
    return ((v - lo) / (hi - lo)) * 100
  }
  const zeroPos = grouped.hasNegative ? xPos(0) : null

  // Band labels: range of small-donor %
  const bandRanges = useMemo(() => {
    const out = []
    const sortedDonors = members
      .map(m => m.pct_small_donors)
      .filter(v => v != null && Number.isFinite(v))
      .sort((a, b) => a - b)
    const minDonor = sortedDonors[0]
    const maxDonor = sortedDonors[sortedDonors.length - 1]
    for (let i = 0; i < bandCount; i++) {
      const lo = i === 0 ? minDonor : grouped.breaks[i - 1]
      const hi = i === bandCount - 1 ? maxDonor : grouped.breaks[i]
      out.push({ lo, hi })
    }
    return out
  }, [members, grouped, bandCount])

  return (
    <div className="card">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-5 pb-4 border-b border-border">
        <div>
          <div className="label mb-1.5">Metric</div>
          <div className="flex gap-1.5 flex-wrap">
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
        </div>
        <div>
          <div className="label mb-1.5">Bands</div>
          <div className="flex gap-1.5">
            {BAND_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => setBandCount(n)}
                className={`chip ${bandCount === n ? 'active' : ''}`}
              >
                {BAND_LABEL[n]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Color</div>
          <div className="flex gap-1.5">
            {COLOR_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setColorMode(m.key)}
                className={`chip ${colorMode === m.key ? 'active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bands */}
      <div className="flex flex-col gap-3">
        {grouped.bands.map((band, bandIdx) => {
          const range = bandRanges[bandIdx]
          const color = bandColor(bandIdx, bandCount)

          return (
            <div key={bandIdx}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[12px] text-ink font-medium">
                    Band {bandIdx + 1}
                  </span>
                  <span className="text-[11px] mono text-ink-muted">
                    {fmt(range.lo, 1)}–{fmt(range.hi, 1)}% small donors
                  </span>
                </div>
                <span className="text-[11px] mono text-ink-faint">
                  n = {band.length}
                </span>
              </div>

              {/* Strip */}
              <div
                className="relative h-6 rounded"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                {/* Zero line if metric has negatives */}
                {zeroPos != null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-ink-faint opacity-40"
                    style={{ left: `${zeroPos}%` }}
                  />
                )}
                {/* Member ticks */}
                {band.map(m => {
                  const tickColor = colorMode === 'party'
                    ? (PARTY_COLOR[m.party_code] ?? '#888')
                    : color
                  return (
                    <div
                      key={m.handle_lower}
                      onClick={() => navigate(`/member/${m.handle_lower}`)}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-all"
                      style={{
                        left: `${xPos(m[metricKey])}%`,
                        width: '3px',
                        height: '16px',
                        background: tickColor,
                        opacity: 0.75,
                        borderRadius: '1px',
                      }}
                      title={`${m.official_full} (${m.party_code}) · ${metric.label}: ${fmt(m[metricKey], metric.decimals)} · Small donor: ${fmt(m.pct_small_donors, 1)}%`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.width = '5px'
                        e.currentTarget.style.zIndex = '10'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.75'
                        e.currentTarget.style.width = '3px'
                        e.currentTarget.style.zIndex = '1'
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis */}
      <div className="relative mt-4 pt-2 border-t border-border">
        <div className="flex justify-between text-[10px] mono text-ink-faint">
          <span>{fmt(grouped.domain[0], metric.decimals)}</span>
          {zeroPos != null && (
            <span style={{ position: 'absolute', left: `${zeroPos}%`, transform: 'translateX(-50%)' }}>
              0
            </span>
          )}
          <span>{fmt(grouped.domain[1], metric.decimals)}</span>
        </div>
        <div className="text-[11px] text-ink-faint mt-1.5 text-center">
          {metric.label} · hover ticks for member details · click to open profile
        </div>
      </div>

      {/* Party legend (only when coloring by party) */}
      {colorMode === 'party' && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          {['D', 'R'].map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <div
                className="w-2 h-3 rounded-sm"
                style={{ background: PARTY_COLOR[p] }}
              />
              <span className="text-[11px] text-ink-muted">
                {{ D: 'Democrat', R: 'Republican', I: 'Independent' }[p]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
