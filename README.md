# Sistem Klasifikasi Kelayakan Siswa (UKS) — SMP Wisata Sanur

Siswa datang ke UKS, mendeskripsikan keluhannya, lalu sistem mengklasifikasi:
**LAYAK** melanjutkan belajar, **PERLU OBSERVASI** di UKS, atau **TIDAK LAYAK** (dirujuk).

React 19 + PWA (installable, offline shell). Responsif penuh: desktop, tablet, dan HP.

## Menjalankan

```bash
npm install
npm start                 # http://localhost:3000
npm run build             # produksi ke folder build/
```

Tanpa API key aplikasi tetap jalan penuh memakai **mode aturan lokal** (rule-based,
tanpa internet, tanpa biaya).

## Mode klasifikasi

| Mode | Kapan aktif | Perilaku |
|---|---|---|
| AI (browser) | Key diisi lewat menu **Pengaturan AI** | Request langsung ke provider OpenAI-compatible dari browser |
| AI (server) | `LLM_API_KEY` di-set di environment Vercel | Lewat proxy `/api/classify`, key tidak pernah masuk bundle |
| Aturan lokal | Key kosong / AI gagal / offline | Pencocokan regex berbobot: red flag → TIDAK LAYAK, skor ≥6 → TIDAK LAYAK, ≥2 → OBSERVASI, sisanya LAYAK |

Urutan percobaan: **pengaturan pengguna → proxy server → aturan lokal**.

**Safety override:** bila aturan lokal menemukan tanda bahaya tetapi AI bilang LAYAK,
hasil lokal yang dipakai. Model tidak boleh meloloskan kasus berbahaya.

## Mengaktifkan AI (tanpa build ulang)

1. Buka aplikasi → tombol status di navbar (kanan atas) atau **"Aktifkan AI"** di beranda.
2. Pilih provider (default **Kenari.id**), base URL dan model terisi otomatis.
3. Tempel API key → **Tes koneksi** → **Simpan**.
4. Status di navbar berubah menjadi **AI aktif** dan setiap klasifikasi memakai model tersebut.

Key disimpan di `localStorage` browser itu saja (tidak dikirim ke server aplikasi).
Untuk mengganti/menghapus: buka panel yang sama → **Hapus key**.

### Provider yang didukung (semua OpenAI-compatible)

| Provider | Base URL | Contoh model |
|---|---|---|
| Kenari.id | `https://kenari.id/v1` | `glm-4-7-flash:free` |
| OpenRouter | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct:free` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Ollama lokal | `http://localhost:11434/v1` | `llama3.1` (key: `ollama`) |

> Base URL Kenari.id adalah `https://kenari.id/v1` (bukan `api.kenari.id`).

## AI lewat server (opsional, lebih aman untuk sekolah)

Set di Vercel → Settings → Environment Variables, lalu redeploy:

```
LLM_API_KEY=kn-xxxxxxxx
LLM_BASE_URL=https://kenari.id/v1
LLM_MODEL=glm-4-7-flash:free
```

`GET /api/classify` mengembalikan `{configured, model}` untuk cek status.
Tanpa key, endpoint membalas `503` dan frontend otomatis memakai aturan lokal.

## Fitur

- Form nama/kelas/keluhan + contoh keluhan sekali klik
- Hasil: status, keyakinan %, alasan, rekomendasi tindakan, daftar tanda bahaya
- Panel **Pengaturan AI** (provider, base URL, model, key, tes koneksi)
- Indikator mode aktif di navbar (AI aktif / aturan lokal)
- Riwayat 200 entri terakhir (localStorage), ekspor CSV, cetak lembar hasil
- PWA: manifest, service worker (network-first untuk HTML agar update langsung terpakai)
- Responsif: nav hamburger di HP, tabel riwayat berubah jadi kartu, modal bottom-sheet

## Struktur

```
src/
  lib/classifier.js           aturan lokal + LLM + proxy + safety override
  lib/llmSettings.js          preset provider + simpan key di localStorage
  lib/storage.js              riwayat localStorage + ekspor CSV
  components/StudentForm.js   input keluhan
  components/Results.js       kartu hasil + cetak
  components/AiSettings.js    modal pengaturan AI
  App.js                      tab, status AI, riwayat
  index.css                   tema + seluruh breakpoint responsif
api/classify.js               proxy serverless (Vercel)
public/
  manifest.json  service-worker.js  index.html
```

## Deploy

### Vercel

```bash
PUBLIC_URL=/ npm run build
npx vercel --yes --prod
```

Project: `ukswisata` (org `bayuskrrra`). Live: https://ukswisata.vercel.app

### GitHub Pages

```bash
npm run deploy
```

Tanpa proxy server, jadi AI hanya bisa lewat panel **Pengaturan AI** (key di browser).

### VPS (hosting lama)

```bash
PUBLIC_URL=/uks/ npm run build
scp -r build/. ubuntu@168.110.223.109:/var/www/uks.app/
```

## Batasan

Alat bantu triase untuk petugas UKS, **bukan** pengganti diagnosis medis.
Riwayat hanya tersimpan di perangkat (localStorage) — untuk multi-petugas perlu backend.
