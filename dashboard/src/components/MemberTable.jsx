import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PARTY_COLOR, PARTY_LABEL } from '../hooks/useMembers'
import MemberPhoto from './MemberPhoto'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

const COLUMNS = [
  { key: 'rank',              label: '#',                 width: '40px',  align: 'right',  sortable: false },
  { key: 'official_full',     label: 'Member',            width: 'auto',  align: 'left',   sortable: true },
  { key: 'party_code',        label: 'Party',             width: '90px',  align: 'left',   sortable: true },
  { key: 'state_abbrev',      label: 'State',             width: '60px',  align: 'left',   sortable: true },
  { key: 'pct_small_donors',  label: 'Small Donor %',     width: '120px', align: 'right',  sortable: true, fmt: v => `${fmt(v, 1)}%` },
  { key: 'avg_retweets_raw',  label: 'Avg Retweets',      width: '110px', align: 'right',  sortable: true, fmt: v => fmt(v, 0) },
  { key: 'outrage_index',     label: 'Outrage',           width: '90px',  align: 'right',  sortable: true, fmt: v => fmt(v, 2) },
  { key: 'avg_sentiment',     label: 'Sentiment',         width: '100px', align: 'right',  sortable: true, fmt: v => fmt(v, 2) },
]

function compare(a, b, dir) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'string') return dir * a.localeCompare(b)
  return dir * (a - b)
}

export default function MemberTable({ members }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState('pct_small_donors')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const filtered = search.trim()
      ? members.filter(m => {
          const q = search.toLowerCase().trim()
          return (
            m.official_full?.toLowerCase().includes(q) ||
            m.handle_lower?.toLowerCase().includes(q) ||
            m.state_abbrev?.toLowerCase().includes(q)
          )
        })
      : members
    return [...filtered].sort((a, b) => compare(a[sortKey], b[sortKey], dir))
  }, [members, sortKey, sortDir, search])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // Default direction: numeric desc, string asc
      const col = COLUMNS.find(c => c.key === key)
      setSortDir(col?.fmt ? 'desc' : 'asc')
    }
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, handle, or state…"
          className="bg-surface border border-border rounded-lg px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-faint flex-1 min-w-[260px] outline-none focus:border-[var(--border-bright)] transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        />
        <span className="text-xs mono text-ink-faint">
          {sorted.length} {sorted.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '560px', overflowY: 'auto' }}>
          <table className="w-full border-collapse" style={{ fontFamily: 'DM Sans' }}>
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-border">
                {COLUMNS.map(col => {
                  const isSorted = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                      className={`px-3 py-2.5 label whitespace-nowrap select-none ${
                        col.sortable ? 'cursor-pointer hover:text-ink' : ''
                      }`}
                      style={{
                        textAlign: col.align,
                        width: col.width,
                        color: isSorted ? 'var(--gold)' : 'var(--ink-faint)',
                      }}
                    >
                      {col.label}
                      {isSorted && (
                        <span className="ml-1 mono">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr
                  key={m.handle_lower}
                  onClick={() => navigate(`/member/${m.handle_lower}`)}
                  className="border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                >
                  <td className="px-3 py-2 text-right mono text-[12px] text-ink-faint">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 text-[13px] text-ink">
                    <div className="flex items-center gap-2.5">
                      <MemberPhoto bioguide={m.bioguide} name={m.official_full} size={28} />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.official_full}</div>
                        <div className="text-ink-faint text-[11px] mono truncate">@{m.handle_lower}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="text-[11px] mono"
                      style={{ color: PARTY_COLOR[m.party_code] ?? 'var(--ink-muted)' }}
                    >
                      {PARTY_LABEL[m.party_code] ?? m.party_code ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 mono text-[12px] text-ink-muted">
                    {m.state_abbrev}{m.district_code ? `-${String(m.district_code).padStart(2, '0')}` : ''}
                  </td>
                  {COLUMNS.slice(4).map(col => (
                    <td
                      key={col.key}
                      className="px-3 py-2 mono text-[12px]"
                      style={{
                        textAlign: col.align,
                        color: col.key === 'pct_small_donors' ? 'var(--ink)' : 'var(--ink-muted)',
                        fontWeight: col.key === 'pct_small_donors' ? 500 : 400,
                      }}
                    >
                      {col.fmt ? col.fmt(m[col.key]) : (m[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-8 text-ink-faint text-sm">
                    No members match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
