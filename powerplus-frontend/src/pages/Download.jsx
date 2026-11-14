import TopBar from '../components/TopBar.jsx'

const WINDOWS_URL =
  'https://github.com/Ishan-113/PowerPlus/releases/download/v1.0.0-windows/PowerPlus-Windows.zip'

const BUILDS = [
  {
    platform: 'Android',
    file: '/app.apk',
    filename: 'PowerPlus.apk',
    version: '1.0.0',
    size: '~842 KB',
    steps: [
      'Tap Download below on your phone.',
      'Open the file and allow "Install unknown apps" for your browser/Files when asked.',
      'Tap Install. If it says "App not installed", uninstall any old PowerPlus app first, then retry.',
      'Updates arrive automatically — no reinstall needed.',
    ],
  },
  {
    platform: 'Windows (PC / laptop)',
    file: WINDOWS_URL,
    filename: 'PowerPlus-Windows.zip',
    version: '1.0.0',
    size: '~139 MB (portable)',
    steps: [
      'Click Download below — the zip comes from GitHub Releases.',
      'Right-click the zip → Extract All (default location is fine).',
      'Open the extracted PowerPlus folder and double-click PowerPlus.exe.',
      'If Windows SmartScreen shows "Windows protected your PC": click More info → Run anyway.',
      'The dashboard opens in its own window — pin it to the taskbar for quick access.',
    ],
  },
]

export default function Download() {
  return (
    <>
      <TopBar title="Get the App" subtitle="Installers for phone and PC — same live data" />
      <div style={{ padding: 28, display: 'grid', gap: 20, maxWidth: 900 }}>
        {BUILDS.map(b => (
          <section key={b.platform} style={styles.card}>
            <div style={styles.cardHead}>
              <div>
                <div style={styles.platform}>{b.platform}</div>
                <div style={styles.meta}>v{b.version} · {b.size} · {b.filename}</div>
              </div>
              {b.file && (
                <a href={b.file} download={b.filename} style={styles.button}>
                  Download
                </a>
              )}
            </div>
            <ol style={styles.steps}>
              {b.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>
        ))}
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          The apps load this site live, so every update reaches installed devices automatically.
        </p>
      </div>
    </>
  )
}

const styles = {
  card: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)',
    padding: 20,
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  platform: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
  },
  meta: {
    color: 'var(--text-muted)',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    background: 'var(--accent-cyan-dim)',
    color: 'var(--accent-cyan)',
    border: '1px solid var(--accent-cyan)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 22px',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  steps: {
    margin: 0,
    paddingLeft: 20,
    display: 'grid',
    gap: 6,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
}
