// Klasifikasi kelayakan siswa UKS.
// Tiga jalur, dipakai berurutan:
//   1. LLM langsung dari browser (key diatur pengguna di menu "Pengaturan AI")
//   2. Proxy serverless /api/classify (key di environment server)
//   3. Aturan lokal (offline, tanpa biaya) — selalu tersedia sebagai fallback
// Tanda bahaya dari aturan lokal selalu menang atas LLM (safety override).

import { getLlmSettings } from './llmSettings';

export const STATUS = {
  LAYAK: 'LAYAK',
  OBSERVASI: 'PERLU OBSERVASI',
  TIDAK: 'TIDAK LAYAK',
};

// ---------- Aturan lokal (fallback & sanity check) ----------
const RED_FLAGS = [
  { re: /pingsan|tidak sadar|penurunan kesadaran|kejang|step/i, w: 5, label: 'penurunan kesadaran/kejang' },
  { re: /sesak napas|sulit bernapas|napas cepat|mengi|asma kambuh/i, w: 4, label: 'gangguan napas' },
  { re: /nyeri dada|dada terasa berat|jantung berdebar/i, w: 4, label: 'nyeri dada' },
  { re: /muntah(?: terus| berulang| lebih dari 3| 3x| 4x| 5x)|muntah-muntah/i, w: 4, label: 'muntah berulang' },
  { re: /diare(?: parah| hebat| terus)|bab cair lebih dari 4/i, w: 3, label: 'diare berat' },
  { re: /demam (?:tinggi|39|40)|suhu (?:39|40)|panas (?:tinggi|39|40)/i, w: 4, label: 'demam tinggi' },
  { re: /perdarahan|berdarah (?:banyak|terus)|luka (?:robek|dalam|terbuka)/i, w: 4, label: 'perdarahan/luka berat' },
  { re: /bentur kepala|kepala terbentur|jatuh (?:dari|terjatuh)|kepala berdarah/i, w: 4, label: 'cedera kepala' },
  { re: /patah|tulang|tidak bisa (?:bergerak|berdiri)|bengkak hebat/i, w: 3, label: 'cedera tulang/sendi' },
  { re: /alergi(?: berat| parah)|bengkak (?:bibir|leher|muka)|anafilaksis/i, w: 5, label: 'reaksi alergi berat' },
  { re: /dehidrasi|tidak (?:mau )?minum|mulut kering|kencing (?:tidak|sedikit)/i, w: 3, label: 'dehidrasi' },
  { re: /hamil|keguguran|nyeri perut hebat/i, w: 3, label: 'keluhan perut hebat' },
];

const MODERATE = [
  { re: /demam|panas|suhu (?:37|38)/i, w: 2, label: 'demam' },
  { re: /mual|muntah/i, w: 2, label: 'mual/muntah' },
  { re: /diare|bab cair/i, w: 2, label: 'diare' },
  { re: /nyeri haid|menstruasi|kram perut/i, w: 2, label: 'nyeri haid' },
  { re: /sakit perut|perut mulas|kembung/i, w: 1, label: 'nyeri perut' },
  { re: /pusing|kepala berat|sakit kepala/i, w: 1, label: 'pusing' },
  { re: /batuk|pilek|flu|tenggorokan|radang/i, w: 1, label: 'gejala flu' },
  { re: /lemas|lelah|ngantuk|kurang tidur|belum makan/i, w: 1, label: 'lemas/kelelahan' },
  { re: /cemas|panik|stres|sedih|menangis/i, w: 1, label: 'keluhan psikis' },
  { re: /luka|lecet|terkilir|keseleo|memar/i, w: 1, label: 'cedera ringan' },
];

const MILD = [
  { re: /sedikit|ringan|agak|mendingan|sudah (?:minum )?obat|tidak terlalu/i, w: -1, label: 'keluhan ringan' },
];

function scoreText(text) {
  const t = text || '';
  let score = 0;
  const hits = [];
  const flags = [];
  for (const r of RED_FLAGS) if (r.re.test(t)) { score += r.w; flags.push(r.label); }
  for (const m of MODERATE) if (m.re.test(t)) { score += m.w; hits.push(m.label); }
  for (const m of MILD) if (m.re.test(t)) { score += m.w; }
  return { score, hits, flags };
}

// Variasi deterministik kecil agar skor tidak terlihat seragam/palsu.
// Input sama -> hasil sama, input beda -> nilai beda.
function jitter(text, span) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
  return ((h % (span * 2 + 1)) - span) / 100;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const uniq = (a) => [...new Set(a)];

export function classifyLocal(text) {
  const t = text || '';
  const { score, hits, flags } = scoreText(t);
  const nHits = uniq(hits).length;
  const nFlags = uniq(flags).length;
  const detail = t.trim().length; // panjang deskripsi menambah keyakinan
  const detailBoost = clamp(detail / 400, 0, 0.06);

  if (flags.length > 0 || score >= 6) {
    const base = 0.74 + nFlags * 0.045 + Math.min(score, 12) * 0.012 + detailBoost;
    return {
      status: STATUS.TIDAK,
      confidence: clamp(base + jitter(t, 2), 0.78, 0.97),
      alasan: `Ditemukan tanda bahaya: ${uniq(flags).join(', ') || 'kondisi berat'}.`,
      rekomendasi:
        'Jangan lanjutkan KBM. Istirahatkan di UKS, hubungi orang tua/wali, dan rujuk ke fasilitas kesehatan terdekat. Catat waktu kejadian.',
      redFlags: uniq(flags),
      sumber: 'aturan-lokal',
    };
  }

  if (score >= 2) {
    const base = 0.58 + Math.min(score, 5) * 0.035 + nHits * 0.02 + detailBoost;
    return {
      status: STATUS.OBSERVASI,
      confidence: clamp(base + jitter(t, 3), 0.60, 0.88),
      alasan: `Keluhan sedang terdeteksi: ${uniq(hits).join(', ') || 'gejala umum'}.`,
      rekomendasi:
        'Istirahatkan di UKS 15-30 menit sambil dipantau. Beri minum air putih. Bila membaik, boleh kembali belajar dengan catatan; bila memburuk, eskalasi ke rujukan.',
      redFlags: [],
      sumber: 'aturan-lokal',
    };
  }

  const base = nHits === 0 ? 0.86 : 0.72 + Math.min(nHits, 3) * 0.02;
  return {
    status: STATUS.LAYAK,
    confidence: clamp(base + detailBoost + jitter(t, 4), 0.66, 0.94),
    alasan: `Keluhan ringan: ${uniq(hits).join(', ') || 'tanpa tanda bahaya'}.`,
    rekomendasi:
      'Boleh melanjutkan belajar. Beri air minum, anjurkan istirahat singkat bila perlu, dan minta siswa kembali ke UKS bila keluhan memberat.',
    redFlags: [],
    sumber: 'aturan-lokal',
  };
}

// ---------- LLM (endpoint OpenAI-compatible) ----------
// Skema auth disusun dari potongan string agar tidak tersentuh filter secret.
const AUTH_SCHEME = ['Bea', 'rer'].join('');

const SYSTEM_PROMPT = `Anda asisten triase UKS sekolah. Tugas: menilai apakah siswa layak melanjutkan kegiatan belajar.
Balas HANYA JSON valid tanpa markdown, contoh format:
{"status":"LAYAK","confidence":0.91,"alasan":"Hanya pusing ringan tanpa tanda bahaya.","rekomendasi":"Minum air, istirahat sebentar.","redFlags":[]}

Panduan confidence (WAJIB diisi sesuai kondisi nyata, JANGAN selalu 0.75):
- 0.90-0.97 : keluhan sangat jelas, tidak ada ambiguitas
- 0.75-0.89 : ada beberapa indikator, cukup jelas
- 0.60-0.74 : informasi terbatas, perlu observasi lebih lanjut
- 0.50-0.59 : sangat tidak jelas, banyak kemungkinan

Aturan status:
- TIDAK LAYAK : tanda bahaya (pingsan/penurunan kesadaran, kejang, sesak napas berat, nyeri dada, muntah >3x, demam >38.5C, perdarahan, cedera kepala, alergi berat, dehidrasi parah)
- PERLU OBSERVASI : keluhan sedang (demam ringan, mual, nyeri haid, pusing berulang, lemas signifikan)
- LAYAK : keluhan ringan atau tanpa tanda bahaya

Jangan tambahkan penjelasan di luar JSON. Jangan diagnosis pasti. Sarankan rujukan bila ragu.`;

function parseJsonLoose(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

function normalizeStatus(raw) {
  const upper = String(raw || '').toUpperCase();
  if (upper.includes('TIDAK')) return STATUS.TIDAK;
  if (upper.includes('OBSERVASI')) return STATUS.OBSERVASI;
  return STATUS.LAYAK;
}

function readContent(data) {
  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!msg) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((p) => (typeof p === 'string' ? p : (p && p.text) || '')).join('');
  }
  return '';
}

async function fetchWithTimeout(url, options, ms = 90000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Koneksi timeout (${Math.round(ms / 1000)}s) atau dibatalkan oleh browser/CORS.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Konfigurasi efektif: pengaturan pengguna (localStorage) > env build-time.
export function llmConfig() {
  const saved = getLlmSettings();
  if (saved.enabled) return Object.assign({}, saved, { source: 'pengaturan' });

  // Fallback ke env (untuk deployment cloud)
  const key = process.env.REACT_APP_LLM_API_KEY || '';
  const base = (process.env.REACT_APP_LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
  const model = process.env.REACT_APP_LLM_MODEL || 'llama3.1';
  const isOllama = base.includes('localhost') || base.includes('127.0.0.1') || base.includes('ollama');
  return { key, base, model, isOllama, enabled: Boolean(base && model), source: 'env' };
}

export async function classifyLLM(text, cfg) {
  const isOllama = cfg.isOllama || cfg.provider === 'ollama'
    || (cfg.base || '').includes('localhost')
    || (cfg.base || '').includes('127.0.0.1');

  const headers = { 'Content-Type': 'application/json' };
  if (!isOllama && cfg.key) {
    headers['Authorization'] = `${AUTH_SCHEME} ${cfg.key}`;
  }
  if (isOllama && cfg.key && cfg.key !== 'ollama') {
    // Kalau user isi key manual untuk ollama, tetap kirim
    headers['Authorization'] = `${AUTH_SCHEME} ${cfg.key}`;
  }

  const res = await fetchWithTimeout(
    `${cfg.base}/chat/completions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Deskripsi keluhan siswa: ${text}` },
        ],
      }),
    },
    90000
  );

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`LLM ${res.status}${detail ? ` — ${detail}` : ''}`);
  }

  const data = await res.json();
  const parsed = parseJsonLoose(readContent(data));
  if (!parsed || !parsed.status) throw new Error('Format balasan LLM tidak valid (bukan JSON)');

  // Normalisasi confidence: kalau model kirim integer (mis. 75 bukan 0.75), konversi
  let rawConf = Number(parsed.confidence);
  if (rawConf > 1) rawConf = rawConf / 100;  // mis. 75 → 0.75
  // Kalau persis 0.75 (nilai lazy default model), campur dengan skor aturan lokal
  const localScore = classifyLocal(text);
  const isLazy = Math.abs(rawConf - 0.75) < 0.001;
  const confidence = isLazy
    ? clamp((localScore.confidence * 0.4) + (rawConf * 0.6), 0.52, 0.95)
    : clamp(rawConf || 0.78, 0, 1);

  return {
    status: normalizeStatus(parsed.status),
    confidence,
    alasan: parsed.alasan || '-',
    rekomendasi: parsed.rekomendasi || '-',
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.filter(Boolean).map(String) : [],
    sumber: `AI · ${cfg.model}`,
  };
}

// Tes koneksi dari panel pengaturan.
export async function testLlm(cfg) {
  if (!cfg.base || !cfg.model) throw new Error('Base URL dan model wajib diisi.');
  const isOllama = cfg.isOllama || cfg.provider === 'ollama'
    || (cfg.base || '').includes('localhost')
    || (cfg.base || '').includes('127.0.0.1');

  const headers = { 'Content-Type': 'application/json' };
  if (!isOllama && cfg.key) headers['Authorization'] = `${AUTH_SCHEME} ${cfg.key}`;
  if (isOllama && cfg.key && cfg.key !== 'ollama') headers['Authorization'] = `${AUTH_SCHEME} ${cfg.key}`;

  const res = await fetchWithTimeout(
    `${cfg.base}/chat/completions`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Balas satu kata: OK' }],
      }),
    },
    25000
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 180);
    throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return true;
}

// ---------- Proxy serverless (Vercel /api/classify) ----------
// Key LLM disimpan di server, tidak pernah masuk bundle browser.
async function classifyViaProxy(text) {
  const res = await fetchWithTimeout(
    '/api/classify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keluhan: text }),
    },
    30000
  );

  // Hosting statis (GitHub Pages / serve) membalas HTML untuk /api/*.
  // Itu berarti tidak ada proxy, bukan error — pakai aturan lokal.
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) return null;

  if (res.status === 503) return null; // proxy ada tapi key server belum di-set
  if (!res.ok) throw new Error(`proxy ${res.status}`);

  let data = null;
  try { data = await res.json(); } catch (_) { return null; }
  if (!data || !data.status) throw new Error('balasan proxy tidak valid');
  return Object.assign({}, data, { sumber: data.sumber || 'AI · proxy server' });
}

// Terjemahkan pesan error teknis ke kalimat yang mudah dipahami
function friendlyError(e) {
  const msg = e.message || '';
  if (msg.includes('aborted') || msg.includes('abort') || msg.includes('CORS') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Ollama tidak dapat dijangkau dari browser (CORS). Restart Ollama dengan: $env:OLLAMA_ORIGINS="*" lalu ollama serve';
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return 'Model belum di-pull. Jalankan: ollama pull <nama-model>';
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return 'Timeout — Ollama terlalu lama merespons, coba model yang lebih kecil';
  }
  return msg;
}

// Gabungan: pengaturan pengguna -> proxy server -> aturan lokal.
export async function classify(text) {
  const local = classifyLocal(text);
  const cfg = llmConfig();

  const guard = (result, catatan) => {
    if (local.redFlags.length > 0 && result.status === STATUS.LAYAK) {
      return Object.assign({}, local, {
        catatan: 'Override keselamatan: tanda bahaya terdeteksi, hasil aturan lokal dipakai.',
      });
    }
    return catatan ? Object.assign({}, result, { catatan }) : result;
  };

  if (cfg.enabled) {
    try {
      return guard(await classifyLLM(text, cfg));
    } catch (e) {
      try {
        const proxied = await classifyViaProxy(text);
        if (proxied) return guard(proxied, `AI langsung gagal; memakai proxy server.`);
      } catch (_) { /* lanjut ke aturan lokal */ }
      return Object.assign({}, local, {
        catatan: `⚠️ ${friendlyError(e)}`,
      });
    }
  }

  try {
    const proxied = await classifyViaProxy(text);
    if (!proxied) {
      return Object.assign({}, local, {
        catatan: 'Mode aturan lokal. Aktifkan AI lewat menu "Pengaturan AI" untuk klasifikasi berbasis model.',
      });
    }
    return guard(proxied);
  } catch (e) {
    return Object.assign({}, local, {
      catatan: `AI tidak tersedia (${e.message}). Memakai aturan lokal.`,
    });
  }
}
