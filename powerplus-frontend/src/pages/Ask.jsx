import { useState } from 'react'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'

const EXAMPLES = [
  "What was Grid Import yesterday?",
  "Show SMS-4 Fur-1 kWh for the last 3 days",
  "What is SAF-2 consuming right now?",
  "Total consumption for SMS-2 furnaces today",
]

export default function Ask() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSql, setShowSql] = useState(false)
  const [history, setHistory] = useState([])

  async function submit(q) {
    const query = (q ?? question).trim()
    if (!query) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await api.ask(query)
      setResult(res)
      setHistory(h => [{ question: query, ...res }, ...h].slice(0, 10))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <TopBar title="Ask" subtitle="Ask a question in plain English — Phase 2" />
      <div style={{ padding: 28, maxWidth: 880 }}>

        <div style={styles.inputRow}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="e.g. What was Grid Import yesterday?"
            style={styles.input}
          />
          <button style={styles.askBtn} onClick={() => submit()} disabled={loading}>
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>

        <div style={styles.examples}>
          {EXAMPLES.map(ex => (
            <button key={ex} style={styles.exampleChip} onClick={() => { setQuestion(ex); submit(ex) }}>
              {ex}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'var(--accent-red)', fontSize: 13, marginTop: 16 }}>{error}</p>}

        {result && (
          <div style={styles.resultCard}>
            {result.error ? (
              <p style={{ color: 'var(--accent-red)' }}>{result.error}</p>
            ) : (
              <>
                <p style={styles.answerText}>{result.answer}</p>

                <button style={styles.sqlToggle} onClick={() => setShowSql(s => !s)}>
                  {showSql ? 'Hide SQL' : 'Show SQL used'}
                </button>
                {showSql && <pre className="num" style={styles.sqlBlock}>{result.sql}</pre>}

                {result.rows?.length > 0 && (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {Object.keys(result.rows[0]).map(k => <th key={k} style={styles.th}>{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, 50).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="num" style={styles.td}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {history.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <div style={styles.historyLabel}>Recent questions</div>
            {history.slice(1).map((h, i) => (
              <button key={i} style={styles.historyItem} onClick={() => { setQuestion(h.question); submit(h.question) }}>
                {h.question}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const styles = {
  inputRow: { display: 'flex', gap: 10 },
  input: {
    flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '13px 16px', fontSize: 14.5,
  },
  askBtn: {
    background: 'var(--accent-cyan)', color: '#0B1620', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '0 24px', fontWeight: 600, fontSize: 14,
  },
  examples: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  exampleChip: {
    background: 'transparent', border: '1px solid var(--border-soft)', color: 'var(--text-muted)',
    borderRadius: 999, padding: '6px 14px', fontSize: 12.5,
  },
  resultCard: {
    marginTop: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-lg)', padding: 22,
  },
  answerText: { fontSize: 16, lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 },
  sqlToggle: {
    marginTop: 14, background: 'transparent', border: 'none', color: 'var(--accent-amber)',
    fontSize: 12.5, padding: 0, cursor: 'pointer',
  },
  sqlBlock: {
    marginTop: 10, background: 'var(--bg-base)', border: '1px solid var(--grid-line)',
    borderRadius: 'var(--radius-sm)', padding: 14, fontSize: 12.5, color: 'var(--accent-cyan)',
    overflowX: 'auto', whiteSpace: 'pre-wrap',
  },
  tableWrap: { marginTop: 18, maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-sm)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11,
    textTransform: 'uppercase', borderBottom: '1px solid var(--border-soft)', position: 'sticky', top: 0, background: 'var(--bg-panel)',
  },
  td: { padding: '7px 12px', borderBottom: '1px solid var(--grid-line)', color: 'var(--text-secondary)' },
  historyLabel: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 },
  historyItem: {
    display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
    color: 'var(--text-secondary)', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--grid-line)',
  },
}
