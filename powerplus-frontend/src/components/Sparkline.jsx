export default function Sparkline({ points = [], width = 64, height = 22, color = 'var(--accent-cyan)' }) {
  if (!points.length) return <svg width={width} height={height} />

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1 || 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const last = points[points.length - 1]
  const lastX = width
  const lastY = height - ((last - min) / range) * height

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}
