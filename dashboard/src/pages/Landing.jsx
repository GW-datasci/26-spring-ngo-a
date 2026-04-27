import { Link } from 'react-router-dom'
import { useMembers } from '../hooks/useMembers'

function StatCallout({ value, unit, label, sub }) {
  return (
    <div className="card flex flex-col items-start">
      <div className="flex items-baseline gap-1.5">
        <span
          className="mono"
          style={{
            fontSize: '44px',
            fontWeight: 500,
            color: 'var(--gold)',
            lineHeight: 1,
            letterSpacing: '-0.5px',
          }}
        >
          {value}
        </span>
        {unit && (
          <span className="mono text-base text-ink-muted">{unit}</span>
        )}
      </div>
      <div
        className="mt-3 text-[13px] text-ink"
        style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
      >
        {label}
      </div>
      {sub && (
        <div className="mt-1 text-[12px] text-ink-muted leading-relaxed">
          {sub}
        </div>
      )}
    </div>
  )
}

export default function Landing() {
  const members = useMembers()
  const houseCount = members.length
  const totalTweets = members.reduce((acc, m) => acc + (m.tweet_count ?? 0), 0)

  return (
    <div className="px-8 py-12 max-w-[1100px] mx-auto">

      {/* Hero */}
      <div className="mb-14">
        <div className="label mb-4">A capstone study · 118th Congress</div>
        <h1
          className="m-0 leading-[1.05]"
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '64px',
            fontWeight: 400,
            letterSpacing: '-1px',
            maxWidth: '880px',
          }}
        >
          What goes <em>viral</em> raises <em>money.</em>
        </h1>
        <p
          className="text-ink-muted mt-6 leading-relaxed max-w-[680px]"
          style={{ fontSize: '17px' }}
        >
          A look at <span className="text-ink">{houseCount.toLocaleString()}</span> U.S.
          House members and{' '}
          <span className="text-ink">{Math.round(totalTweets / 1000).toLocaleString()}K</span>{' '}
          of their tweets — and how their digital behavior tracks with the share
          of campaign cash they raise from small donors. The strongest single predictor
          isn't outrage, sentiment, or ideological extremism. It's retweet virality.
        </p>

        <div className="flex gap-3 mt-8 flex-wrap">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg no-underline transition-colors"
            style={{
              background: 'var(--gold)',
              color: 'var(--bg)',
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            Start exploring →
          </Link>
          <Link
            to="/findings"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg no-underline transition-colors text-ink-muted hover:text-ink"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: '14px',
            }}
          >
            See the model
          </Link>
        </div>
      </div>

      {/* Three headline stats */}
      <div className="mb-14">
        <h2
          className="text-[11px] uppercase tracking-[0.6px] text-ink-faint mb-4"
          style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
        >
          Three headline findings
        </h2>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          <StatCallout
            value="0.41"
            unit="R²"
            label="Virality predicts small-donor share"
            sub="Retweet virality alone explains 41% of cross-member variation in small-donor funding — more than outrage, sentiment, or ideology."
          />
          <StatCallout
            value="+6.9"
            unit="pp"
            label="The Squad effect"
            sub="Squad members raise 6.9 percentage points more from small donors than peers — even after controlling for virality, seniority, and gender."
          />
          <StatCallout
            value="140"
            unit="%"
            label="Outrage works through virality"
            sub="A mediation analysis shows the outrage → donations link runs entirely through retweets. Holding virality constant, outrage actually suppresses small-donor share."
          />
        </div>
      </div>

      {/* What's inside */}
      <div className="card">
        <h2
          className="m-0 mb-4"
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '24px',
            fontWeight: 400,
          }}
        >
          What's inside
        </h2>

        <div className="grid gap-x-8 gap-y-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="label mb-1.5">The Landscape</div>
            <p className="text-[13px] text-ink-muted leading-relaxed m-0">
              An interactive scatter of every House member with adjustable axes, party
              and caucus filters, and click-through to individual profiles.
            </p>
          </div>
          <div>
            <div className="label mb-1.5">Distribution Bands</div>
            <p className="text-[13px] text-ink-muted leading-relaxed m-0">
              Members grouped by small-donor share into 4, 8, or 10 bands — surfacing
              within-band variance and party patterns that a scatter can't show.
            </p>
          </div>
          <div>
            <div className="label mb-1.5">Member Profiles</div>
            <p className="text-[13px] text-ink-muted leading-relaxed m-0">
              Per-member emotion radars, tone breakdowns, historical funding trends,
              and a curated sample of their most viral, most positive, and most
              negative tweets.
            </p>
          </div>
          <div>
            <div className="label mb-1.5">Caucus Comparison</div>
            <p className="text-[13px] text-ink-muted leading-relaxed m-0">
              Side-by-side strip plots showing how members of each caucus compare
              against the House baseline on small-donor share.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-border text-[12px] text-ink-faint flex justify-between flex-wrap gap-4">
        <div>
          Sources: FEC quarterly filings · OpenSecrets · VoteView (DW-NOMINATE) ·
          MIT Election Lab · @unitedstates project · Twitter API (via twikit)
        </div>
        <div>Capstone · 2026</div>
      </div>
    </div>
  )
}
