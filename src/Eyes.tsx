import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export type Expr = 'idle' | 'happy' | 'sleepy' | 'shocked' | 'love';
interface Look {
  x: number;
  y: number;
}

function Eye({ expr, blinking, look }: { expr: Expr; blinking: boolean; look: Look }) {
  if (expr === 'happy') {
    return (
      <motion.svg
        width="12" height="9" viewBox="0 0 14 10"
        initial={{ scale: 0.5 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <path d="M2 8 L7 2 L12 8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    );
  }
  if (expr === 'love') {
    return (
      <motion.svg
        width="13" height="13" viewBox="0 0 24 24"
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ repeat: Infinity, duration: 0.7 }}
      >
        <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" fill="#ff5d7a" />
      </motion.svg>
    );
  }
  const base = expr === 'sleepy' ? 0.45 : 1; // setengah merem
  return (
    <motion.div
      className="h-2.5 w-2.5 rounded-full bg-white"
      animate={{
        x: look.x,
        y: look.y,
        scale: expr === 'shocked' ? 1.4 : 1,
        scaleY: blinking ? [base, 0.1, base] : base,
      }}
      transition={{ scaleY: { duration: 0.15 }, default: { type: 'spring', stiffness: 300, damping: 25 } }}
    />
  );
}

export function Eyes({ expr, look }: { expr: Expr; look: Look }) {
  const [blinking, setBlinking] = useState(false);

  // Kedip acak tiap 3-7 detik, durasi 150ms
  useEffect(() => {
    let timer: number;
    const loop = () => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 150);
        loop();
      }, 3000 + Math.random() * 4000);
    };
    loop();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-3.5 items-center gap-2">
      <Eye expr={expr} blinking={blinking} look={look} />
      <Eye expr={expr} blinking={blinking} look={look} />
    </div>
  );
}
