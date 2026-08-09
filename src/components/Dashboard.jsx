import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, Mic, BarChart3, ArrowRight, Sparkles, TrendingUp, Bot, Briefcase } from 'lucide-react';

const cards = [
  {
    title: 'AI Job Search Agent',
    description: 'Upload your resume, let AI find matching jobs, and apply with AI-prepared applications. Full pipeline: Resume → Search → Match → Apply.',
    icon: Bot,
    link: '/dashboard/job-agent',
    gradient: 'from-indigo-600 to-blue-600',
    shadow: 'shadow-indigo-500/20',
    glow: 'group-hover:shadow-indigo-500/30',
    iconBg: 'bg-indigo-500/20',
    badge: 'NEW',
  },
  {
    title: 'Application Tracker',
    description: 'Track all your job applications, update statuses, and manage your job search pipeline from one dashboard.',
    icon: Briefcase,
    link: '/dashboard/applications',
    gradient: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/20',
    glow: 'group-hover:shadow-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
    badge: 'NEW',
  },
  {
    title: 'Upload Resume',
    description: 'Upload your PDF resume and get an AI-powered analysis with score, skill match, and actionable suggestions.',
    icon: FileText,
    link: '/dashboard/upload',
    gradient: 'from-purple-600 to-pink-600',
    shadow: 'shadow-purple-500/20',
    glow: 'group-hover:shadow-purple-500/30',
    iconBg: 'bg-purple-500/20',
  },
  {
    title: 'Start Interview',
    description: 'Practice with our AI interviewer. Choose HR, Technical, or Coding rounds with real-time feedback.',
    icon: Mic,
    link: '/dashboard/interview',
    gradient: 'from-cyan-600 to-blue-600',
    shadow: 'shadow-cyan-500/20',
    glow: 'group-hover:shadow-cyan-500/30',
    iconBg: 'bg-cyan-500/20',
  },
  {
    title: 'View Reports',
    description: 'Track your performance over time. View detailed analytics, scores, and improvement recommendations.',
    icon: BarChart3,
    link: '/dashboard/reports',
    gradient: 'from-amber-600 to-orange-600',
    shadow: 'shadow-amber-500/20',
    glow: 'group-hover:shadow-amber-500/30',
    iconBg: 'bg-amber-500/20',
  },
];

const stats = [
  { label: 'Resumes Analyzed', value: '0', icon: FileText, color: 'text-indigo-400' },
  { label: 'Interviews Taken', value: '0', icon: Mic, color: 'text-purple-400' },
  { label: 'Avg Score', value: '--', icon: TrendingUp, color: 'text-cyan-400' },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-white/5 backdrop-blur-lg border border-white/5 rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg bg-white/5`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Section Title */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
            onClick={() => navigate(card.link)}
            className={`group cursor-pointer bg-white/5 backdrop-blur-lg border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300 shadow-lg ${card.shadow} ${card.glow} hover:shadow-xl hover:-translate-y-1 relative`}
          >
            {/* Badge */}
            {card.badge && (
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">
                {card.badge}
              </span>
            )}

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl ${card.iconBg} flex items-center justify-center mb-5`}>
              <card.icon className="w-7 h-7 text-white" />
            </div>

            {/* Content */}
            <h4 className="text-lg font-semibold text-white mb-2">{card.title}</h4>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">{card.description}</p>

            {/* CTA */}
            <div className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
              Get Started
              <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motivational Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 border border-indigo-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4"
      >
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-white mb-1">🎯 Pro Tip</h4>
          <p className="text-sm text-gray-400">
            Start by using the AI Job Search Agent — upload your resume and let AI find, match, and help you apply 
            to the best jobs automatically. Your entire job search, powered by AI.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/job-agent')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all whitespace-nowrap shadow-lg shadow-indigo-500/20"
        >
          Start Job Search →
        </button>
      </motion.div>
    </div>
  );
};

export default Dashboard;
