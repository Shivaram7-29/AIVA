import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

// Ticks locally every second for a smooth display, but re-syncs against
// the backend's /coding/status every 20s so the server (not the browser)
// remains the source of truth for when the round actually ends.
const CodingTimer = ({ secondsRemaining, onResync, onExpire }) => {
  const [display, setDisplay] = useState(secondsRemaining);
  const expiredRef = useRef(false);

  useEffect(() => {
    setDisplay(secondsRemaining);
    expiredRef.current = false;
  }, [secondsRemaining]);

  useEffect(() => {
    const tick = setInterval(() => {
      setDisplay((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpire?.();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [onExpire]);

  useEffect(() => {
    const resync = setInterval(() => onResync?.(), 20000);
    return () => clearInterval(resync);
  }, [onResync]);

  const mins = Math.floor(display / 60);
  const secs = display % 60;
  const isLow = display <= 120;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
        isLow ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'
      }`}
    >
      <Clock className={`w-4 h-4 ${isLow ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
      <span className={`font-mono font-bold text-sm ${isLow ? 'text-red-400' : 'text-white'}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
};

export default CodingTimer;
