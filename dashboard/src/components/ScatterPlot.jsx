import { useMemo, useCallback } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  PARTY_COLOR, PARTY_LABEL, X_AXIS_OPTIONS,
  X_AXIS_DOMAINS, Y_DOMAIN,
} from '../hooks/useMembers'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const color = PARTY_COLOR[d.party_code] ?? '#888'

  return (
    <div className="tooltip-card">
      <div className="name" style={{ color }}>{d.official_full}</div>
      <div className="text-[11px] text-ink-faint mb-2">
        {d.state_abbrev}{d.district_code ? `-${String(d.district_code).padStart(2, '0')}` : ''}
        {' · '}
        {PARTY_LABEL[d.party_code] ?? d.party_code}
      </div>
      <div className="row"><span>Small donors</span><span>{fmt(d.pct_small_donors, 1)}%</span></div>
      <div className="row"><span>Avg retweets</span><span>{fmt(d.avg_retweets_raw, 0)}</span></div>
      <div className="row"><span>Outrage index</span><span>{fmt(d.outrage_index, 3)}</span></div>
      <div className="row"><span>Sentiment</span><span>{fmt(d.avg_sentiment, 3)}</span></div>
      <div className="row"><span>Ideology |DW|</span><span>{fmt(d.nominate_abs, 3)}</span></div>
      <div className="text-[11px] text-ink-faint mt-2">Click for profile →</div>
    </div>
  )
}

export default function ScatterPlot({ members, xAxisKey = 'avg_retweets_raw', filters }) {
  const navigate = useNavigate()
  const xOption = X_AXIS_OPTIONS.find(o => o.key === xAxisKey) ?? X_AXIS_OPTIONS[0]

  const data = useMemo(() => {
    return members
      .filter(m => {
        if (m[xAxisKey] == null || m.pct_small_donors == null) return false
        if (filters.party.length && !filters.party.includes(m.party_code)) return false
        if (filters.quartile.length && !filters.quartile.includes(m.quartile)) return false
        if (filters.caucus && !m[filters.caucus]) return false
        return true
      })
      .map(m => ({
        ...m,
        x: m[xAxisKey],
        y: m.pct_small_donors,
      }))
  }, [members, xAxisKey, filters])

  const byParty = useMemo(() => {
    const groups = { D: [], R: [], I: [] }
    for (const d of data) {
      const p = d.party_code ?? 'I'
      if (groups[p]) groups[p].push(d)
    }
    return groups
  }, [data])

  const handleClick = useCallback((point) => {
    if (point?.handle_lower) navigate(`/member/${point.handle_lower}`)
  }, [navigate])

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" opacity={0.4} />
          <XAxis
            type="number"
            dataKey="x"
            name={xOption.label}
            domain={X_AXIS_DOMAINS[xAxisKey]}
            allowDataOverflow={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={xOption.tickFormat}
            label={{
              value: xOption.label,
              position: 'insideBottom',
              offset: -28,
              fill: 'var(--ink-muted)',
              fontSize: 13,
              fontFamily: 'DM Sans',
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Small Donor %"
            domain={Y_DOMAIN}
            allowDataOverflow={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={v => `${v}%`}
            label={{
              value: 'Small Donor %',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fill: 'var(--ink-muted)',
              fontSize: 13,
              fontFamily: 'DM Sans',
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'var(--border-bright)', strokeWidth: 1 }}
          />

          {Object.entries(byParty).map(([party, pts]) => (
            <Scatter
              key={party}
              name={party}
              data={pts}
              fill={PARTY_COLOR[party] ?? '#888'}
              fillOpacity={0.7}
              onClick={handleClick}
              style={{ cursor: 'pointer' }}
              shape="circle"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
