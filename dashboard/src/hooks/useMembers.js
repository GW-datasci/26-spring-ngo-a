import { useMemo } from 'react'
import membersRaw from '../data/members.json'
import topTweetsRaw from '../data/top_tweets.json'

function sanitize(v) {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isFinite(v)) return null
  return v
}

function sanitizeRecord(obj) {
  const out = {}
  for (const k in obj) out[k] = sanitize(obj[k])
  return out
}

export const PARTY_LABEL = { D: 'Democrat', R: 'Republican', I: 'Independent' }
export const PARTY_COLOR = { D: '#4a8ff5', R: '#e8433a', I: '#a78bfa' }

export const X_AXIS_OPTIONS = [
  { key: 'avg_retweets_raw', label: 'Avg Retweets (Virality)', tickFormat: v => v?.toLocaleString(),  decimals: 0 },
  { key: 'outrage_index',    label: 'Outrage Index',           tickFormat: v => v?.toFixed(2),         decimals: 3 },
  { key: 'avg_sentiment',    label: 'Avg Sentiment',           tickFormat: v => v?.toFixed(2),         decimals: 3 },
  { key: 'avg_anger',        label: 'Avg Anger',               tickFormat: v => v?.toFixed(2),         decimals: 3 },
  { key: 'nominate_abs',     label: 'Ideological Extremism',   tickFormat: v => v?.toFixed(2),         decimals: 3 },
]

export const CAUCUS_FLAGS = [
  { key: 'is_freedom_caucus', label: 'Freedom Caucus' },
  { key: 'is_progressive',    label: 'Progressive Caucus' },
  { key: 'is_squad',          label: 'The Squad' },
  { key: 'is_problem_solver', label: 'Problem Solvers' },
  { key: 'is_blue_dog',       label: 'Blue Dog Coalition' },
  { key: 'is_new_dem',        label: 'New Democrat Coalition' },
  { key: 'is_rsc',            label: 'Republican Study Committee' },
]

export const QUARTILES = ['Q1 (lowest)', 'Q2', 'Q3', 'Q4 (highest)']

export const CYCLE_COLS = [
  { key: 'pct_small_2008', year: '2008' },
  { key: 'pct_small_2010', year: '2010' },
  { key: 'pct_small_2012', year: '2012' },
  { key: 'pct_small_2014', year: '2014' },
  { key: 'pct_small_2016', year: '2016' },
  { key: 'pct_small_2018', year: '2018' },
  { key: 'pct_small_2020', year: '2020' },
  { key: 'pct_small_2022', year: '2022' },
]

const MEMBERS = membersRaw.map(m => {
  const clean = sanitizeRecord(m)
  const tweets = (topTweetsRaw[clean.handle_lower] ?? []).map(t => sanitizeRecord(t))
  return { ...clean, top_tweets: tweets }
})

// Precompute fixed axis domains so they don't shift when filters change.
function niceCeil(v) {
  if (v <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const norm = v / mag
  let nice
  if (norm <= 1.2) nice = 1.5
  else if (norm <= 2) nice = 2
  else if (norm <= 3) nice = 3
  else if (norm <= 5) nice = 5
  else nice = 10
  return nice * mag
}

export const X_AXIS_DOMAINS = (() => {
  const out = {}
  for (const opt of X_AXIS_OPTIONS) {
    const vals = MEMBERS.map(m => m[opt.key]).filter(v => v != null && Number.isFinite(v))
    if (vals.length === 0) { out[opt.key] = [0, 1]; continue }
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const lo = min < 0 ? -niceCeil(Math.abs(min)) : 0
    const hi = max > 0 ? niceCeil(max) : 0
    out[opt.key] = [lo, hi]
  }
  return out
})()

// Y axis is fixed at 0–80 (max small-donor % is ~73)
export const Y_DOMAIN = [0, 80]

export function useMembers() {
  return MEMBERS
}

export function useMember(handle) {
  return useMemo(
    () => MEMBERS.find(m => m.handle_lower === handle?.toLowerCase()),
    [handle]
  )
}

export function getCycleHistory(member) {
  return CYCLE_COLS
    .map(({ key, year }) => ({ year, value: member[key] }))
    .filter(d => d.value != null)
}
