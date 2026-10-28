export type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_LABELS: [PrayerKey, string][] = [
  ['Fajr', 'Subuh'],
  ['Dhuhr', 'Dzuhur'],
  ['Asr', 'Ashar'],
  ['Maghrib', 'Maghrib'],
  ['Isha', 'Isya'],
];

export interface Settings {
  autoHideSec: number;
  city: string;
  notify: Record<PrayerKey, boolean>;
  reminder: number;
  autoLaunch: boolean;
}

export interface Prayer {
  key: PrayerKey;
  name: string;
  hhmm: string;
  at: number; // epoch ms
  day: 0 | 1; // 0 = hari ini, 1 = besok
}

export interface Schedule {
  city: string;
  dateKey: string;
  all: Prayer[];
}

declare global {
  interface Window {
    api: {
      getSettings(): Promise<Settings>;
      setSettings(patch: Partial<Settings>): Promise<Settings>;
      getSchedule(): Promise<Schedule | null>;
      setInteractive(on: boolean): void;
      on<T = unknown>(channel: string, cb: (data: T) => void): () => void;
    };
  }
}
