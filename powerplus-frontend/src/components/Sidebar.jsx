import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { isPackagedApp } from '../lib/isPackaged.js'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/data-monitor', label: 'Data Monitor', icon: PulseIcon },
  { to: '/trends', label: 'Trends', icon: TrendIcon },
  { to: '/report', label: 'Report', icon: ReportIcon },
  { to: '/consumption', label: 'Consumption', icon: ConsumptionIcon },
  { to: '/ask', label: 'Ask', icon: AskIcon },
  { to: '/download', label: 'Get the App', icon: DownloadIcon, browserOnly: true },
]

export default function Sidebar() {
  const [packaged, setPackaged] = useState(() => isPackagedApp())
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)')
    if (!mq?.addEventListener) return
    const onChange = () => setPackaged(isPackagedApp())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const items = NAV_ITEMS.filter(item => !(item.browserOnly && packaged))
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <span style={styles.brandMark}>⏻</span>
        <span style={styles.brandText}>Power<em style={{ color: 'var(--accent-amber)', fontStyle: 'normal' }}>Plus</em></span>
      </div>

      <nav style={styles.nav}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <div style={styles.statusRow}>
          <span style={styles.dot} />
          <span>SQL layer connected</span>
        </div>
      </div>
    </aside>
  )
}

function DashboardIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>)
}
function PulseIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12h4l2 7 4-14 3 10 2-3h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>)
}
function TrendIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-6 4 3 6-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>)
}
function ReportIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>)
}
function ConsumptionIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 3h13l3 4v14H4V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 10l-3 4-2-2-3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>)
}
function AskIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="17" r="0.9" fill="currentColor"/></svg>)
}
function DownloadIcon() {
  return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>)
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minHeight: '100vh',
    background: 'var(--bg-panel)',
    borderRight: '1px solid var(--border-soft)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  brand: {
    height: 'var(--topbar-height)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px',
    borderBottom: '1px solid var(--border-soft)',
  },
  brandMark: {
    color: 'var(--accent-cyan)',
    fontSize: 20,
  },
  brandText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    letterSpacing: '-0.01em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 12,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  navItemActive: {
    background: 'var(--accent-cyan-dim)',
    color: 'var(--accent-cyan)',
  },
  footer: {
    padding: 16,
    borderTop: '1px solid var(--border-soft)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--accent-cyan)',
    boxShadow: '0 0 0 3px var(--accent-cyan-dim)',
  },
}
