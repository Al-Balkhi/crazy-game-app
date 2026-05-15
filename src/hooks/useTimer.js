import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for a live countdown timer.
 * @param {string|Date} endTime  – when the session ends
 * @param {function}    onExpire – callback fired once when the timer hits 0
 * @returns {{ hours, minutes, seconds, totalSeconds, isExpired, formatted }}
 */
export function useTimer(endTime, onExpire) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endTime));
  const expiredRef = useRef(false);
  const intervalRef = useRef(null);

  const stableOnExpire = useCallback(() => {
    if (onExpire) onExpire();
  }, [onExpire]);

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(calcRemaining(endTime));

    intervalRef.current = setInterval(() => {
      const r = calcRemaining(endTime);
      setRemaining(r);

      if (r.totalSeconds <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        stableOnExpire();
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [endTime, stableOnExpire]);

  return remaining;
}

function calcRemaining(endTime) {
  if (!endTime) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true, formatted: '00:00:00' };

  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const totalSeconds = Math.floor(diff / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { hours, minutes, seconds, totalSeconds, isExpired: totalSeconds <= 0, formatted };
}
