import { useState } from 'react'

function Initials({ name, size }) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className="rounded-full bg-[var(--surface-2)] border border-border flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <span
        className="text-ink-muted font-medium"
        style={{ fontSize: Math.max(10, size * 0.38), letterSpacing: '0.5px' }}
      >
        {initials || '?'}
      </span>
    </div>
  )
}

export default function MemberPhoto({ bioguide, name, size = 48 }) {
  const [errored, setErrored] = useState(false)

  if (!bioguide || errored) {
    return <Initials name={name} size={size} />
  }

  return (
    <img
      src={`https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${bioguide}.jpg`}
      alt={name ?? 'Member photo'}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className="rounded-full object-cover object-top shrink-0 border border-border bg-[var(--surface-2)]"
      style={{ width: size, height: size }}
    />
  )
}
