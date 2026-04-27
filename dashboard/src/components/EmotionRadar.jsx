import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import { PARTY_COLOR } from '../hooks/useMembers'

const EMOTIONS = [
  { key: 'avg_anger',   label: 'Anger' },
  { key: 'avg_fear',    label: 'Fear' },
  { key: 'avg_disgust', label: 'Disgust' },
  { key: 'avg_sadness', label: 'Sadness' },
  { key: 'avg_joy',     label: 'Joy' },
]

export default function EmotionRadar({ member }) {
  const color = PARTY_COLOR[member.party_code] ?? '#888'

  const data = EMOTIONS.map(({ key, label }) => ({
    emotion: label,
    value: member[key] ?? 0,
  }))

  const sortedEmotions = [...EMOTIONS].sort(
    (a, b) => (member[b.key] ?? 0) - (member[a.key] ?? 0)
  )

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="emotion"
            tick={{ fill: 'var(--ink-muted)', fontSize: 12, fontFamily: 'DM Sans' }}
          />
          <Radar
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.22}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="flex flex-col gap-2 mt-4">
        {sortedEmotions.map(({ key, label }) => {
          const val = member[key] ?? 0
          return (
            <div key={key} className="flex items-center gap-2.5">
              <span className="w-16 text-xs text-ink-muted text-right">{label}</span>
              <div className="flex-1 h-1.5 bg-border rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${(val * 100).toFixed(1)}%`, background: color, opacity: 0.85 }}
                />
              </div>
              <span className="w-12 text-[11px] mono text-ink-muted">
                {(val * 100).toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
