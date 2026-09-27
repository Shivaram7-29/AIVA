import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Globe,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * PlacementAI — VEX-style Login
 * Black backdrop, liquid-glass auth card, white typography, Inter.
 * Auth logic preserved exactly (fake auth → /dashboard).
 * ------------------------------------------------------------------------- */

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Fake authentication — simulate a short delay then navigate.
    // Preserved exactly as in the original project.
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen relative bg-black flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Subtle vignette so the glass card pops — no heavy gradients */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(20,20,20,1) 0%, rgba(0,0,0,1) 70%)',
        }}
      />

      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-[13px] text-gray-400 hover:text-white inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <span className="text-2xl font-semibold tracking-tight text-white">
            PlacementAI
          </span>
          <p className="text-[13px] text-gray-400 mt-1">
            From preparation to placement.
          </p>
        </div>

        {/* Liquid glass auth card */}
        <div className="liquid-glass rounded-2xl p-7">
          {/* Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1 mb-7 border border-white/10">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-[13px] font-medium transition-all ${
                isLogin
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-[13px] font-medium transition-all ${
                !isLogin
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[12px] font-medium text-gray-400 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[12px] font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-lg bg-white text-black font-medium text-[15px] transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-gray-200"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Login' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[11px] text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-[14px] hover:bg-white/10 flex items-center justify-center gap-2.5 transition-colors">
            <Globe className="w-4 h-4" />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-gray-400 text-[13px] mt-6">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-white hover:text-gray-300 font-medium transition-colors"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
