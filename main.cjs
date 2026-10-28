const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, screen, nativeImage, net } = require('electron');
const path = require('path');
const Store = require('electron-store');

const W = 400; // lebar jendela notch (pill 380 + ruang overshoot spring)
const H = 136;
const PRAYERS = [
  ['Fajr', 'Subuh'],
  ['Dhuhr', 'Dzuhur'],
  ['Asr', 'Ashar'],
  ['Maghrib', 'Maghrib'],
  ['Isha', 'Isya'],
];

const store = new Store({
  defaults: {
    autoHideSec: 3,
    city: 'Jepara, Mlonggo',
    notify: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
    reminder: 0,
    autoLaunch: false,
    cache: null,
  },
});

// Validasi di batas sistem: hanya kunci yang dikenal, nilai dipaksa ke rentang valid
const clean = {
  autoHideSec: (v) => Math.min(10, Math.max(1, Math.round(+v) || 3)),
  city: (v) => String(v).trim().slice(0, 80) || undefined,
  notify: (v) => Object.fromEntries(PRAYERS.map(([k]) => [k, !!(v && v[k])])),
  reminder: (v) => ([0, 5, 10, 15].includes(+v) ? +v : 0),
  autoLaunch: (v) => !!v,
};

const publicSettings = () => {
  const { cache, ...s } = store.store;
  return s;
};

let notch = null;
let settingsWin = null;
let tray = null;
let manualHidden = false;
let schedule = null; // { city, dateKey, all: [{ key, name, hhmm, at, day }] }
let loading = false;
const fired = new Set();

const iconPath = path.join(__dirname, 'dist', 'icon.png');
const webPrefs = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false };

const broadcast = (channel, data) =>
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, data));

// ---------- Waktu ----------
const pad = (n) => String(n).padStart(2, '0');
const ddmmyyyy = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

// Selisih (ms) zona waktu `tz` terhadap UTC pada instan `ms`
function tzOffset(tz, ms) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

// "04:21" di zona `tz` pada tanggal `d` -> epoch ms
function toInstant(d, h, m, tz) {
  const guess = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  return guess - tzOffset(tz, guess);
}

// ---------- Jadwal shalat (Aladhan) ----------
async function fetchDay(city, date) {
  const q = new URLSearchParams({
    city: city.split(',')[0].trim(),
    country: 'Indonesia',
    method: '20', // Kemenag RI (verifikasi saat dev, lihat README)
    school: '0',
  });
  const res = await net.fetch(`https://api.aladhan.com/v1/timingsByCity/${ddmmyyyy(date)}?${q}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const timings = json && json.data && json.data.timings;
  const tz = json && json.data && json.data.meta && json.data.meta.timezone;
  if (!timings || !tz) throw new Error('Respons Aladhan tidak valid');
  return PRAYERS.map(([key, name]) => {
    const m = /(\d{1,2}):(\d{2})/.exec(String(timings[key]));
    if (!m) throw new Error(`Waktu ${key} tidak valid`);
    return { key, name, hhmm: `${pad(+m[1])}:${m[2]}`, at: toInstant(date, +m[1], +m[2], tz) };
  });
}

async function refresh() {
  if (loading) return;
  const city = store.get('city');
  const now = new Date();
  const dateKey = ddmmyyyy(now);
  const cache = store.get('cache');
  if (cache && cache.city === city && cache.dateKey === dateKey) {
    schedule = cache;
    broadcast('schedule:update', schedule);
    return;
  }
  loading = true;
  try {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [a, b] = await Promise.all([fetchDay(city, now), fetchDay(city, tomorrow)]);
    if (store.get('city') !== city) return; // kota berubah saat menunggu
    schedule = { city, dateKey, all: [...a.map((x) => ({ ...x, day: 0 })), ...b.map((x) => ({ ...x, day: 1 }))] };
    store.set('cache', schedule);
    broadcast('schedule:update', schedule);
  } catch (err) {
    console.error('[blinky] gagal ambil jadwal:', err);
    broadcast('schedule:error', String(err.message || err));
  } finally {
    loading = false;
  }
}

// ---------- Notifikasi ----------
function notify(body) {
  new Notification({ title: 'Blinky', body, silent: false }).show(); // bunyi default Windows
  if (notch) notch.webContents.send('notified');
}

function tickNotifications() {
  if (!schedule) return;
  const cfg = store.store;
  const lead = cfg.reminder * 60000;
  const now = Date.now();
  for (const p of schedule.all) {
    const t = p.at - lead;
    const id = `${p.key}-${p.at}`;
    // toleransi 60 dtk: setelah sleep/resume tidak membanjiri notifikasi lama
    if (cfg.notify[p.key] && !fired.has(id) && now >= t && now - t < 60000) {
      fired.add(id);
      notify(cfg.reminder === 0 ? `Waktu ${p.name} telah tiba (${p.hhmm})` : `${p.name} ${cfg.reminder} menit lagi (${p.hhmm})`);
    }
  }
}

// ---------- Jendela ----------
function placeNotch() {
  if (!notch) return;
  const { x, y, width } = screen.getPrimaryDisplay().bounds;
  notch.setBounds({ x: Math.round(x + (width - W) / 2), y, width: W, height: H });
}

function createNotch() {
  notch = new BrowserWindow({
    width: W, height: H, frame: false, transparent: true, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, hasShadow: false, show: false,
    webPreferences: webPrefs,
  });
  placeNotch();
  notch.setAlwaysOnTop(true, 'screen-saver');
  notch.setIgnoreMouseEvents(true, { forward: true }); // tembus klik sampai kursor di atas pill
  notch.loadFile(path.join(__dirname, 'dist', 'index.html'));
  notch.once('ready-to-show', () => notch.showInactive());
  screen.on('display-metrics-changed', placeNotch);
}

function openSettings() {
  if (settingsWin) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 400, height: 500, useContentSize: true, resizable: false, maximizable: false, minimizable: false,
    autoHideMenuBar: true, title: 'Blinky - Pengaturan', backgroundColor: '#f4f5f3', icon: iconPath,
    webPreferences: webPrefs,
  });
  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(__dirname, 'dist', 'index.html'), { hash: 'settings' });
  settingsWin.on('closed', () => { settingsWin = null; });
}

function toggleNotch() {
  manualHidden = !manualHidden;
  if (manualHidden) notch.hide();
  else notch.showInactive();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  tray.setToolTip('Blinky');
  tray.on('click', toggleNotch);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Tampilkan / sembunyikan notch', click: toggleNotch },
      { label: 'Pengaturan', click: openSettings },
      { label: 'Tes notifikasi', click: () => notify('Ini notifikasi percobaan dari Blinky') },
      { type: 'separator' },
      { label: 'Keluar', click: () => app.quit() },
    ])
  );
}

// ---------- IPC ----------
ipcMain.handle('settings:get', () => publicSettings());
ipcMain.handle('schedule:get', () => schedule);
ipcMain.on('notch:interactive', (_e, on) => {
  if (notch) notch.setIgnoreMouseEvents(!on, { forward: true });
});
ipcMain.handle('settings:set', (_e, patch) => {
  if (!patch || typeof patch !== 'object') return publicSettings();
  const prevCity = store.get('city');
  for (const k of Object.keys(patch)) {
    if (!clean[k]) continue;
    const v = clean[k](patch[k]);
    if (v !== undefined) store.set(k, v);
  }
  if ('autoLaunch' in patch && app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: store.get('autoLaunch') });
  }
  if (store.get('city') !== prevCity) {
    schedule = null;
    broadcast('schedule:update', null);
    refresh();
  }
  const s = publicSettings();
  broadcast('settings:changed', s);
  return s;
});

// ---------- Siklus hidup ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', openSettings);
  app.whenReady().then(() => {
    app.setAppUserModelId('com.blinky.app'); // wajib agar notifikasi Windows tampil
    createNotch();
    createTray();
    refresh();

    // Kirim posisi kursor global ke renderer (mata mengikuti kursor + deteksi hover/auto-hide)
    let last = '';
    setInterval(() => {
      if (!notch || !notch.isVisible()) return;
      const p = screen.getCursorScreenPoint();
      const key = `${p.x},${p.y}`;
      if (key === last) return;
      last = key;
      const b = notch.getBounds();
      notch.webContents.send('cursor', { x: p.x - b.x, y: p.y - b.y });
    }, 40);

    setInterval(tickNotifications, 1000);
    // Ganti hari / jadwal belum ada (offline) -> coba ambil lagi
    setInterval(() => {
      const stale = !schedule || schedule.city !== store.get('city') || schedule.dateKey !== ddmmyyyy(new Date());
      if (stale) refresh();
    }, 30000);
  });
}
