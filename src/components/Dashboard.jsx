import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Bot,
  Briefcase,
  ArrowRight,
  BookOpen,
  Clock,
} from 'lucide-react';


/* ----------------------------------------------------------------------------
 * PlacementAI — VEX-style Dashboard
 * Premium dark workspace. Greeting hero, large stat cards with
 * restrained typography, "Continue your journey" action cards,
 * recent activity timeline, single premium CTA.
 * ------------------------------------------------------------------------- */

const stats = [
  { label: 'Jobs Matched', value: '0', sublabel: 'From last search' },
  { label: 'Applications', value: '0', sublabel: 'In pipeline' },
  { label: 'Interview Readiness', value: '—', sublabel: 'Take a mock' },
  { label: 'Aptitude Score', value: '—', sublabel: 'Take a test' },
];


const journeyCards = [
  {
    title: 'Find Opportunities',
    description: 'Upload your resume and let AI search real job postings, ranked by match score against your profile.',
    icon: Bot,
    link: '/dashboard/job-agent',
  },
  {
    title: 'Track Applications',
    description: 'Save jobs you\'ve applied to, track status, and manage your placement pipeline in one place.',
    icon: Briefcase,
    link: '/dashboard/applications',
  },
  {
    title: 'Prepare for Interview',
    description: 'Practice with an AI interviewer that speaks questions aloud and scores your answers.',
    icon: Mic,
    link: '/dashboard/interview',
  },
  {
    title: 'Practice Aptitude',
    description: 'Take a campus placement aptitude test in the TCS NQT pattern — 20 MCQs.',
    icon: BookOpen,
    link: '/dashboard/aptitude',
  },
];


const Dashboard = () => {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-[1100px] mx-auto space-y-10">
      {/* Greeting Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="animate-page-enter"
      >
        <span className="kicker">PlacementAI</span>
        <h1 className="text-[32px] md:text-[44px] font-normal tracking-[-0.03em] text-white mt-2 leading-tight">
          {greeting}, Shiva.
        </h1>
        <p className="text-[15px] text-white/40 mt-2 max-w-[560px]">
          Your placement journey, at a glance.
        </p>
      </motion.div>

      {/* Stats — clean dark cards, large typography, small labels */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {stats.map((s) => (
          <div key={s.label} className="vex-card p-5">
            <p className="text-[32px] font-normal tracking-tight text-white leading-none">
              {s.value}
            </p>
            <p className="text-[12px] text-white/50 mt-2">{s.label}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{s.sublabel}</p>
          </div>
        ))}
      </motion.div>

      {/* Continue your journey */}
      <div>
        <h2 className="text-[18px] font-medium tracking-tight text-white mb-4">
          Continue your journey
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {journeyCards.map((c, i) => (
            <motion.button
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              onClick={() => navigate(c.link)}
              className="group text-left vex-card p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                >
                  <c.icon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-medium text-white tracking-tight">
                    {c.title}
                  </h3>
                  <p className="text-[13px] text-white/40 mt-1 leading-relaxed">
                    {c.description}
                  </p>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1"
                  strokeWidth={1.5}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-medium tracking-tight text-white">
            Recent activity
          </h2>
          <Clock className="w-4 h-4 text-white/30" strokeWidth={1.5} />
        </div>
        <div className="vex-card p-10 text-center">
          <div
            className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255, 255, 255, 0.04)' }}
          >
            <Clock className="w-5 h-5 text-white/30" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-medium text-white">No recent activity yet</p>
          <p className="text-[13px] text-white/40 mt-1.5 max-w-md mx-auto">
            Your placements journey will appear here as you use the platform.
          </p>
        </div>
      </div>

      {/* Recommended next step — single premium CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="liquid-glass rounded-2xl p-7 md:p-8"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1">
            <span className="kicker">Recommended</span>
            <h3 className="text-[22px] md:text-[26px] font-normal tracking-[-0.02em] text-white mt-2 leading-snug">
              Start with the AI Job Search Agent.
            </h3>
            <p className="text-[14px] text-white/50 mt-2 max-w-[520px] leading-relaxed">
              Upload your resume, let AI find matching jobs, and apply with
              AI-prepared applications. Your entire placement workflow, powered by AI.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/job-agent')}
            className="vex-btn-primary inline-flex items-center gap-2 flex-shrink-0"
          >
            Start now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
