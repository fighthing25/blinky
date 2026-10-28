# Blinky

Notch interaktif di tengah atas layar Windows: mata animasi + jadwal shalat (Aladhan, metode Kemenag RI).

## Jalankan lokal
```
npm install
npm start
```
Ikon tray: klik kiri = tampil/sembunyi notch, klik kanan = menu (Pengaturan, Tes notifikasi, Keluar).

## Build .exe
```
npm run build
npx electron-builder --win --x64 --publish never
```
Hasil: `release/Blinky-Setup-<versi>.exe`.

## Rilis di GitHub (otomatis)
Push repo ke GitHub, lalu:
```
git tag v1.0.0
git push origin v1.0.0
```
Workflow `.github/workflows/release.yml` membangun .exe di runner Windows dan melampirkannya ke Release.
Tanpa tag, jalankan manual dari tab Actions (hasilnya jadi artifact).

## Verifikasi method Kemenag
Buka di browser dan cocokkan dengan jadwal Kemenag/bimasislam untuk kota yang sama:
```
https://api.aladhan.com/v1/timingsByCity?city=Jepara&country=Indonesia&method=20&school=0
```
Cek `data.meta.method.name` pada respons; harus memuat "Kementerian Agama". Jika bukan, ubah `method` di `main.cjs` (fungsi `fetchDay`).

## Cek tipe
```
npm run typecheck
```
