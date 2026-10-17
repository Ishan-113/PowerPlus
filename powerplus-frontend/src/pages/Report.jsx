import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

const TABS = [
  { key: '15min', label: '15 Minutes' },
  { key: 'hourly', label: 'Hourly' },
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
]

function pad(n) { return String(n).padStart(2, '0') }

function fmtLocal(d, withTime) {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : date
}

function defaultRange(granularity) {
  const end = new Date()
  const start = new Date()
  if (granularity === '15min') start.setHours(start.getHours() - 6)
  else if (granularity === 'hourly') start.setDate(start.getDate() - 1)
  else if (granularity === 'daily') start.setDate(start.getDate() - 7)
  else { start.setMonth(start.getMonth() - 6); start.setDate(1) }
  const withTime = granularity === '15min' || granularity === 'hourly'
  return { start: fmtLocal(start, withTime), end: fmtLocal(end, withTime) }
}

export default function Report() {
  const [granularity, setGranularity] = useState('15min')
  const [range, setRange] = useState(defaultRange('15min'))
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function switchTab(key) {
    setGranularity(key)
    setRange(defaultRange(key))
    setRows([])
  }

  async function runReport() {
    setLoading(true); setError(null)
    try {
      const data = await api.getReport(granularity, range.start, range.end)
      setRows(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!rows.length) return
    const header = 'tag_name,unit,period,value\n'
    const body = rows.map(r => `"${r.tag_name}",${r.unit},${r.period},${r.value}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `powerplus_report_${granularity}_${range.start}_${range.end}.csv`.replace(/[: ]/g, '-')
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <TopBar title="Report" subtitle="Export historical readings" />
      <div style={{ padding: 28 }}>

        <div style={styles.tabRow}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{ ...styles.tab, ...(granularity === t.key ? styles.tabActive : {}) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.controls}>
          <div style={styles.rangeField}>
            <label style={styles.rangeLabel}>Start</label>
            <input value={range.start} onChange={e => setRange(r => ({ ...r, start: e.target.value }))} style={styles.textInput} />
          </div>
          <div style={styles.rangeField}>
            <label style={styles.rangeLabel}>End</label>
            <input value={range.end} onChange={e => setRange(r => ({ ...r, end: e.target.value }))} style={styles.textInput} />
          </div>
          <button style={styles.runBtn} onClick={runReport} disabled={loading}>{loading ? 'Loading…' : 'Run report'}</button>
          <button style={styles.exportBtn} onClick={exportCsv} disabled={!rows.length}>Download CSV</button>
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</p>}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tag</th>
                <th style={styles.th}>Period</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Value</th>
                <th style={styles.th}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}>{r.tag_name}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{String(r.period).replace('T', ' ')}</td>
                  <td className="num" style={{ ...styles.td, textAlign: 'right' }}>{Number(r.value).toLocaleString()}</td>
                  <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{r.unit}</td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>Run a report to see data here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

const styles = {
  tabRow: { display: 'flex', gap: 6, marginBottom: 18 },
  tab: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    color: 'var(--text-secondary)',
    padding: '8px 18px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
  },
  tabActive: {
    background: 'var(--accent-cyan-dim)',
    color: 'var(--accent-cyan)',
    borderColor: 'var(--accent-cyan)',
  },
  controls: { display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  rangeField: { display: 'flex', flexDirection: 'column', gap: 4 },
  rangeLabel: { fontSize: 11, color: 'var(--text-muted)' },
  textInput: {
    background: 'var(--bg-panel-raised)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    minWidth: 180,
  },
  runBtn: {
    background: 'var(--accent-blue)', color: '#0B1620', border: 'none',
    borderRadius: 'var(--radius-sm)', padding: '9px 18px', fontWeight: 600, fontSize: 13.5,
  },
  exportBtn: {
    background: 'transparent', color: 'var(--accent-amber)', border: '1px solid var(--accent-amber)',
    borderRadius: 'var(--radius-sm)', padding: '9px 18px', fontWeight: 600, fontSize: 13.5,
  },
  tableWrap: {
    background: 'var(--bg-panel)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 520, overflowY: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left', padding: '10px 16px', color: 'var(--text-muted)', fontSize: 11.5,
    textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid var(--border-soft)',
    position: 'sticky', top: 0, background: 'var(--bg-panel)',
  },
  td: { padding: '9px 16px', borderBottom: '1px solid var(--grid-line)', color: 'var(--text-secondary)' },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 12.5 },
}
