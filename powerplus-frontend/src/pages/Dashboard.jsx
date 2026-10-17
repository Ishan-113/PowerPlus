import { useEffect, useMemo, useState } from 'react'
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

const HIGHLIGHT_TAGS = [
  { tag_name: 'Grid Import kWh', label: 'Grid Import' },
  { tag_name: 'Grid Export kWh', label: 'Grid Export' },
  { tag_name: '30MW TG-2 kWh', label: 'TG-2 Generation' },
  { tag_name: '33MW TG-3 kWh', label: 'TG-3 Generation' },
]

const REFRESH_MS = 30000
const STALE_MS = 24 * 60 * 60 * 1000

function parseTs(ts) {
  if (!ts) return null
  const d = new Date(String(ts).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

function timeAgo(ts) {
  const d = parseTs(ts)
  if (!d) return null
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function isStale(ts) {
  const d = parseTs(ts)
  return d ? Date.now() - d.getTime() > STALE_MS : false
}

function displayLabel(tag) {
  const suffix = ` ${tag.unit}`
  return tag.tag_name.toLowerCase().endsWith(suffix.toLowerCase())
    ? tag.tag_name.slice(0, -suffix.length)
    : tag.tag_name
}

function fmtDay(d) {
  const parsed = parseTs(d)
  return parsed ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : null
}

function fmtDayFull(d) {
  const parsed = parseTs(d)
  return parsed
    ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : String(d ?? '')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [dailyByTag, setDailyByTag] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await api.getLive()
        const allTags = data.flatMap(g => g.tags)
        const highlightTags = HIGHLIGHT_TAGS
          .map(h => {
            const t = allTags.find(x => x.tag_name === h.tag_name)
            return t ? { ...t, label: h.label } : null
          })
          .filter(Boolean)

        let daily = {}
        const ids = highlightTags.map(t => t.tag_id)
        if (ids.length) {
          try {
            const rows = await api.getReport('daily', '2000-01-01', '2099-12-31', ids)
            for (const r of rows) (daily[r.tag_id] ||= []).push(r)
            for (const key of Object.keys(daily)) {
              daily[key].sort((a, b) => String(b.period).localeCompare(String(a.period)))
            }
          } catch {
            daily = {}
          }
        }

        if (!cancelled) {
          setGroups(data)
          setHighlights(highlightTags)
          setDailyByTag(daily)
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

  const summary = useMemo(() => {
    if (!groups) return null
    return groups.find(g => g.group === 'Cumulative (24 Hours)')
      || groups.find(g => /cumulative/i.test(g.group))
      || null
  }, [groups])

  return (
    <>
      <TopBar title="Dashboard" subtitle="PowerPlus Energy Monitoring" />
      <div style={{ padding: 28 }}>

        {error && <p style={styles.error}>Could not reach API: {error}</p>}
        {!groups && !error && <p style={styles.muted}>Loading live values…</p>}
        {groups && !summary && (
          <p style={styles.error}>
            No cumulative summary group found in tag_master — check the equipment_group values.
          </p>
        )}

        {highlights.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <div style={styles.sectionHead}>
              <span style={styles.sectionLabel}>Key meters</span>
              <span style={styles.sectionMeta}>
                live value + every daily total stored in the database
              </span>
            </div>
            <div style={styles.highlightGrid}>
              {highlights.map(tag => (
                <HighlightCard key={tag.tag_id} tag={tag} daily={dailyByTag[tag.tag_id] || []} />
              ))}
            </div>
          </section>
        )}

        {summary && (
          <section style={{ marginBottom: 28 }}>
            <div style={styles.sectionHead}>
              <span style={styles.sectionLabel}>{summary.group}</span>
              <span style={styles.sectionMeta}>
                {summary.tags.length} meters · live value + latest daily total · refreshes every {REFRESH_MS / 1000}s
              </span>
            </div>
            <div style={styles.summaryGrid}>
              {summary.tags.map(tag => (
                <SummaryItem key={tag.tag_id} tag={tag} />
              ))}
            </div>
          </section>
        )}

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

function SummaryItem({ tag }) {
  const hasValue = tag.value !== null && tag.value !== undefined
  const hasDay = tag.day_value !== null && tag.day_value !== undefined
  const updated = timeAgo(tag.last_updated)
  const dayLabel = hasDay ? fmtDay(tag.day_date) : null
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel} title={tag.tag_name}>{displayLabel(tag)}</span>
      <span className="num" style={styles.summaryValue}>
        {hasValue ? Number(tag.value).toLocaleString('en-IN') : '—'}
        <small style={styles.summaryUnit}>{tag.unit}</small>
      </span>
      {updated && (
        <span style={{ ...styles.summaryTime, ...(isStale(tag.last_updated) ? styles.summaryTimeStale : {}) }}>
          {updated}
        </span>
      )}
      {hasDay && (
        <span style={styles.summaryDay}>
          <span style={styles.summaryDayLabel}>{dayLabel ? `${dayLabel} total` : 'day total'}</span>
          <span className="num">{Number(tag.day_value).toLocaleString('en-IN')} {tag.unit}</span>
        </span>
      )}
    </div>
  )
}

function HighlightCard({ tag, daily }) {
  const hasValue = tag.value !== null && tag.value !== undefined
  const updated = timeAgo(tag.last_updated)
  return (
    <div style={styles.highlightCard}>
      <span style={styles.highlightLabel}>{tag.label}</span>
      <span className="num" style={styles.highlightValue}>
        {hasValue ? Number(tag.value).toLocaleString('en-IN') : '—'}
        <small style={styles.summaryUnit}>{tag.unit}</small>
      </span>
      {updated && (
        <span style={{ ...styles.summaryTime, ...(isStale(tag.last_updated) ? styles.summaryTimeStale : {}) }}>
          {updated}
        </span>
      )}
      <div style={styles.dailyList}>
        {daily.length ? daily.map(r => (
          <div key={r.period} style={styles.dailyRow}>
            <span style={styles.dailyDate}>{fmtDayFull(r.period)}</span>
            <span
              className="num"
              style={{ ...styles.dailyValue, ...(r.source === 'simulated' ? styles.dailyValueSim : {}) }}
            >
              {Number(r.value).toLocaleString('en-IN')}
              {r.source === 'simulated' && <small> sim</small>}
            </span>
          </div>
        )) : (
          <span style={styles.dailyEmpty}>No stored daily totals</span>
        )}
      </div>
    </div>
  )
}

const styles = {
  sectionHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sectionLabel: {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--accent-amber)',
    background: 'var(--accent-amber-dim)',
    padding: '6px 14px',
    borderRadius: 999,
    letterSpacing: '0.02em',
  },
  sectionMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: 12,
  },
  highlightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  highlightCard: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  highlightLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  highlightValue: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  dailyList: {
    marginTop: 8,
    borderTop: '1px solid var(--border-soft)',
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxHeight: 168,
    overflowY: 'auto',
  },
  dailyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 11,
  },
  dailyDate: {
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  dailyValue: {
    color: 'var(--text-secondary)',
  },
  dailyValueSim: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  dailyEmpty: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  summaryItem: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  summaryUnit: {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginLeft: 5,
  },
  summaryTime: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  summaryTimeStale: {
    color: 'var(--accent-amber)',
  },
  summaryDay: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 11,
    color: 'var(--text-secondary)',
    borderTop: '1px solid var(--border-soft)',
    paddingTop: 5,
    marginTop: 3,
  },
  summaryDayLabel: {
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: 13,
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: 13,
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
