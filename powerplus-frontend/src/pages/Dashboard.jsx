import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

const TILES = [
  { to: '/data-monitor', label: 'Data Monitor', desc: 'Live plant-wide readings', accent: 'var(--accent-cyan)' },
  { to: '/trends', label: 'Trends', desc: 'Plot tags over time', accent: 'var(--accent-amber)' },
  { to: '/report', label: 'Report', desc: '15-min, daily & monthly exports', accent: 'var(--accent-blue)' },
  { to: '/consumption', label: 'Consumption', desc: 'Daily energy ledger', accent: 'var(--accent-red)' },
  { to: '/ask', label: 'Ask', desc: 'Plain-English questions', accent: 'var(--accent-cyan)' },
]

const KEY_METERS = [
  { tag_name: 'Grid Import kWh', label: 'Grid Import', color: 'var(--accent-red)' },
  { tag_name: 'Grid Export kWh', label: 'Grid Export', color: 'var(--accent-cyan)' },
  { tag_name: '30MW TG-2 kWh', label: 'TG-2 Generation', color: 'var(--accent-amber)' },
  { tag_name: '33MW TG-3 kWh', label: 'TG-3 Generation', color: 'var(--accent-amber)' },
]

const REFRESH_MS = 30000

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const groups = await api.getLive()
        if (!cancelled) {
          setSummary(groups.find(g => g.group === 'Cumulative (24 Hours)') || null)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const find = (name) => summary?.tags.find(t => t.tag_name === name)?.value

  return (
    <>
      <TopBar title="Dashboard" subtitle="PowerPlus Energy Monitoring" />
      <div style={{ padding: 28 }}>

        <div style={styles.summaryStrip}>
          {KEY_METERS.map(m => (
            <KeyMeterCard key={m.tag_name} label={m.label} value={find(m.tag_name)} unit="kWh" color={m.color} />
          ))}
        </div>
        {error && <p style={styles.error}>Could not reach API: {error}</p>}

        <div style={styles.grid}>
          {TILES.map(tile => (
            <button key={tile.to} style={styles.tile} onClick={() => navigate(tile.to)}>
              <span style={{ ...styles.tileBar, background: tile.accent }} />
              <span style={styles.tileLabel}>{tile.label}</span>
              <span style={styles.tileDesc}>{tile.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function KeyMeterCard({ label, value, unit, color }) {
  const hasValue = value !== null && value !== undefined
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span className="num" style={{ ...styles.summaryValue, color }}>
        {hasValue ? Number(value).toLocaleString('en-IN') : '—'}
        <small style={styles.summaryUnit}>{unit}</small>
      </span>
    </div>
  )
}

const styles = {
  summaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  summaryItem: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 600,
  },
  summaryUnit: {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginLeft: 5,
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: 13,
    marginBottom: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 18,
  },
  tile: {
    position: 'relative',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 22px 22px',
    textAlign: 'left',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    transition: 'transform 0.15s, background 0.15s',
  },
  tileBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
  },
  tileLabel: {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  },
  tileDesc: {
    display: 'block',
    fontSize: 13,
    color: 'var(--text-muted)',
  },
}
