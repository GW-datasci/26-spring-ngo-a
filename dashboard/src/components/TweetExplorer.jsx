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

const VISIBLE_COUNT = 8

export default function TweetExplorer({ tweets }) {
  const [filterKey, setFilterKey] = useState('viral')
  const filter = FILTERS.find(f => f.key === filterKey) ?? FILTERS[0]

  const sorted = useMemo(() => {
    return [...tweets].sort(filter.sort).slice(0, VISIBLE_COUNT)
  }, [tweets, filter])

  if (tweets.length === 0) {
    return <p className="text-ink-faint text-[13px]">No tweet data available.</p>
  }

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
        Showing {sorted.length} of {tweets.length} sampled tweets
      </div>

      <div className="flex flex-col gap-2.5">
        {sorted.map((tweet, i) => (
          <TweetCard key={tweet.Tweet_ID ?? `${filterKey}-${i}`} tweet={tweet} />
        ))}
      </div>
    </div>
  )
}
