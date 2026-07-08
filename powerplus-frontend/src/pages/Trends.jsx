import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

const LINE_COLORS = ['#4FD1C5', '#F0A93D', '#E85C5C', '#5B8DEF', '#C084FC', '#34D399']

function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Trends() {
  const [allTags, setAllTags] = useState([])
  const [selected, setSelected] = useState([])
  const [filter, setFilter] = useState('')
  const [start, setStart] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() - 6); return toLocalInputValue(d)
  })
  const [end, setEnd] = useState(() => toLocalInputValue(new Date()))
  const [chartData, setChartData] = useState([])
  const [seriesNames, setSeriesNames] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getTags().then(setAllTags).catch(e => setError(e.message))
  }, [])

  const grouped = useMemo(() => {
    const g = {}
    allTags
      .filter(t => t.tag_name.toLowerCase().includes(filter.toLowerCase()))
      .forEach(t => { (g[t.equipment_group] ||= []).push(t) })
    return g
  }, [allTags, filter])

  function toggleTag(tagId) {
    setSelected(sel => sel.includes(tagId) ? sel.filter(id => id !== tagId) : [...sel, tagId])
  }

  async function plot() {
    if (!selected.length) { setError('Select at least one tag'); return }
    setError(null)
    try {
      const series = await api.getHistory(selected, start.replace('T', ' ') + ':00', end.replace('T', ' ') + ':00')
      const names = series.map(s => s.tag_name)
      setSeriesNames(names)

      const byTs = {}
      series.forEach(s => {
        s.points.forEach(p => {
          const ts = p.ts
          byTs[ts] ||= { ts }
          byTs[ts][s.tag_name] = Number(p.value)
        })
      })
      setChartData(Object.values(byTs).sort((a, b) => a.ts.localeCompare(b.ts)))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <TopBar title="Trends" subtitle="Plot any tag over a time range" />
      <div style={{ display: 'flex', gap: 24, padding: 28 }}>

        <aside style={styles.picker}>
          <input
            placeholder="Filter tags…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={styles.filterInput}
          />
          <div style={styles.pickerList}>
            {Object.entries(grouped).map(([group, tags]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={styles.pickerGroupLabel}>{group}</div>
                {tags.map(t => (
                  <label key={t.tag_id} style={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={selected.includes(t.tag_id)}
                      onChange={() => toggleTag(t.tag_id)}
                    />
                    {t.tag_name}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div style={styles.rangeRow}>
            <label style={styles.rangeLabel}>Start</label>
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={styles.dateInput} />
          </div>
          <div style={styles.rangeRow}>
            <label style={styles.rangeLabel}>End</label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={styles.dateInput} />
          </div>

          <button style={styles.plotBtn} onClick={plot}>Plot selected tags</button>
          {error && <p style={{ color: 'var(--accent-red)', fontSize: 12.5 }}>{error}</p>}
        </aside>

        <section style={styles.chartArea}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={480}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--grid-line)" strokeDasharray="3 3" />
                <XAxis dataKey="ts" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => v.slice(11, 16)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-soft)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {seriesNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={LINE_COLORS[i % LINE_COLORS.length]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={styles.emptyState}>Select tags on the left, set a time range, and click "Plot selected tags."</div>
          )}
        </section>
      </div>
    </>
  )
}

const styles = {
  picker: {
    width: 300,
    flexShrink: 0,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 640,
  },
  filterInput: {
    background: 'var(--bg-panel-raised)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '8px 10px',
    fontSize: 13,
    marginBottom: 10,
  },
  pickerList: {
    overflowY: 'auto',
    flex: 1,
    marginBottom: 12,
  },
  pickerGroupLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--accent-amber)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--text-secondary)',
    padding: '4px 0',
  },
  rangeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 10,
  },
  rangeLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  dateInput: {
    background: 'var(--bg-panel-raised)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    padding: '7px 8px',
    fontSize: 12.5,
  },
  plotBtn: {
    background: 'var(--accent-blue)',
    color: '#0B1620',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 0',
    fontWeight: 600,
    fontSize: 13.5,
  },
  chartArea: {
    flex: 1,
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: 20,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 480,
    color: 'var(--text-muted)',
    fontSize: 13.5,
    textAlign: 'center',
    padding: '0 60px',
  },
}
