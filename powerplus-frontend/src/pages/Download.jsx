import TopBar from '../components/TopBar.jsx'

const BUILDS = [
  {
    platform: 'Android',
    file: '/app.apk',
    filename: 'PowerPlus.apk',
    version: '1.0.0',
    size: '~842 KB',
    steps: [
      'Tap Download below on your phone.',
      'Open the file and allow “Install unknown apps” for your browser/Files when asked.',
      'Tap Install. Updates arrive automatically — no reinstall needed.',
    ],
  },
  {
    platform: 'Windows',
    file: '/app.msix',
    filename: 'PowerPlus.msix',
    version: '1.0.0',
    size: '~333 KB',
    steps: [
      'Download on your PC and double-click the file.',
      'If Windows warns about an untrusted publisher, install the test certificate once (right-click install.ps1 → Run with PowerShell).',
      'Find PowerPlus in the Start menu.',
    ],
  },
]

export default function Download() {
  return (
    <>
      <TopBar title="Get the App" subtitle="Native installers for phone and PC — same live data" />
      <div style={{ padding: 28, display: 'grid', gap: 20, maxWidth: 900 }}>
        {BUILDS.map(b => (
          <section key={b.platform} style={styles.card}>
            <div style={styles.cardHead}>
              <div>
                <div style={styles.platform}>{b.platform}</div>
                <div style={styles.meta}>v{b.version} · {b.size} · {b.filename}</div>
              </div>
              <a href={b.file} download={b.filename} style={styles.button}>
                Download
              </a>
            </div>
            <ol style={styles.steps}>
              {b.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>
        ))}
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Prefer no download? On any device open this site in Chrome/Edge → Install icon in the
          address bar (phone: ⋮ → Add to Home screen). Mac and tablets use that option.
        </p>
      </div>
    </>
  )
}

const styles = {
  card: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-lg)',
    padding: 22,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  platform: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 19,
  },
  meta: {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    background: 'var(--accent-amber)',
    color: '#0B1620',
    fontWeight: 700,
    fontSize: 14,
    padding: '10px 22px',
    borderRadius: 'var(--radius-md)',
    whiteSpace: 'nowrap',
  },
  steps: {
    margin: 0,
    paddingLeft: 20,
    color: 'var(--text-secondary)',
    fontSize: 14,
    display: 'grid',
    gap: 6,
  },
}
