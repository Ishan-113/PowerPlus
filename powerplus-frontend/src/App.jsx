import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataMonitor from './pages/DataMonitor.jsx'
import Trends from './pages/Trends.jsx'
import Report from './pages/Report.jsx'
import Consumption from './pages/Consumption.jsx'
import Ask from './pages/Ask.jsx'
import Download from './pages/Download.jsx'

export default function App() {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 'var(--sidebar-width)', flex: 1, minHeight: '100vh' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-monitor" element={<DataMonitor />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/report" element={<Report />} />
          <Route path="/consumption" element={<Consumption />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/download" element={<Download />} />
        </Routes>
      </main>
    </div>
  )
}
