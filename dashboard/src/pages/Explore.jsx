import { useState, useMemo } from 'react'
import ScatterPlot from '../components/ScatterPlot'
import MemberTable from '../components/MemberTable'
import TopList from '../components/TopList'
import CaucusComparison from '../components/CaucusComparison'
import SentimentByBand from '../components/SentimentByBand'
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

function SectionTitle({ children, eyebrow }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="label mb-1.5">{eyebrow}</div>
      )}
      <h2
        className="m-0 text-2xl leading-tight"
        style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
      >
        {children}
      </h2>
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

      {/* Hero */}
      <div className="mb-10">
        <div className="label mb-3">The dashboard</div>
        <h1
          className="text-4xl m-0 mb-2 leading-tight"
          style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
        >
          Explore the data
        </h1>
        <p className="text-sm text-ink-muted m-0 max-w-[680px] leading-relaxed">
          Each point is a House member of the 118th Congress. Filter, sort, and click
          any member to drill in.
        </p>
      </div>

      {/* ── Section 1: Scatter ────────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionTitle eyebrow="Section 1 · Distribution">
          The Landscape
        </SectionTitle>

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
            {['D', 'R'].map(p => (
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

        <div className="text-xs mono text-ink-faint mb-3">
          {visibleCount} members shown · y: small donor % · x: {xLabel}
        </div>

        <div className="card p-2" style={{ height: '560px' }}>
          <ScatterPlot members={members} xAxisKey={xAxisKey} filters={filters} />
        </div>

        <div className="flex gap-6 flex-wrap items-center mt-4">
          {['D', 'R'].map(p => (
            <div key={p} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: PARTY_COLOR[p], opacity: 0.85 }}
              />
              <span className="text-xs text-ink-muted">{PARTY_LABEL[p]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Leaderboards + Caucus comparison ───────────────────── */}
      <section className="mb-14">
        <SectionTitle eyebrow="Section 2 · Who stands out">
          Leaders &amp; Outliers
        </SectionTitle>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
          <div>
            <div className="label mb-2">Top 10 by metric</div>
            <TopList members={members} />
          </div>
          <div>
            <div className="label mb-2">By caucus membership</div>
            <CaucusComparison members={members} />
          </div>
        </div>
      </section>

      {/* ── Section 3: Within-band distribution ───────────────────────────── */}
      <section className="mb-14">
        <SectionTitle eyebrow="Section 3 · Distribution within bands">
          Sentiment Across the Funding Spectrum
        </SectionTitle>
        <p className="text-xs text-ink-muted mb-4 max-w-[680px]">
          Members are grouped into bands by their small-donor share. Each tick is one member,
          positioned by the chosen metric. Within-band variance and party patterns reveal
          which slices of the distribution are emotionally homogeneous and which are bimodal.
        </p>
        <SentimentByBand members={members} />
      </section>

      {/* ── Section 4: Searchable table ───────────────────────────────────── */}
      <section>
        <SectionTitle eyebrow="Section 4 · Browse all members">
          The Full Roster
        </SectionTitle>
        <p className="text-xs text-ink-muted mb-4 max-w-[680px]">
          Click any row to view a member's profile. Sort columns by clicking the headers.
        </p>
        <MemberTable members={members} />
      </section>
    </div>
  )
}
