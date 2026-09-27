import React, { useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

// ============================================================
// REALISTIC & STABLE AI INTERVIEWER
// Uses a single high-quality image. No lip-sync distortion.
// Simulates life entirely through subtle lighting and glowing.
// ============================================================

const FALLBACK_INTERVIEWERS = {
  male: { name: 'Arjun Mehta', title: 'Senior Interviewer', image: '/real-interviewer.png' },
  female: { name: 'Maya Iyer', title: 'Senior Interviewer', image: '/interviewer-listening.png' },
};

export default function InteractiveAvatar({ gender = 'male', isSpeaking, isListening }) {
  const containerRef = useRef(null);
  const interviewer = FALLBACK_INTERVIEWERS[gender] || FALLBACK_INTERVIEWERS.male;

  // ─── Stable Lighting & Motion Variants ──────────────────────
  // STRICT RULES: NO x/y/translate. NO fake lip sync. NO distortion.
  const imageVariants = {
    idle: {
      scale: [1, 1.005, 1], // Slow breathing
      filter: 'brightness(1) contrast(1)',
      transition: { 
        scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' } 
      }
    },
    speaking: {
      scale: [1, 1.005, 1], // match breathing
      filter: 'brightness(1.08) contrast(1.02)', // Brightness shift
      transition: { 
        scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        filter: { duration: 0.5, ease: 'easeInOut' }
      }
    },
    listening: {
      scale: [1, 1.002, 1], // Very minimal breathing
      filter: 'brightness(0.9) contrast(0.98)', // Slight dimming
      transition: { 
        scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        filter: { duration: 0.8, ease: 'easeInOut' }
      }
    }
  };

  const glowVariants = {
    idle: { opacity: 0 },
    speaking: { opacity: 1, transition: { duration: 0.8 } },
    listening: { opacity: 0, transition: { duration: 0.5 } }
  };

  const currentVariant = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  return (
    <div
      ref={containerRef}
      className="interviewer-avatar-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden', // Strictly prevents overflow/cropping
        borderRadius: '16px',
        background: '#0a0c18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ─── MAIN AVATAR WRAPPER ─────────────────────────── */}
      <Motion.div
        variants={imageVariants}
        initial="idle"
        animate={currentVariant}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformOrigin: '50% 50%',
        }}
      >
        {/* The Base Image */}
        <div style={{
          position: 'absolute',
          inset: 0,
           backgroundImage: `url(${interviewer.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1,
        }} />
      </Motion.div>

      {/* ─── Speaking Glow Overlay ──────────────────────────────── */}
      <Motion.div
        variants={glowVariants}
        initial="idle"
        animate={currentVariant}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Speaking Pulse Ring ──────────────────────────────── */}
      <AnimatePresence>
        {isSpeaking && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '16px',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <Motion.div
              style={{
                position: 'absolute',
                inset: '-4px',
                border: '2px solid rgba(99, 102, 241, 0.15)',
                borderRadius: '20px',
              }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
                scale: [1, 1.005, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ─── Name Badge (like a video call) ──────────────── */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 30,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      >
         <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>{interviewer.name}</span>
         <span style={{ color: '#9ca3af', fontSize: '12px' }}>{interviewer.title}</span>
      </div>

      {/* ─── Removed Audio Waveform Indicator to prevent lip-movement perception ─── */}
    </div>
  );
}