import { useState, useEffect } from 'react';

function calcElapsed(startTime) {
  if (!startTime) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, formatted: '00:00:00' };
  }

  let startStr = startTime;
  if (typeof startStr === 'string' && !/Z|[+-]\d{2}:\d{2}$/.test(startStr)) {
    startStr = `${String(startStr).replace(' ', 'T')}Z`;
  }

  const start = new Date(startStr).getTime();
  if (Number.isNaN(start)) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, formatted: '00:00:00' };
  }

  const diff = Math.max(0, Date.now() - start);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { hours, minutes, seconds, totalSeconds, formatted };
}

/** Count-up timer from session start (for open sessions). */
export function useElapsedTimer(startTime) {
  const [elapsed, setElapsed] = useState(() => calcElapsed(startTime));

  useEffect(() => {
    setElapsed(calcElapsed(startTime));
    const id = setInterval(() => setElapsed(calcElapsed(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return elapsed;
}
