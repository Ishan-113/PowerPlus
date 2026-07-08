import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

const TILES = [
  { to: '/data-monitor', label: 'Data Monitor', desc: 'Live plant-wide readings', accent: 'var(--accent-cyan)' },
  { to: '/trends', label: 'Trends', desc: 'Plot tags over time', accent: 'var(--accent-amber)' },
  { to: '/report', label: 'Report', desc: '15-min, daily & monthly exports', accent: 'var(--accent-blue)' },
  { to: '/consumption', label: 'Consumption', desc: 'Daily energy ledger', accent: 'var(--accent-red)' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getLive().then(groups => {
      const cumulative = groups.find(g => g.group === 'Cumulative (24 Hours)')
      setSummary(cumulative)
    }).catch(e => setError(e.message))
  }, [])

  const find = (name) => summary?.tags.find(t => t.tag_name === name)?.value

  return (
    <>
      <TopBar title="Dashboard" subtitle="PowerPlus Energy Monitoring" />
      <div style={{ padding: 28 }}>

        <div style={styles.summaryStrip}>
          <SummaryItem label="Grid Import" value={find('Grid Import kWh')} unit="kWh" color="var(--accent-red)" />
          <SummaryItem label="Grid Export" value={find('Grid Export kWh')} unit="kWh" color="var(--accent-cyan)" />
          <SummaryItem label="TG-2 Generation" value={find('30MW TG-2 kWh')} unit="kWh" color="var(--accent-amber)" />
          <SummaryItem label="TG-3 Generation" value={find('33MW TG-3 kWh')} unit="kWh" color="var(--accent-amber)" />
        </div>
        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>Could not reach API: {error}</p>}

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

function SummaryItem({ label, value, unit, color }) {
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span className="num" style={{ ...styles.summaryValue, color }}>
        {value !== undefined ? value.toLocaleString() : '—'} <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>{unit}</small>
      </span>
    </div>
  )
}

const styles = {
  summaryStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
    marginBottom: 28,
  },
  summaryItem: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 600,
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
