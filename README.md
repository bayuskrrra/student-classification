# Sistem Klasifikasi Kelayakan Siswa (UKS)

Siswa datang ke UKS, mendeskripsikan keluhannya, lalu sistem mengklasifikasi:
**LAYAK** melanjutkan belajar, **PERLU OBSERVASI** di UKS, atau **TIDAK LAYAK** (dirujuk).

React 19 + PWA (installable, offline shell). Tanpa backend.

## Menjalankan

```bash
npm install
cp .env.example .env      # opsional, isi API key untuk mode LLM
npm start                 # http://localhost:3000
npm run build             # produksi ke folder build/
```

Tanpa `.env` aplikasi tetap jalan penuh memakai **mode aturan lokal** (rule-based,
tanpa internet, tanpa biaya).

## Mode klasifikasi

| Mode | Kapan aktif | Perilaku |
|---|---|---|
| LLM | `REACT_APP_LLM_API_KEY` terisi | Kirim keluhan ke endpoint OpenAI-compatible, minta balasan JSON terstruktur |
| Aturan lokal | Key kosong / LLM gagal / offline | Pencocokan regex berbobot: red flag → TIDAK LAYAK, skor >=6 → TIDAK LAYAK, >=2 → OBSERVASI, sisanya LAYAK |

**Safety override:** bila aturan lokal menemukan tanda bahaya tetapi LLM bilang LAYAK,
hasil lokal yang dipakai. Model tidak boleh meloloskan kasus berbahaya.

## Konfigurasi LLM

```env
REACT_APP_LLM_API_KEY=xxx
REACT_APP_LLM_BASE_URL=https://api.openai.com/v1
REACT_APP_LLM_MODEL=gpt-4o-mini
```

Provider lain yang didukung (semua OpenAI-compatible): Kenari.id, OpenRouter, Groq,
Together, Ollama lokal (`http://localhost:11434/v1`, key `ollama`).

> Catatan: `REACT_APP_*` tertanam di bundle. Untuk produksi sekolah, letakkan key di
> proxy serverless (Vercel function) agar tidak bisa dicuri dari browser.

## Fitur

- Form nama/kelas/keluhan + contoh keluhan sekali klik
- Hasil: status, keyakinan %, alasan, rekomendasi tindakan, daftar tanda bahaya
- Riwayat 200 entri terakhir (localStorage), ekspor CSV, cetak lembar hasil
- Indikator online/offline dan mode AI aktif
- PWA: manifest, service worker (cache app shell), bisa diinstal ke home screen

## Struktur

```src/
  lib/classifier.js           aturan lokal + pemanggilan LLM + safety override
  lib/storage.js              riwayat localStorage + ekspor CSV
  components/StudentForm.js   input keluhan
  components/Results.js       kartu hasil + cetak
  App.js                      tab klasifikasi/riwayat, status pill
public/
  manifest.json  service-worker.js  index.html
```

## Deploy

### Vercel (root domain dengan alias anmaa.ukswisata)

1. Import repo ke Vercel
2. Framework: "Create React App"
3. Build: `npm run build` dengan `PUBLIC_URL=/` (wajib, bukan `/uks/`)
4. Output: `build`
5. Tambahkan alias `anmaa.ukswisata` di Vercel project settings

```bash
PUBLIC_URL=/ npm run build
```

### Netlify

Build `npm run build`, publish folder `build`.

### VPS (hosting lama)

Build pakai `PUBLIC_URL=/uks/`:
```bash
PUBLIC_URL=/uks/ npm run build
scp -r build/. ubuntu@168.110.223.109:/var/www/uks.app/
```

### Pindah ke subdomain sendiri (opsional)

1. Tambah A record `uks.anmaa.ukswisata` -> IP Vercel di DNS
2. Konfigurasi alias `anmaa.ukswisata` di Vercel project settings
3. `sudo certbot --nginx -d uks.anmaa.ukswisata`

### Vercel root domain deployment

```bash
PUBLIC_URL=/ npm run build
```

## Batasan

Alat bantu triase untuk petugas UKS, **bukan** pengganti diagnosis medis.
Riwayat hanya tersimpan di perangkat (localStorage) — untuk multi-petugas perlu backend.

## Status deploy (live)

- URL: https://spensix.web.id/uks/
- Server: VPS Oracle ARM64 (168.110.223.109), nginx
- Root: /var/www/uks.app
- Build memakai `PUBLIC_URL=/uks/` (wajib kalau di-path `/uks/`)
- nginx: blok `location /uks/` di /etc/nginx/sites-available/smarttv
  (backup: smarttv.bak-uks)

### Vercel root domain deployment

```bash
PUBLIC_URL=/ npm run build
```
