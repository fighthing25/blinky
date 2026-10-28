import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eyes, type Expr } from './Eyes';
import { useSchedule, useSettings } from './hooks';

const SPRING = { type: 'spring', stiffness: 400, damping: 25 } as const;
const TOP = 6; // jarak pill dari tepi atas layar
const COLLAPSED = { w: 220, h: 45 };
const EXPANDED = { w: 380, h: 120 };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

function Mosque() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v3" />
      <path d="M5 13a7 7 0 0 1 14 0" />
      <path d="M3 13h18v8H3z" />
    </svg>
  );
}

export default function Notch() {
  const settings = useSettings();
  const { schedule, error } = useSchedule();
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const [temp, setTemp] = useState<Expr | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [done, setDone] = useState<string[]>([]);

  // Ref dipakai di callback IPC/interval agar tidak perlu subscribe ulang
  const expandedRef = useRef(false);
  const hiddenRef = useRef(false);
  const lastPos = useRef({ x: -1, y: -1 });
  const active = useRef(Date.now()); // terakhir kursor bergerak di area notch
  const limitMs = useRef(3000);
  const tempTimer = useRef<number | undefined>(undefined);
  limitMs.current = (settings?.autoHideSec ?? 3) * 1000; // dari Settings, tidak di-hardcode

  const flash = (e: Expr, ms: number) => {
    setTemp(e);
    window.clearTimeout(tempTimer.current);
    tempTimer.current = window.setTimeout(() => setTemp(null), ms);
  };

  const wake = () => {
    active.current = Date.now();
    setSleepy(false);
    if (hiddenRef.current) {
      hiddenRef.current = false;
      setHidden(false);
    }
  };

  // Posisi kursor global dari main process: hover, mata mengikuti kursor, reset timer auto-hide
  useEffect(
    () =>
      window.api.on<{ x: number; y: number }>('cursor', ({ x, y }) => {
        const cx = window.innerWidth / 2;
        const box = expandedRef.current ? EXPANDED : COLLAPSED;
        const inside = Math.abs(x - cx) <= box.w / 2 && y >= 0 && y <= TOP + box.h;
        const moved = x !== lastPos.current.x || y !== lastPos.current.y;
        lastPos.current = { x, y };

        const dx = x - cx;
        const dy = y - (TOP + 22);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 150);
        setLook({ x: (dx / d) * 3 * k, y: (dy / d) * 2.5 * k });

        if (inside && moved) wake();
        const next = inside && !hiddenRef.current;
        if (next !== expandedRef.current) {
          expandedRef.current = next;
          setExpanded(next);
        }
      }),
    []
  );

  // Jendela hanya menangkap klik saat kursor di atas pill; selain itu tembus ke aplikasi di bawahnya
  useEffect(() => {
    window.api.setInteractive(expanded);
  }, [expanded]);

  // Notifikasi baru: tampilkan notch + mata SHOCKED
  useEffect(
    () =>
      window.api.on('notified', () => {
        wake();
        flash('shocked', 3000);
      }),
    []
  );

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const autoHide = window.setInterval(() => {
      if (hiddenRef.current) return;
      const idle = Date.now() - active.current;
      if (idle >= limitMs.current) {
        hiddenRef.current = true;
        expandedRef.current = false;
        setHidden(true);
        setExpanded(false);
        setSleepy(false);
      } else if (idle >= limitMs.current - 500) {
        setSleepy(true); // SLEEPY 500ms sebelum hilang
      }
    }, 100);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(autoHide);
    };
  }, []);

  useEffect(() => setDone([]), [schedule?.dateKey]);

  const all = schedule?.all ?? [];
  const next = all.find((p) => p.at > now);
  const today = all.filter((p) => p.day === 0);
  const city = (settings?.city ?? '').split(',')[0];
  const expr: Expr = temp ?? (sleepy ? 'sleepy' : 'idle');
  const label = next ? `${next.name} - ${fmt(next.at - now)}` : error ? 'Offline' : 'Memuat...';

  return (
    <div className="flex justify-center" style={{ paddingTop: TOP }}>
      <motion.div
        initial={false}
        animate={{
          width: expanded ? EXPANDED.w : COLLAPSED.w,
          height: expanded ? EXPANDED.h : COLLAPSED.h,
          y: hidden ? -(TOP + 60) : 0,
        }}
        transition={SPRING}
        onClick={() => flash('happy', 1500)}
        className="overflow-hidden rounded-[22px] bg-black text-white"
      >
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-[380px] flex-col justify-between p-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col items-start gap-1.5">
                <Eyes expr={expr} look={look} />
                <span className="text-[11px] leading-none text-white/50">{city}</span>
              </div>
              <div className="text-right leading-none">
                <div className="mb-1 text-[11px] text-white/55">{next ? `Menuju ${next.name}` : error ? 'Offline' : ''}</div>
                <div className="text-[26px] font-semibold tabular-nums">{next ? fmt(next.at - now) : '--:--:--'}</div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {today.map((p) => {
                const passed = p.at <= now;
                const isNext = !!next && next.key === p.key && next.day === 0;
                return (
                  <div
                    key={p.key}
                    onClick={(e) => {
                      if (!passed) return; // yang belum lewat: klik tetap memicu HAPPY
                      e.stopPropagation();
                      setDone((d) => (d.includes(p.key) ? d : [...d, p.key]));
                      flash('love', 3000); // LOVE: tandai sudah shalat
                    }}
                    className={`rounded-lg px-1 py-1 text-center ${isNext ? 'bg-white/15' : ''} ${
                      passed ? 'cursor-pointer text-white/45' : ''
                    }`}
                  >
                    <div className="text-[10px] leading-tight">
                      {p.name}
                      {done.includes(p.key) ? ' ✓' : ''}
                    </div>
                    <div className="text-sm font-medium tabular-nums">{p.hhmm}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full items-center justify-between px-4"
          >
            <Eyes expr={expr} look={look} />
            <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums">
              <Mosque />
              <span>{label}</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
