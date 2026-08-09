import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText, BrainCircuit, Users, Target, ArrowRight, CheckCircle2 } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-gray-800/50 backdrop-blur-lg border border-gray-700/50 p-6 rounded-2xl hover:border-primary/50 transition-colors duration-300"
  >
    <div className="bg-primary/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
      <Icon className="text-primary w-6 h-6" />
    </div>
    <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full mix-blend-screen filter blur-[128px] opacity-50"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-screen filter blur-[128px] opacity-50"></div>

      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 relative z-10 flex justify-between items-center bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            PlacementAI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-bold text-gray-300 hover:text-white transition-colors">
            Login
          </button>
          <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-24 pb-32 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 mb-8"
        >
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-sm font-medium text-gray-300">AI Engine is successfully updated</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
        >
          Ace Your Job Search <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-secondary animate-gradient">
            With AI Precision
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Upload your resume, let AI find matching jobs, prepare your applications, 
          and track everything — all in one platform.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
        >
          <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transform hover:-translate-y-1">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 text-white font-bold text-lg transition-all flex items-center justify-center gap-2">
            Watch Demo
          </button>
        </motion.div>

        {/* Floating Dashboard Preview (Mockup) */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.5 }}
           className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10 h-full w-full"></div>
          <div className="rounded-xl border border-gray-700/50 bg-[#151b2b] p-4 shadow-2xl relative overflow-hidden">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            {/* Fake Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-20 opacity-80">
               <div className="h-32 bg-gray-800/50 rounded-lg border border-gray-700/30 flex p-4 flex-col justify-between">
                 <div className="w-1/2 h-4 bg-gray-700 rounded animate-pulse"></div>
                 <div className="w-full h-8 bg-primary/20 rounded"></div>
               </div>
               <div className="h-32 bg-gray-800/50 rounded-lg border border-gray-700/30 flex p-4 flex-col justify-between">
                 <div className="w-1/3 h-4 bg-gray-700 rounded animate-pulse"></div>
                 <div className="w-3/4 h-8 bg-secondary/20 rounded"></div>
               </div>
               <div className="h-32 bg-gray-800/50 rounded-lg border border-gray-700/30 flex p-4 flex-col justify-between">
                 <div className="w-2/3 h-4 bg-gray-700 rounded animate-pulse"></div>
                 <div className="w-full h-8 bg-green-500/20 rounded"></div>
               </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <span className="text-primary">succeed</span></h2>
          <p className="text-gray-400 max-w-2xl mx-auto">Our powerful AI modules guide you from perfecting your resume to mastering complex technical interviews.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={FileText}
            title="AI Job Search Agent"
            description="Upload your resume and our AI automatically searches, matches, and ranks real job postings. Get evidence-based match scores for every job."
            delay={0.1}
          />
          <FeatureCard 
            icon={Target}
            title="Smart Application Agent"
            description="AI prepares your application: maps resume to form fields, generates tailored cover letters, and creates custom answers. You review before submitting."
            delay={0.2}
          />
          <FeatureCard 
            icon={Users}
            title="Application Tracking"
            description="Track every application from Saved to Offer. Update statuses, review cover letters, and manage your entire job search pipeline in one place."
            delay={0.3}
          />
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-gray-800/50 py-12 relative z-10">
        <div className="container mx-auto px-6 text-center text-gray-500 flex flex-col md:flex-row justify-between items-center">
          <p>© 2026 PlacementAI. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
             <a href="#" className="hover:text-primary transition-colors">Privacy</a>
             <a href="#" className="hover:text-primary transition-colors">Terms</a>
             <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
