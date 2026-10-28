import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CITIES } from './cities';
import { PRAYER_LABELS, type Settings } from './types';

const INK = '#14161a';

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f7a5c] ${
        on ? 'bg-[#14161a]' : 'bg-black/20'
      }`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}

function Block({ children }: { children: ReactNode }) {
  return <section className="border-t border-black/10 py-4">{children}</section>;
}

function CityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const term = q.trim();
  const list = useMemo(() => {
    const n = term.toLowerCase();
    return (n ? CITIES.filter((c) => c.toLowerCase().includes(n)) : CITIES).slice(0, 60);
  }, [term]);
  const custom = term && !CITIES.some((c) => c.toLowerCase() === term.toLowerCase()) ? term : null;

  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <div className="relative">
      <input
        value={open ? q : value}
        onFocus={() => {
          setQ('');
          setOpen(true);
        }}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Cari kota atau kabupaten"
        aria-label="Kota"
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f7a5c]"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-black/15 bg-white py-1 shadow-lg">
          {custom && (
            <li onMouseDown={() => pick(custom)} className="cursor-pointer px-3 py-1.5 text-sm font-medium text-[#1f7a5c] hover:bg-black/5">
              Gunakan “{custom}”
            </li>
          )}
          {list.map((c) => (
            <li key={c} onMouseDown={() => pick(c)} className="cursor-pointer px-3 py-1.5 text-sm hover:bg-black/5">
              {c}
            </li>
          ))}
          {!custom && list.length === 0 && <li className="px-3 py-1.5 text-sm text-black/50">Tidak ada hasil</li>}
        </ul>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    window.api.getSettings().then(setS);
  }, []);
  if (!s) return null;

  // Update lokal dulu agar slider/toggle terasa instan, lalu simpan lewat main process
  const set = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    window.api.setSettings(patch);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f4f5f3] px-5 pb-4 pt-5 text-sm" style={{ color: INK }}>
      <h1 className="mb-4 text-lg font-semibold">Pengaturan</h1>

      <Block>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="hide" className="font-medium">Sembunyikan notch setelah kursor diam</label>
          <span className="tabular-nums text-black/60">{s.autoHideSec} detik</span>
        </div>
        <input
          id="hide" type="range" min={1} max={10} step={1}
          value={s.autoHideSec}
          onChange={(e) => set({ autoHideSec: Number(e.target.value) })}
          className="w-full" style={{ accentColor: INK }}
        />
      </Block>

      <Block>
        <div className="mb-2 font-medium">Kota</div>
        <CityPicker value={s.city} onChange={(city) => set({ city })} />
        <p className="mt-1.5 text-xs text-black/55">Tidak ketemu? Ketik nama kotanya lalu pilih “Gunakan”. Metode: Kemenag RI.</p>
      </Block>

      <Block>
        <div className="mb-2 font-medium">Notifikasi per shalat</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {PRAYER_LABELS.map(([key, name]) => (
            <div key={key} className="flex items-center justify-between">
              <span>{name}</span>
              <Toggle on={s.notify[key]} label={`Notifikasi ${name}`} onChange={(v) => set({ notify: { ...s.notify, [key]: v } })} />
            </div>
          ))}
        </div>
      </Block>

      <Block>
        <div className="flex items-center justify-between">
          <label htmlFor="rem" className="font-medium">Pengingat</label>
          <select
            id="rem" value={s.reminder}
            onChange={(e) => set({ reminder: Number(e.target.value) })}
            className="rounded-lg border border-black/15 bg-white px-2 py-1.5 outline-none focus:border-[#1f7a5c]"
          >
            <option value={0}>Tepat waktu</option>
            <option value={5}>5 menit sebelum</option>
            <option value={10}>10 menit sebelum</option>
            <option value={15}>15 menit sebelum</option>
          </select>
        </div>
      </Block>

      <Block>
        <div className="flex items-center justify-between">
          <span className="font-medium">Jalankan saat Windows menyala</span>
          <Toggle on={s.autoLaunch} label="Jalankan saat Windows menyala" onChange={(v) => set({ autoLaunch: v })} />
        </div>
      </Block>
    </div>
  );
}
