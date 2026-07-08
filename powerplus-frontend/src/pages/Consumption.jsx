import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Consumption() {
  const [date, setDate] = useState(todayStr())
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [date])

  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await api.getConsumption(date)
      setRows(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const grouped = rows.reduce((acc, r) => {
    (acc[r.equipment_group] ||= []).push(r)
    return acc
  }, {})

  return (
    <>
      <TopBar title="Consumption" subtitle="Daily cumulative energy ledger" />
      <div style={{ padding: 28 }}>
        <div style={styles.dateRow}>
          <label style={styles.dateLabel}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.dateInput} />
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>}
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
        {!loading && !rows.length && !error && (
          <p style={{ color: 'var(--text-muted)' }}>No consumption data recorded for this date.</p>
        )}

        {Object.entries(grouped).map(([group, tags]) => (
          <section key={group} style={{ marginBottom: 24 }}>
            <div style={styles.groupLabel}>{group}</div>
            <div style={styles.panel}>
              {tags.map(t => (
                <div key={t.tag_id} style={styles.row}>
                  <span style={styles.tagName}>{t.tag_name}</span>
                  <span className="num" style={styles.value}>
                    {Number(t.value).toLocaleString()} <small style={styles.unit}>{t.unit}</small>
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
  dateRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 },
  dateLabel: { fontSize: 12, color: 'var(--text-muted)' },
  dateInput: {
    background: 'var(--bg-panel-raised)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: 13,
  },
  groupLabel: {
    display: 'inline-block', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
    color: 'var(--accent-amber)', background: 'var(--accent-amber-dim)', padding: '6px 14px',
    borderRadius: 999, marginBottom: 10, letterSpacing: '0.02em',
  },
  panel: {
    background: 'var(--bg-panel)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 18px', borderBottom: '1px solid var(--grid-line)',
  },
  tagName: { fontSize: 13.5, color: 'var(--text-secondary)' },
  value: { fontSize: 14.5, fontWeight: 500 },
  unit: { color: 'var(--text-muted)', fontSize: 11, marginLeft: 5 },
}
