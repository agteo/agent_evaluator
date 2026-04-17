import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TracesPage from './pages/TracesPage'
import TraceDetailPage from './pages/TraceDetailPage'
import EvalsPage from './pages/EvalsPage'
import EvalConfigPage from './pages/EvalConfigPage'
import RunsPage from './pages/RunsPage'
import RunDetailPage from './pages/RunDetailPage'
import DatasetsPage from './pages/DatasetsPage'
import DatasetDetailPage from './pages/DatasetDetailPage'
import GuidePage from './pages/GuidePage'

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TracesPage />} />
          <Route path="/traces/:traceId" element={<TraceDetailPage />} />
          <Route path="/evals" element={<EvalsPage />} />
          <Route path="/evals/:configId" element={<EvalConfigPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:runId" element={<RunDetailPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/datasets/:datasetId" element={<DatasetDetailPage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Routes>
      </main>
    </div>
  )
}
