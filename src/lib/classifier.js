// Klasifikasi kelayakan siswa UKS.
// Dua mode: (1) LLM via endpoint OpenAI-compatible, (2) fallback aturan lokal
// (jalan tanpa API key / tanpa internet).

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

export function classifyLocal(text) {
  const { score, hits, flags } = scoreText(text);
  const uniq = (a) => [...new Set(a)];

  if (flags.length > 0 || score >= 6) {
    return {
      status: STATUS.TIDAK,
      confidence: Math.min(0.95, 0.6 + score * 0.05),
      alasan: `Ditemukan tanda bahaya: ${uniq(flags).join(', ') || 'kondisi berat'}.`,
      rekomendasi:
        'Jangan lanjutkan KBM. Istirahatkan di UKS, hubungi orang tua/wali, dan rujuk ke fasilitas kesehatan terdekat. Catat waktu kejadian.',
      redFlags: uniq(flags),
      sumber: 'aturan-lokal',
    };
  }
  if (score >= 2) {
    return {
      status: STATUS.OBSERVASI,
      confidence: 0.7,
      alasan: `Keluhan sedang terdeteksi: ${uniq(hits).join(', ') || 'gejala umum'}.`,
      rekomendasi:
        'Istirahatkan di UKS 15-30 menit sambil dipantau. Beri minum air putih. Bila membaik, boleh kembali belajar dengan catatan; bila memburuk, eskalasi ke rujukan.',
      redFlags: [],
      sumber: 'aturan-lokal',
    };
  }
  return {
    status: STATUS.LAYAK,
    confidence: 0.75,
    alasan: `Keluhan ringan: ${uniq(hits).join(', ') || 'tanpa tanda bahaya'}.`,
    rekomendasi:
      'Boleh melanjutkan belajar. Beri air minum, anjurkan istirahat singkat bila perlu, dan minta siswa kembali ke UKS bila keluhan memberat.',
    redFlags: [],
    sumber: 'aturan-lokal',
  };
}

// ---------- LLM (OpenAI-compatible) ----------
const SYSTEM_PROMPT = `Anda asisten triase UKS sekolah. Tugas: menilai apakah siswa layak melanjutkan kegiatan belajar.
Balas HANYA JSON valid tanpa markdown:
{"status":"LAYAK|PERLU OBSERVASI|TIDAK LAYAK","confidence":0.0-1.0,"alasan":"ringkas 1-2 kalimat","rekomendasi":"tindakan konkret untuk petugas UKS","redFlags":["..."]}
Aturan: tanda bahaya (penurunan kesadaran, kejang, sesak berat, nyeri dada, muntah berulang, demam >38.5C, perdarahan, cedera kepala, alergi berat, dehidrasi) => TIDAK LAYAK. Keluhan sedang => PERLU OBSERVASI. Keluhan ringan => LAYAK. Jangan menambahkan diagnosis pasti; sarankan rujukan bila ragu.`;

export function llmConfig() {
  const key = process.env.REACT_APP_LLM_API_KEY || '';
  const base = (process.env.REACT_APP_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.REACT_APP_LLM_MODEL || 'gpt-4o-mini';
  return { key, base, model, enabled: Boolean(key) };
}

function parseJsonLoose(s) {
  if (!s) return null;
  const cleaned = s.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

export async function classifyLLM(text, cfg) {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Deskripsi keluhan siswa: ${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonLoose(raw);
  if (!parsed || !parsed.status) throw new Error('Format balasan LLM tidak valid');
  const status = String(parsed.status).toUpperCase().includes('TIDAK')
    ? STATUS.TIDAK
    : String(parsed.status).toUpperCase().includes('OBSERVASI')
    ? STATUS.OBSERVASI
    : STATUS.LAYAK;
  return {
    status,
    confidence: Number(parsed.confidence) || 0.8,
    alasan: parsed.alasan || '-',
    rekomendasi: parsed.rekomendasi || '-',
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    sumber: `llm:${cfg.model}`,
  };
}

// Gabungan: LLM bila tersedia, jika gagal pakai aturan lokal.
// Tanda bahaya lokal selalu menang (safety override).
export async function classify(text) {
  const local = classifyLocal(text);
  const cfg = llmConfig();
  if (!cfg.enabled) return { ...local, catatan: 'Mode aturan lokal (API key belum diisi).' };
  try {
    const llm = await classifyLLM(text, cfg);
    if (local.redFlags.length > 0 && llm.status === STATUS.LAYAK) {
      return { ...local, catatan: 'Override keselamatan: tanda bahaya terdeteksi.' };
    }
    return llm;
  } catch (e) {
    return { ...local, catatan: `LLM gagal (${e.message}). Memakai aturan lokal.` };
  }
}
