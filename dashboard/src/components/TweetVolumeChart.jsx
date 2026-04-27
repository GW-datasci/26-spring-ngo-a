import { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { PARTY_COLOR, PARTY_LABEL } from '../hooks/useMembers'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

const Y_OPTIONS = [
  { key: 'avg_retweets_raw', label: 'Avg Retweets',     fmt: v => fmt(v, 0) },
  { key: 'pct_small_donors', label: 'Small Donor %',    fmt: v => `${fmt(v, 1)}%` },
  { key: 'avg_sentiment',    label: 'Avg Sentiment',    fmt: v => fmt(v, 3) },
  { key: 'outrage_index',    label: 'Outrage Index',    fmt: v => fmt(v, 3) },
  { key: 'followers',        label: 'Followers',        fmt: v => fmt(v, 0) },
]

function TooltipCard({ active, payload, yLabel, yFmt }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const color = PARTY_COLOR[d.party_code] ?? '#888'

  return (
    <div className="tooltip-card">
      <div className="name" style={{ color }}>{d.official_full}</div>
      <div className="text-[11px] text-ink-faint mb-2">
        {d.state_abbrev} · {PARTY_LABEL[d.party_code] ?? d.party_code}
      </div>
      <div className="row">
        <span>Tweets scraped</span>
        <span>{fmt(d.tweet_count, 0)}</span>
      </div>
      <div className="row">
        <span>{yLabel}</span>
        <span>{yFmt(d[d._yKey])}</span>
      </div>
    </div>
  )
}

export default function TweetVolumeChart({ members }) {
  const navigate = useNavigate()
  const [yKey, setYKey] = useState('avg_retweets_raw')
  const yOpt = Y_OPTIONS.find(o => o.key === yKey) ?? Y_OPTIONS[0]

  const data = useMemo(() => {
    return members
      .filter(m => m.tweet_count != null && m[yKey] != null
        && Number.isFinite(m.tweet_count) && Number.isFinite(m[yKey]))
      .map(m => ({ ...m, _yKey: yKey }))
  }, [members, yKey])

  const byParty = useMemo(() => {
    const groups = { D: [], R: [], I: [] }
    for (const d of data) {
      const p = d.party_code ?? 'I'
      if (groups[p]) groups[p].push(d)
    }
    return groups
  }, [data])

  // Stats: tweet volume distribution
  const stats = useMemo(() => {
    const counts = data.map(m => m.tweet_count).sort((a, b) => a - b)
    if (counts.length === 0) return null
    const total = counts.reduce((a, b) => a + b, 0)
    const median = counts[Math.floor(counts.length / 2)]
    return {
      total,
      median,
      max: counts[counts.length - 1],
      min: counts[0],
      members: counts.length,
    }
  }, [data])

  return (
    <div>
      {stats && (
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="card">
            <div className="label mb-1">Total tweets</div>
            <div className="mono text-xl text-ink leading-none">
              {(stats.total / 1000).toFixed(0)}K
            </div>
          </div>
          <div className="card">
            <div className="label mb-1">Median per member</div>
            <div className="mono text-xl text-ink leading-none">{fmt(stats.median, 0)}</div>
          </div>
          <div className="card">
            <div className="label mb-1">Max scraped</div>
            <div className="mono text-xl text-ink leading-none">{fmt(stats.max, 0)}</div>
          </div>
          <div className="card">
            <div className="label mb-1">Members</div>
            <div className="mono text-xl text-ink leading-none">{stats.members}</div>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-baseline gap-3 flex-wrap">
        <div className="label">Y axis:</div>
        <div className="flex gap-1.5 flex-wrap">
          {Y_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setYKey(opt.key)}
              className={`chip ${yKey === opt.key ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-2" style={{ height: '420px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" opacity={0.4} />
            <XAxis
              type="number"
              dataKey="tweet_count"
              name="Tweets scraped"
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
              label={{
                value: 'Tweets scraped per member',
                position: 'insideBottom',
                offset: -28,
                fill: 'var(--ink-muted)',
                fontSize: 13,
              }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yOpt.label}
              tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={v =>
                yKey === 'pct_small_donors' ? `${v}%` :
                v >= 1000 ? `${(v / 1000).toFixed(0)}K` :
                yKey === 'avg_sentiment' || yKey === 'outrage_index' ? v.toFixed(2) :
                v
              }
              label={{
                value: yOpt.label,
                angle: -90,
                position: 'insideLeft',
                offset: 12,
                fill: 'var(--ink-muted)',
                fontSize: 13,
              }}
            />
            <Tooltip
              content={<TooltipCard yLabel={yOpt.label} yFmt={yOpt.fmt} />}
              cursor={{ stroke: 'var(--border-bright)', strokeWidth: 1 }}
            />
            {Object.entries(byParty).map(([party, pts]) => (
              <Scatter
                key={party}
                name={party}
                data={pts}
                fill={PARTY_COLOR[party] ?? '#888'}
                fillOpacity={0.65}
                onClick={(p) => p?.handle_lower && navigate(`/member/${p.handle_lower}`)}
                style={{ cursor: 'pointer' }}
                shape="circle"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-5 flex-wrap items-center mt-3 text-xs text-ink-muted">
        {['D', 'R', 'I'].map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: PARTY_COLOR[p], opacity: 0.85 }} />
            {PARTY_LABEL[p]}
          </div>
        ))}
        <span className="text-ink-faint">Click any point to open the member's profile.</span>
      </div>
    </div>
  )
}
