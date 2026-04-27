const fmt = n => n == null ? '—' : Number(n).toLocaleString()

function SentimentPill({ label }) {
  if (!label) return null
  return <span className={`pill pill-${label}`}>{label}</span>
}

export default function TweetCard({ tweet }) {
  const date = tweet['Created At']
    ? new Date(tweet['Created At']).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null

  return (
    <div
      className="bg-surface border border-border rounded-xl px-4 py-3.5 transition-colors hover:border-[var(--border-bright)]"
    >
      <p className="text-[13px] leading-relaxed text-ink m-0 mb-2.5 break-words">
        {tweet.Text}
      </p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-3 items-center">
          <SentimentPill label={tweet.label} />
          {date && <span className="text-[11px] text-ink-faint">{date}</span>}
        </div>
        <div className="flex gap-3.5">
          <span className="text-[11px] mono text-ink-muted">↻ {fmt(tweet.Retweets)}</span>
          <span className="text-[11px] mono text-ink-muted">♥ {fmt(tweet.Likes)}</span>
        </div>
      </div>
    </div>
  )
}
