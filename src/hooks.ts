import { useEffect, useState } from 'react';
import type { Schedule, Settings } from './types';

export function useSettings(): Settings | null {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    window.api.getSettings().then(setS);
    return window.api.on<Settings>('settings:changed', setS);
  }, []);
  return s;
}

export function useSchedule() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    window.api.getSchedule().then(setSchedule);
    const a = window.api.on<Schedule | null>('schedule:update', (s) => {
      setSchedule(s);
      setError(false);
    });
    const b = window.api.on('schedule:error', () => setError(true));
    return () => {
      a();
      b();
    };
  }, []);
  return { schedule, error };
}
