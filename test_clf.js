
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
const MILD = [{ re: /sedikit|ringan|agak|mendingan|sudah (?:minum )?obat|tidak terlalu/i, w: -1, label: 'keluhan ringan' }];

function scoreText(text) {
  const t = text || '';
  let score = 0; const hits = []; const flags = [];
  for (const r of RED_FLAGS) if (r.re.test(t)) { score += r.w; flags.push(r.label); }
  for (const m of MODERATE) if (m.re.test(t)) { score += m.w; hits.push(m.label); }
  for (const m of MILD) if (m.re.test(t)) { score += m.w; }
  return { score, hits, flags };
}
function jitter(text, span) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
  return ((h % (span * 2 + 1)) - span) / 100;
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function classifyLocal(text) {
  const t = text || '';
  const { score, hits, flags } = scoreText(t);
  const uniq = (a) => [...new Set(a)];
  const nHits = uniq(hits).length;
  const nFlags = uniq(flags).length;
  const detail = t.trim().length;
  const detailBoost = clamp(detail / 400, 0, 0.06);

  if (flags.length > 0 || score >= 6) {
    const base = 0.74 + nFlags * 0.045 + Math.min(score, 12) * 0.012 + detailBoost;
    return { status: 'TIDAK LAYAK', confidence: clamp(base + jitter(t, 2), 0.78, 0.97) };
  }
  if (score >= 2) {
    const base = 0.58 + Math.min(score, 5) * 0.035 + nHits * 0.02 + detailBoost;
    return { status: 'PERLU OBSERVASI', confidence: clamp(base + jitter(t, 3), 0.60, 0.88) };
  }
  const base = nHits === 0 ? 0.86 : 0.72 + Math.min(nHits, 3) * 0.02;
  return { status: 'LAYAK', confidence: clamp(base + detailBoost + jitter(t, 4), 0.66, 0.94) };
}

const samples = [
  'Pusing ringan, belum sarapan, sudah minum air',
  'Demam 38 derajat, mual, lemas sejak pagi',
  'Sesak napas dan nyeri dada saat olahraga',
  'Sakit perut, muntah 4 kali, tidak mau minum',
  'Nyeri haid, kram perut, masih bisa duduk',
  'Terjatuh, kepala terbentur, sekarang bingung',
  'Batuk pilek sedikit',
  'Sakit kepala',
  'Lemas dan ngantuk',
  'Mual',
  'Demam',
  'Tidak ada keluhan',
];
for (const s of samples) {
  const r = classifyLocal(s);
  console.log(`${(r.confidence*100).toFixed(0).padStart(3)}%  ${r.status.padEnd(16)} ${s}`);
}
