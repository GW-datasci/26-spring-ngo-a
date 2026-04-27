import { useState, useMemo } from 'react'
import TweetCard from './TweetCard'

const FILTERS = [
  { key: 'viral',    label: 'Most viral',    sort: (a, b) => (b.Retweets ?? 0) - (a.Retweets ?? 0) },
  { key: 'positive', label: 'Most positive', sort: (a, b) => (b.sentiment_score ?? -Infinity) - (a.sentiment_score ?? -Infinity) },
  { key: 'negative', label: 'Most negative', sort: (a, b) => (a.sentiment_score ?? Infinity) - (b.sentiment_score ?? Infinity) },
  { key: 'recent',   label: 'Most recent',   sort: (a, b) => {
      const da = a['Created At'] ? new Date(a['Created At']).getTime() : 0
      const db = b['Created At'] ? new Date(b['Created At']).getTime() : 0
      return db - da
    }
  },
]

const PAGE_SIZE = 8

export default function TweetExplorer({ tweets }) {
  const [filterKey, setFilterKey] = useState('viral')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filter = FILTERS.find(f => f.key === filterKey) ?? FILTERS[0]

  const sorted = useMemo(() => {
    setVisible(PAGE_SIZE)
    return [...tweets].sort(filter.sort)
  }, [tweets, filterKey])

  if (tweets.length === 0) {
    return <p className="text-ink-faint text-[13px]">No tweet data available.</p>
  }

  const shown = sorted.slice(0, visible)
  const remaining = sorted.length - visible
  const hasMore = remaining > 0

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterKey(f.key)}
            className={`chip ${filterKey === f.key ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-[11px] mono text-ink-faint mb-3">
        Showing {shown.length} of {sorted.length} sampled tweets
      </div>

      <div className="flex flex-col gap-2.5">
        {shown.map((tweet, i) => (
          <TweetCard key={tweet.Tweet_ID ?? `${filterKey}-${i}`} tweet={tweet} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisible(v => v + PAGE_SIZE)}
          className="mt-4 w-full py-2.5 rounded-lg border border-border text-[13px] text-ink-muted hover:text-ink hover:border-[var(--border-bright)] transition-colors bg-transparent cursor-pointer"
        >
          Show {Math.min(PAGE_SIZE, remaining)} more
          <span className="mono text-ink-faint ml-2 text-[11px]">
            ({remaining} remaining)
          </span>
        </button>
      )}
    </div>
  )
}
