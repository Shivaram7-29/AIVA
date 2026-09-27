import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

/* ----------------------------------------------------------------------------
 * PlacementAI — VEX-style Landing Page
 *
 * Fullscreen raw video background (no overlay, no gradient).
 * Liquid-glass navbar. Bottom-aligned hero content.
 * Character-by-character entrance animation. White typography.
 * Right-side glass tag. Black/white/gray palette only.
 *
 * The video is loaded from a remote CDN. If it fails (network
 * blocked, offline, etc.) the page falls back gracefully to a
 * solid black background — the page never breaks.
 * ------------------------------------------------------------------------- */

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

const HERO_HEADING = 'From preparation\nto placement.';
const HERO_SUBTITLE =
  'Search smarter. Prepare better. Apply with confidence — all powered by AI.';
const RIGHT_TAG = 'Search. Prepare. Apply.';

const navLinks = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Jobs', to: '/dashboard/job-agent' },
  { label: 'Applications', to: '/dashboard/applications' },
  { label: 'AI Interview', to: '/dashboard/interview' },
  { label: 'Aptitude', to: '/dashboard/aptitude' },
];

/* ── Character-by-character animation helpers ─────────────────
 * Each non-space char: opacity 0 → 1, translateX(-18px) → 0.
 * charDelay 30ms, initial delay 200ms, transition 500ms.
 * Spaces render as non-breaking spaces so they don't collapse.
 * ---------------------------------------------------------------- */
const CHAR_DELAY = 0.03; // 30ms
const INITIAL_DELAY = 0.2; // 200ms
const CHAR_DURATION = 0.5; // 500ms

const AnimatedHeading = ({ text, className }) => {
  const lines = useMemo(() => text.split('\n'), [text]);

  let charIndex = 0;
  return (
    <h1 className={className} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, lineIdx) => (
        <span key={lineIdx} className="block">
          {line.split('').map((ch, i) => {
            const isSpace = ch === ' ';
            const delay = INITIAL_DELAY + charIndex * CHAR_DELAY;
            charIndex += 1;
            return (
              <motion.span
                key={`${lineIdx}-${i}`}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: CHAR_DURATION,
                  delay,
                  ease: 'easeOut',
                }}
                className="inline-block"
                style={{ whiteSpace: 'pre' }}
                aria-hidden="true"
              >
                {isSpace ? '\u00A0' : ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // If the video never fires 'loadeddata' within 8s, mark as errored
    // so the fallback background takes over gracefully.
    const t = setTimeout(() => {
      if (!videoLoaded) setVideoError(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [videoLoaded]);

  const handleNavClick = (to) => {
    setMobileNavOpen(false);
    navigate(to);
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      {/* ── Video background (raw, no overlay) ─────────────────── */}
      {!videoError && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={HERO_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          aria-hidden="true"
        />
      )}
      {/* Fallback: solid black + very subtle vignette so text stays readable
          even when the video can't load. NO overlay over the video itself. */}
      {videoError && (
        <div
          className="absolute inset-0 bg-black"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 30% 80%, rgba(40,40,40,0.6) 0%, rgba(0,0,0,1) 70%)',
          }}
        />
      )}

      {/* ── Navbar (liquid-glass, floating) ───────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 px-6 md:px-12 lg:px-16 pt-6">
        <nav className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between">
          {/* Left — brand */}
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-semibold tracking-tight text-white"
          >
            PlacementAI
          </button>

          {/* Center — desktop nav */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => handleNavClick(l.to)}
                className="hover:text-white transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Right — Get Started + mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden md:inline-flex bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-white"
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 liquid-glass rounded-xl p-2 flex flex-col"
            >
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => handleNavClick(l.to)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 text-left"
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/login');
                }}
                className="mt-1 mx-1 mb-1 bg-white text-black px-6 py-2 rounded-lg text-sm font-medium text-center"
              >
                Get Started
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hero content — pushed to bottom ───────────────────── */}
      <div className="relative z-20 flex flex-col justify-end h-full pb-12 lg:pb-16 px-6 md:px-12 lg:px-16">
        <div className="lg:grid lg:grid-cols-2 lg:items-end lg:gap-12">
          {/* Left — main heading + subtitle + buttons */}
          <div>
            <AnimatedHeading
              text={HERO_HEADING}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal tracking-[-0.04em] text-white leading-[1.05]"
            />

            {/* Subheading — fades in around 800ms, duration 1000ms */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
              className="text-base md:text-lg text-gray-300 mb-5 mt-5 max-w-xl"
            >
              {HERO_SUBTITLE}
            </motion.p>

            {/* Buttons — fade in around 1200ms */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2, ease: 'easeOut' }}
              className="flex flex-wrap items-center gap-3"
            >
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
              >
                Explore Jobs
              </button>
            </motion.div>
          </div>

          {/* Right — glass tag, bottom-aligned (desktop) */}
          <div className="hidden lg:flex justify-end">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
              className="liquid-glass border border-white/20 px-6 py-3 rounded-xl"
            >
              <p className="text-lg md:text-xl lg:text-2xl font-light text-white">
                {RIGHT_TAG}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Mobile — right tag below main content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
          className="lg:hidden mt-6 inline-block"
        >
          <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl inline-block">
            <p className="text-lg md:text-xl font-light text-white">{RIGHT_TAG}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingPage;
