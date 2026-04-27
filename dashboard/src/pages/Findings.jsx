import { useState } from 'react'

// From notebook 04, final standardized model:
// pct_small_donors ~ log_avg_retweets + terms_served + avg_fear + is_female + competitive + is_squad
// R² = 0.412, Adj R² = 0.402, N = 361

const COEFFICIENTS = [
  {
    feature: 'log_avg_retweets',
    label: 'Retweet Virality',
    beta_std: +0.55,
    beta_unstd: +4.43,
    p: 0.0000,
    direction: 'positive',
    headline: 'The single strongest predictor.',
    explanation:
      "A one-unit increase in log average retweets is associated with a 4.4 percentage-point increase in small-donor share. Members whose tweets travel further raise more money from small donors — even after controlling for everything else.",
  },
  {
    feature: 'terms_served',
    label: 'Seniority',
    beta_std: -0.18,
    beta_unstd: -0.48,
    p: 0.0000,
    direction: 'negative',
    headline: 'Each term in office costs ~0.5pp.',
    explanation:
      "Each additional term in office reduces small-donor share by about 0.5 percentage points. Veteran members lean on PACs and bundled large donations; insurgent newcomers lean on small-dollar donors.",
  },
  {
    feature: 'avg_fear',
    label: 'Fear Rhetoric',
    beta_std: -0.13,
    beta_unstd: -25.0,
    p: 0.0022,
    direction: 'negative',
    headline: 'Fear suppresses small-donor share.',
    explanation:
      "Members whose tweets express more fear receive a smaller share of their funding from small donors. This is the opposite direction from anger or outrage — fear may signal vulnerability rather than mobilization.",
  },
  {
    feature: 'is_female',
    label: 'Female Member',
    beta_std: +0.12,
    beta_unstd: +3.04,
    p: 0.0066,
    direction: 'positive',
    headline: 'Women raise ~3pp more from small donors.',
    explanation:
      "Female members raise about 3 percentage points more of their funding from small donors than male peers, controlling for virality, seniority, and party.",
  },
  {
    feature: 'competitive',
    label: 'Competitive District',
    beta_std: +0.11,
    beta_unstd: +3.63,
    p: 0.0147,
    direction: 'positive',
    headline: 'Tight races attract small-dollar attention.',
    explanation:
      "Members from competitive districts (won by < 10 points) raise about 3.6 percentage points more from small donors. National attention to swing seats translates into small-dollar donor activity.",
  },
  {
    feature: 'is_squad',
    label: 'The Squad',
    beta_std: +0.09,
    beta_unstd: +6.86,
    p: 0.0369,
    direction: 'positive',
    headline: 'The Squad brand premium.',
    explanation:
      "Squad / Justice Democrats membership adds ~6.9 percentage points beyond what virality alone would predict. This is a brand effect: small donors actively seek out and fund Squad-affiliated members.",
  },
]

const SUMMARY = {
  r2: 0.412,
  adj_r2: 0.402,
  n: 361,
  formula: 'pct_small_donors ~ log_avg_retweets + terms_served + avg_fear + is_female + competitive + is_squad',
}

const fmt = (v, decimals = 2, sign = false) => {
  if (v == null) return '—'
  const n = Number(v).toFixed(decimals)
  return sign && v >= 0 ? `+${n}` : n
}

const sigStars = (p) =>
  p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : ''

// ── Coefficient bar ──────────────────────────────────────────────────────────
function CoefficientBar({ coef, maxAbs, expanded, onToggle }) {
  const isPos = coef.direction === 'positive'
  const color = isPos ? '#b2182b' : '#2166ac'
  const widthPct = (Math.abs(coef.beta_std) / maxAbs) * 50  // 50% = half the bar width

  return (
    <div
      className="rounded-lg border transition-colors cursor-pointer"
      style={{
        borderColor: expanded ? 'var(--border-bright)' : 'var(--border)',
        background: expanded ? 'var(--surface-2)' : 'var(--surface)',
      }}
      onClick={onToggle}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-44 shrink-0 text-right">
            <div className="text-[13px] text-ink font-medium">{coef.label}</div>
            <div className="text-[10px] mono text-ink-faint mt-0.5">{coef.feature}</div>
          </div>

          {/* Bar with center axis */}
          <div className="relative flex-1 h-6">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-ink-faint opacity-50" />
            <div
              className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-sm"
              style={{
                background: color,
                opacity: 0.85,
                width: `${widthPct}%`,
                left: isPos ? '50%' : `${50 - widthPct}%`,
              }}
            />
          </div>

          <div className="w-32 shrink-0 text-right">
            <div className="mono text-[13px]" style={{ color }}>
              {fmt(coef.beta_std, 3, true)}
            </div>
            <div className="text-[10px] mono text-ink-faint mt-0.5">
              p = {fmt(coef.p, 4)} {sigStars(coef.p)}
            </div>
          </div>

          <div className="w-4 text-ink-faint mono text-[14px] text-center shrink-0">
            {expanded ? '−' : '+'}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="ml-44 pl-3">
            <div className="text-[14px] text-ink mt-3 mb-2 font-medium">
              {coef.headline}
            </div>
            <p className="text-[13px] text-ink-muted leading-relaxed m-0 max-w-[640px]">
              {coef.explanation}
            </p>
            <div className="mt-3 flex gap-5 text-[11px] mono text-ink-faint">
              <span>
                Standardized β: <span className="text-ink-muted">{fmt(coef.beta_std, 3, true)}</span>
              </span>
              <span>
                Unstandardized β: <span className="text-ink-muted">{fmt(coef.beta_unstd, 2, true)}</span>
              </span>
              <span>
                p-value: <span className="text-ink-muted">{fmt(coef.p, 4)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Findings() {
  const [expandedKey, setExpandedKey] = useState('log_avg_retweets')

  // Sort by absolute standardized effect size, descending
  const sorted = [...COEFFICIENTS].sort(
    (a, b) => Math.abs(b.beta_std) - Math.abs(a.beta_std)
  )
  const maxAbs = Math.max(...sorted.map(c => Math.abs(c.beta_std)))

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="mb-10">
        <div className="label mb-3">The model</div>
        <h1
          className="m-0 mb-3 leading-tight"
          style={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '40px',
            fontWeight: 400,
          }}
        >
          What predicts small-donor share?
        </h1>
        <p className="text-ink-muted text-[15px] max-w-[680px] leading-relaxed">
          A linear regression model with six predictors, fit on 361 House members.
          Click any coefficient to see what it means and why it matters.
          Bar length shows the standardized effect size — comparable across predictors.
          Color shows direction.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="card flex-1 min-w-[160px]">
          <div className="label mb-1">R²</div>
          <div className="mono text-2xl text-gold leading-none">{fmt(SUMMARY.r2, 3)}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">
            41% of variation explained
          </div>
        </div>
        <div className="card flex-1 min-w-[160px]">
          <div className="label mb-1">Adjusted R²</div>
          <div className="mono text-2xl text-ink leading-none">{fmt(SUMMARY.adj_r2, 3)}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">
            Penalized for predictor count
          </div>
        </div>
        <div className="card flex-1 min-w-[160px]">
          <div className="label mb-1">N (members)</div>
          <div className="mono text-2xl text-ink leading-none">{SUMMARY.n}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">
            after dropping missing data
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="mb-8">
        <div className="label mb-2">Final specification</div>
        <div
          className="card mono text-[12px]"
          style={{
            background: 'var(--surface-2)',
            color: 'var(--ink-muted)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {SUMMARY.formula}
        </div>
      </div>

      {/* Coefficient bars */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="label">Predictors, ranked by effect size</div>
          <div className="flex items-center gap-3 text-[11px] text-ink-faint">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: '#b2182b' }} />
              <span>Increases small-donor %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ background: '#2166ac' }} />
              <span>Decreases</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.map(coef => (
            <CoefficientBar
              key={coef.feature}
              coef={coef}
              maxAbs={maxAbs}
              expanded={expandedKey === coef.feature}
              onToggle={() =>
                setExpandedKey(expandedKey === coef.feature ? null : coef.feature)
              }
            />
          ))}
        </div>
      </div>

      {/* Interpretation note */}
      <div className="card mb-8">
        <h3
          className="m-0 mb-3 text-lg"
          style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400 }}
        >
          What about outrage and sentiment?
        </h3>
        <p className="text-[13px] text-ink-muted leading-relaxed m-0 mb-3">
          Notably absent from the final model: <span className="text-ink">outrage index</span>,{' '}
          <span className="text-ink">average sentiment</span>, and{' '}
          <span className="text-ink">|DW-NOMINATE|</span> (ideological extremism).
          A separate mediation analysis shows that outrage <em>does</em> drive small-donor
          fundraising — but entirely <em>through</em> retweet virality, not independently
          of it. Holding virality constant, more outrage actually suppresses small-donor
          share. The takeaway: emotional rhetoric matters because it goes viral, not
          because donors directly reward it.
        </p>
        <p className="text-[13px] text-ink-muted leading-relaxed m-0">
          Sentiment slope (whether members are getting more or less negative over time)
          had no relationship with small-donor share (p = 0.71). What matters is the
          steady-state level of emotional rhetoric, not its trajectory.
        </p>
      </div>

      {/* Footnote */}
      <div className="text-[11px] text-ink-faint">
        Significance: *** p &lt; 0.001 · ** p &lt; 0.01 · * p &lt; 0.05.
        VIFs all &lt; 6 (no multicollinearity issues). See full notebook for robustness
        checks and feature screening.
      </div>
    </div>
  )
}
