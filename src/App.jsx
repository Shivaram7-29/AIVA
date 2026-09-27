import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import LandingPage from './components/LandingPage';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';

import AptitudeTest from './components/AptitudeTest';
import AIInterview from './components/AIInterview';
import JobSearchAgent from './components/JobSearchAgent';
import ApplicationTracker from './components/ApplicationTracker';
import Settings from './components/Settings';

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

          <Route path="job-agent" element={<JobSearchAgent />} />
          <Route path="applications" element={<ApplicationTracker />} />
          <Route path="aptitude" element={<AptitudeTest />} />
          <Route path="coding" element={<ComingSoon title="Coding Round" />} />
          <Route path="interview" element={<AIInterview />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

/* ── VEX-style "Coming Soon" placeholder ────────────────────────────────── */
function ComingSoon({ title }) {
  return (
    <div className="max-w-[760px] mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-page-enter">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="liquid-glass w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
      >
        <span className="text-[28px] font-light text-white">{title.charAt(0)}</span>
      </motion.div>
      <span className="kicker">Coming soon</span>
      <h2 className="text-[28px] md:text-[32px] font-normal tracking-[-0.03em] text-white mt-2">
        {title}
      </h2>
      <p className="text-[14px] text-white/40 mt-3 max-w-md leading-relaxed">
        Something useful is being built. We're crafting this module with the
        same care as the rest of PlacementAI — check back soon.
      </p>
      <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-white/30">
        <span>In the meantime, explore</span>
        <span className="text-white font-medium">Job Search</span>
        <ArrowRight className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export default App;
