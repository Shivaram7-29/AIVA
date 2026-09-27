import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

/* ============================================================================
 * PlacementAI — VEX Cinematic UI Primitives
 * Reusable dark glass components used across all internal pages.
 * Black/white/gray palette only. Inter font. Subtle motion.
 * ========================================================================== */

/* ── ErrorBanner — inline, dismissible, replaces alert() ─────────────────── */
export const ErrorBanner = ({
  message,
  onDismiss,
  onRetry,
  title = 'Something went wrong',
}) => {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      role="alert"
      className="rounded-xl p-4 flex items-start gap-3"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
      >
        <AlertCircle className="w-4 h-4 text-white/70" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white">{title}</p>
        <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/80 hover:text-white px-2.5 py-1 rounded-lg transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            <RefreshCw className="w-3 h-3" strokeWidth={2} />
            Try again
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
          style={{ background: 'transparent' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

/* ── PageHeader — consistent heading across pages ────────────────────────── */
export const PageHeader = ({ kicker, title, subtitle, actions }) => (
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 animate-page-enter">
    <div>
      {kicker && <span className="kicker">{kicker}</span>}
      <h1 className="text-[26px] md:text-[32px] font-normal tracking-[-0.03em] text-white mt-2 leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] text-white/40 mt-2 leading-relaxed max-w-[640px]">
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

/* ── LoadingState — centered minimal loader ──────────────────────────────── */
export const LoadingState = ({ message = 'Loading…', subMessage }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div
      className="w-12 h-12 rounded-full animate-spin"
      style={{
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: 'rgba(255,255,255,0.6)',
      }}
    />
    <div className="text-center">
      <p className="text-[14px] font-medium text-white">{message}</p>
      {subMessage && <p className="text-[12px] text-white/40 mt-1">{subMessage}</p>}
    </div>
  </div>
);

/* ── StatCard — dark glass stat with large typography ────────────────────── */
export const StatCard = ({ label, value, sublabel }) => (
  <div className="vex-card p-5">
    <p className="text-[32px] font-normal tracking-tight text-white leading-none">
      {value}
    </p>
    <p className="text-[12px] text-white/40 mt-2">{label}</p>
    {sublabel && <p className="text-[11px] text-white/30 mt-0.5">{sublabel}</p>}
  </div>
);

/* ── ScoreRing — monochrome circular progress ────────────────────────────── */
export const ScoreRing = ({ value, max = 100, size = 120, stroke = 6, label }) => {
  const pct = Math.max(0, Math.min(1, value / max));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-normal text-white leading-none">
            {Math.round(pct * 100)}
            {max === 100 && <span className="text-[0.55em] ml-0.5 text-white/40">%</span>}
          </span>
        </div>
      </div>
      {label && <span className="text-[12px] text-white/40">{label}</span>}
    </div>
  );
};

/* ── MiniScoreRing — small monochrome ring for job cards ──────────────────── */
export const MiniScoreRing = ({ value, size = 48, stroke = 4 }) => {
  const pct = Math.max(0, Math.min(1, value / 100));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - pct * circumference;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[12px] font-medium text-white leading-none">{value}</span>
      </div>
    </div>
  );
};

/* ── EmptyState — calm minimal ───────────────────────────────────────────── */
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="vex-card py-16 px-6 text-center">
    {Icon && (
      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Icon className="w-6 h-6 text-white/30" strokeWidth={1.6} />
      </div>
    )}
    <p className="text-[16px] font-medium text-white tracking-tight">{title}</p>
    {description && (
      <p className="text-[13px] text-white/40 mt-1.5 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ── Toggle — dark VEX style ─────────────────────────────────────────────── */
export const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    className="w-[44px] h-[26px] rounded-full relative transition-colors"
    style={{
      background: checked ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
    }}
  >
    <span
      className="absolute top-0.5 left-0.5 w-[22px] h-[22px] rounded-full transition-transform"
      style={{
        background: checked ? '#000000' : '#FFFFFF',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
      }}
    />
  </button>
);

export default {
  ErrorBanner,
  PageHeader,
  LoadingState,
  StatCard,
  ScoreRing,
  MiniScoreRing,
  EmptyState,
  Toggle,
};
