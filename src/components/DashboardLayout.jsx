import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Code,
  Mic,
  Settings,
  LogOut,
  Menu,
  X,
  Bot,
  Briefcase,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * PlacementAI — VEX-style Application Shell
 * Dark floating glass sidebar, white nav text, active state = subtle
 * white/glass treatment. Mobile drawer with smooth open/close.
 * All routes and navigation behavior preserved.
 * ------------------------------------------------------------------------- */

const sidebarLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/job-agent', icon: Bot, label: 'Job Search' },
  { to: '/dashboard/applications', icon: Briefcase, label: 'Applications' },

  { to: '/dashboard/aptitude', icon: BookOpen, label: 'Aptitude Test' },
  { to: '/dashboard/coding', icon: Code, label: 'Coding Round' },
  { to: '/dashboard/interview', icon: Mic, label: 'AI Interview' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => navigate('/');

  return (
    <div className="min-h-screen flex" style={{ background: '#080808' }}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'rgba(11, 11, 11, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 h-16 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-xl font-semibold tracking-tight text-white">
            PlacementAI
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-white/50 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider px-3 mb-2 mt-1">
            Workspace
          </p>
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(255, 255, 255, 0.08)' }
                  : {}
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute left-0 w-[2px] h-5 rounded-full bg-white"
                      style={{ marginLeft: '-12px' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <link.icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white transition-colors"
            style={{ background: 'transparent' }}
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 px-6 h-16 flex items-center justify-between"
          style={{
            background: 'rgba(8, 8, 8, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white p-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-[14px] font-medium text-white leading-tight">
                Welcome back.
              </h2>
              <p className="text-[12px] text-white/40">Your AI-powered placement workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-medium text-white leading-tight">Demo User</p>
              <p className="text-[11px] text-white/40">demo@placementai.com</p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-[12px]"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              DU
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
