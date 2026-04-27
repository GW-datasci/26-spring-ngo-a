import { useState, useMemo } from 'react'
import ScatterPlot from '../components/ScatterPlot'
import {
  useMembers, X_AXIS_OPTIONS, PARTY_COLOR, PARTY_LABEL,
  CAUCUS_FLAGS, QUARTILES,
} from '../hooks/useMembers'

function Chip({ label, active, partyKey, onClick }) {
  const cls = active
    ? `chip active${partyKey ? ` active-${partyKey}` : ''}`
    : 'chip'
  return <button className={cls} onClick={onClick}>{label}</button>
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <div className="label mb-2">{title}</div>
      <div className="flex gap-1.5 flex-wrap">{children}</div>
    </div>
  )
}

export default function Explore() {
  const members = useMembers()

  const [xAxisKey, setXAxisKey] = useState('avg_retweets_raw')
  const [filters, setFilters] = useState({
    party: [],
    quartile: [],
    caucus: null,
  })

  const toggleParty = (p) =>
    setFilters(f => ({
      ...f,
      party: f.party.includes(p) ? f.party.filter(x => x !== p) : [...f.party, p],
    }))

  const toggleQuartile = (q) =>
    setFilters(f => ({
      ...f,
      quartile: f.quartile.includes(q) ? f.quartile.filter(x => x !== q) : [...f.quartile, q],
    }))

  const setCaucus = (key) =>
    setFilters(f => ({ ...f, caucus: f.caucus === key ? null : key }))

  const visibleCount = useMemo(() =>
    members.filter(m => {
      if (m[xAxisKey] == null || m.pct_small_donors == null) return false
      if (filters.party.length && !filters.party.includes(m.party_code)) return false
      if (filters.quartile.length && !filters.quartile.includes(m.quartile)) return false
      if (filters.caucus && !m[filters.caucus]) return false
      return true
    }).length
  , [members, xAxisKey, filters])

  const xLabel = X_AXIS_OPTIONS.find(o => o.key === xAxisKey)?.label

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-4xl m-0 mb-2 leading-tight"
          style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
        >
          Twitter Virality &amp; <em>Small-Donor Funding</em>
        </h1>
        <p className="text-sm text-ink-muted m-0 max-w-[640px] leading-relaxed">
          Each point is a House member of the 118th Congress. Dot size reflects
          ideological extremism (|DW-NOMINATE|). Click any member to open their profile.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-x-7 gap-y-5 mb-5">
        <FilterGroup title="X Axis">
          {X_AXIS_OPTIONS.map(opt => (
            <Chip
              key={opt.key}
              label={opt.label}
              active={xAxisKey === opt.key}
              onClick={() => setXAxisKey(opt.key)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Party">
          {['D', 'R', 'I'].map(p => (
            <Chip
              key={p}
              label={PARTY_LABEL[p]}
              active={filters.party.includes(p)}
              partyKey={p}
              onClick={() => toggleParty(p)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Virality Quartile">
          {QUARTILES.map(q => (
            <Chip
              key={q}
              label={q}
              active={filters.quartile.includes(q)}
              onClick={() => toggleQuartile(q)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Caucus">
          {CAUCUS_FLAGS.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              active={filters.caucus === key}
              onClick={() => setCaucus(key)}
            />
          ))}
        </FilterGroup>
      </div>

      {/* Count strip */}
      <div className="text-xs mono text-ink-faint mb-3">
        {visibleCount} members · y: small donor % · x: {xLabel}
      </div>

      {/* Chart */}
      <div className="card p-2" style={{ height: '560px' }}>
        <ScatterPlot members={members} xAxisKey={xAxisKey} filters={filters} />
      </div>

      {/* Legend */}
      <div className="flex gap-6 flex-wrap items-center mt-4">
        {['D', 'R', 'I'].map(p => (
          <div key={p} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: PARTY_COLOR[p], opacity: 0.85 }}
            />
            <span className="text-xs text-ink-muted">{PARTY_LABEL[p]}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            <div className="w-2.5 h-2.5 rounded-full bg-ink-faint" />
            <div className="w-3.5 h-3.5 rounded-full bg-ink-faint" />
          </div>
          <span className="text-xs text-ink-muted">Dot size = ideological extremism</span>
        </div>
      </div>
    </div>
  )
}
