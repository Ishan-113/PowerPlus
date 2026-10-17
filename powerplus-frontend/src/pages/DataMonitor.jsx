import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import Sparkline from '../components/Sparkline.jsx'
import { api } from '../api.js'

function localTs(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function DataMonitor() {
  const [groups, setGroups] = useState([])
  const [history, setHistory] = useState({}) // tag_id -> [values]
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const liveGroups = await api.getLive()
        if (cancelled) return
        setGroups(liveGroups)

        const allIds = liveGroups.flatMap(g => g.tags.map(t => t.tag_id))
        if (allIds.length) {
          const end = new Date()
          const start = new Date(end.getTime() - 4 * 60 * 60 * 1000) // last 4 hours
          const series = await api.getHistory(allIds, localTs(start), localTs(end))
          if (cancelled) return
          const map = {}
          series.forEach(s => { map[s.tag_id] = s.points.map(p => Number(p.value)) })
          setHistory(map)
        }
        setLoading(false)
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false) }
      }
    }

    load()
    const id = setInterval(load, 30000) // refresh every 30s
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <>
      <TopBar title="Data Monitor" subtitle="Live readings across all sections" />
      <div style={{ padding: 28 }}>
        {error && <p style={{ color: 'var(--accent-red)' }}>Could not reach API: {error}</p>}
        {loading && !error && <p style={{ color: 'var(--text-muted)' }}>Loading live values…</p>}

        {groups.map(group => (
          <section key={group.group} style={{ marginBottom: 24 }}>
            <div style={styles.groupLabel}>{group.group}</div>
            <div style={styles.panel}>
              {group.tags.map(tag => (
                <div key={tag.tag_id} style={styles.row}>
                  <span style={styles.tagName}>{tag.tag_name}</span>
                  <Sparkline points={history[tag.tag_id] || []} />
                  <span className="num" style={styles.value}>
                    {tag.value !== null ? Number(tag.value).toLocaleString() : '—'}
                    <small style={styles.unit}>{tag.unit}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

const styles = {
  groupLabel: {
    display: 'inline-block',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-amber)',
    background: 'var(--accent-amber-dim)',
    padding: '6px 14px',
    borderRadius: 999,
    marginBottom: 10,
    letterSpacing: '0.02em',
  },
  panel: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 120px',
    alignItems: 'center',
    gap: 20,
    padding: '10px 18px',
    borderBottom: '1px solid var(--grid-line)',
  },
  tagName: {
    fontSize: 13.5,
    color: 'var(--text-secondary)',
  },
  value: {
    fontSize: 14.5,
    fontWeight: 500,
    textAlign: 'right',
  },
  unit: {
    color: 'var(--text-muted)',
    fontSize: 11,
    marginLeft: 5,
  },
}
