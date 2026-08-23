import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import AptitudeTest from './components/AptitudeTest';
import CodingRound from './components/coding/CodingRound';
import AIInterview from './components/AIInterview';
import JobSearchAgent from './components/JobSearchAgent';
import ApplicationTracker from './components/ApplicationTracker';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard Routes (nested under DashboardLayout) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="job-agent" element={<JobSearchAgent />} />
          <Route path="applications" element={<ApplicationTracker />} />
          <Route path="aptitude" element={<AptitudeTest />} />
          <Route path="coding" element={<CodingRound />} />
          <Route path="interview" element={<AIInterview />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Routes>
    </Router>
  );
}

// Placeholder for pages not yet built
function ComingSoon({ title }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="text-5xl">🚧</div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-gray-500">This feature is coming in the next phase!</p>
      </div>
    </div>
  );
}

export default App;
