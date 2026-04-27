import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  useMember, PARTY_COLOR, PARTY_LABEL,
  CAUCUS_FLAGS, getCycleHistory,
} from '../hooks/useMembers'
import EmotionRadar from '../components/EmotionRadar'
import TweetExplorer from '../components/TweetExplorer'
import StatTile from '../components/StatTile'
import MemberPhoto from '../components/MemberPhoto'

const fmt = (v, decimals = 1) =>
  v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals })

const fmtFollowers = (v) => {
  if (v == null) return '—'
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="section-heading text-xl">{title}</h2>
      {children}
    </div>
  )
}

function CycleChart({ member }) {
  const data = getCycleHistory(member)
  if (!data.length) {
    return <p className="text-ink-faint text-[13px]">No historical data available.</p>
  }
  const color = PARTY_COLOR[member.party_code] ?? '#888'

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--ink-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
          width={40}
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Small donor %']}
          contentStyle={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-bright)',
            borderRadius: '8px',
            fontFamily: 'JetBrains Mono',
            fontSize: '12px',
          }}
          labelStyle={{ color: 'var(--ink-muted)' }}
        />
        <ReferenceLine x="2018" stroke="var(--gold)" strokeDasharray="4 3" opacity={0.5}
          label={{ value: '2018', fill: 'var(--gold)', fontSize: 10, fontFamily: 'JetBrains Mono', position: 'top' }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function Member() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const member = useMember(handle)

  if (!member) {
    return (
      <div className="text-center px-8 py-20">
        <p className="text-ink-muted">
          Member <code className="mono">@{handle}</code> not found.
        </p>
        <button
          onClick={() => navigate('/explore')}
          className="mt-4 px-5 py-2 rounded-lg bg-surface border border-border text-ink-muted hover:text-ink hover:border-[var(--border-bright)] transition-colors"
        >
          ← Back to Explore
        </button>
      </div>
    )
  }

  const partyLabel = PARTY_LABEL[member.party_code] ?? member.party_code
  const caucuses = CAUCUS_FLAGS.filter(({ key }) => member[key])

  const sentimentDir = member.sentiment_slope > 0.0001
    ? { label: 'Trending positive', color: 'var(--pos)' }
    : member.sentiment_slope < -0.0001
    ? { label: 'Trending negative', color: 'var(--neg)' }
    : { label: 'Stable', color: 'var(--ink-muted)' }

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">

      <button
        onClick={() => navigate('/explore')}
        className="bg-transparent border-none text-ink-muted cursor-pointer text-sm p-0 mb-6 flex items-center gap-1.5 hover:text-ink transition-colors"
      >
        ← Back to Explore
      </button>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8 flex-wrap">
        <MemberPhoto
          bioguide={member.bioguide}
          name={member.official_full}
          size={96}
        />
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1
              className="m-0 leading-tight"
              style={{ fontFamily: '"DM Serif Display", serif', fontSize: '40px', fontWeight: 400 }}
            >
              {member.official_full}
            </h1>
            <span className={`badge badge-${member.party_code}`}>{partyLabel}</span>
          </div>

          <div className="flex gap-4 flex-wrap text-[13px] text-ink-muted">
            <span>
              <span className="text-ink-faint">State: </span>
              {member.state_abbrev}
              {member.district_code ? `-${String(member.district_code).padStart(2, '0')}` : ''}
            </span>
            {member.terms_served != null && (
              <span><span className="text-ink-faint">Terms: </span>{member.terms_served}</span>
            )}
            {member.age_in_2024 != null && (
              <span><span className="text-ink-faint">Age: </span>{member.age_in_2024}</span>
            )}
            <span><span className="text-ink-faint">@</span>{handle}</span>
          </div>

          {caucuses.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {caucuses.map(({ key, label }) => (
                <span
                  key={key}
                  className="px-2.5 py-0.5 rounded-full text-[11px] bg-surface border border-border text-ink-muted"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-3 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <StatTile
          label="Small Donor %"
          value={`${fmt(member.pct_small_donors, 1)}%`}
          sub={`Virality ${member.quartile ?? '—'}`}
          highlight
        />
        <StatTile
          label="Avg Retweets"
          value={fmt(member.avg_retweets_raw, 0)}
          sub={`${fmt(member.tweet_count, 0)} tweets analyzed`}
        />
        <StatTile label="Outrage Index" value={fmt(member.outrage_index, 3)} />
        <StatTile
          label="Avg Sentiment"
          value={fmt(member.avg_sentiment, 3)}
          sub={<span style={{ color: sentimentDir.color }}>{sentimentDir.label}</span>}
        />
        <StatTile
          label="Ideology |DW|"
          value={fmt(member.nominate_abs, 3)}
          sub={member.nominate_dim1 != null ? `DW-1: ${fmt(member.nominate_dim1, 3)}` : null}
        />
        <StatTile label="Followers" value={fmtFollowers(member.followers)} />
      </div>

      {/* Two columns */}
      <div className="grid gap-10" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex flex-col gap-10">

          <Section title="Emotional Tone">
            <div className="card">
              <EmotionRadar member={member} />
            </div>
          </Section>

          <Section title="Tone Breakdown">
            <div className="card flex flex-col gap-2.5">
              {[
                { label: 'Positive',        value: member.pct_positive,    color: 'var(--pos)' },
                { label: 'Negative',        value: member.pct_negative,    color: 'var(--neg)' },
                { label: 'Neutral',         value: member.pct_neutral,     color: 'var(--ink-faint)' },
                { label: 'Extreme negative', value: member.pct_extreme_neg, color: '#ef4444' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className="w-28 text-xs text-ink-muted text-right">{label}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${((value ?? 0) * 100).toFixed(1)}%`, background: color }}
                    />
                  </div>
                  <span className="w-12 text-[11px] mono text-ink-muted">
                    {fmt((value ?? 0) * 100, 1)}%
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Small-Donor Funding by Cycle">
            <div className="card">
              <CycleChart member={member} />
              {member.pct_change_22_24 != null && (
                <div className="mt-3 text-xs text-ink-muted">
                  Change 2022→2024:{' '}
                  <span
                    className="mono"
                    style={{ color: member.pct_change_22_24 >= 0 ? 'var(--pos)' : 'var(--neg)' }}
                  >
                    {member.pct_change_22_24 >= 0 ? '+' : ''}{fmt(member.pct_change_22_24, 1)} pp
                  </span>
                </div>
              )}
            </div>
          </Section>

        </div>

        <Section title="Tweet Explorer">
          <TweetExplorer tweets={member.top_tweets ?? []} />
        </Section>
      </div>
    </div>
  )
}
