import { useEffect, useState } from 'react'

export default function TopBar({ title, subtitle }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false })
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <header style={styles.bar}>
      <div>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      <div style={styles.clockBlock}>
        <span className="num" style={styles.clock}>{timeStr}</span>
        <span style={styles.date}>{dateStr}</span>
      </div>
    </header>
  )
}

const styles = {
  bar: {
    height: 'var(--topbar-height)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    borderBottom: '1px solid var(--border-soft)',
    position: 'sticky',
    top: 0,
    background: 'rgba(11,22,32,0.85)',
    backdropFilter: 'blur(6px)',
    zIndex: 10,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 19,
    fontWeight: 600,
    margin: 0,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: 12.5,
    color: 'var(--text-muted)',
    margin: '2px 0 0',
  },
  clockBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  clock: {
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--accent-amber)',
  },
  date: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
  },
}
