// Vercel Serverless Function: proxy klasifikasi LLM.
// API key disimpan di environment variable server (TIDAK ikut ke bundle browser).
//
// Env yang dibutuhkan (set di Vercel > Settings > Environment Variables):
//   LLM_API_KEY   (wajib)  - key provider OpenAI-compatible
//   LLM_BASE_URL  (opsional, default https://api.openai.com/v1)
//   LLM_MODEL     (opsional, default gpt-4o-mini)

const SYSTEM_PROMPT = `Anda asisten triase UKS sekolah. Tugas: menilai apakah siswa layak melanjutkan kegiatan belajar.
Balas HANYA JSON valid tanpa markdown:
{"status":"LAYAK|PERLU OBSERVASI|TIDAK LAYAK","confidence":0.0-1.0,"alasan":"ringkas 1-2 kalimat","rekomendasi":"tindakan konkret untuk petugas UKS","redFlags":["..."]}
Aturan: tanda bahaya (penurunan kesadaran, kejang, sesak berat, nyeri dada, muntah berulang, demam >38.5C, perdarahan, cedera kepala, alergi berat, dehidrasi) => TIDAK LAYAK. Keluhan sedang => PERLU OBSERVASI. Keluhan ringan => LAYAK. Jangan menambahkan diagnosis pasti; sarankan rujukan bila ragu.`;

function parseJsonLoose(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

export default async function handler(req, res) {
  // CORS sederhana (same-origin di Vercel, tapi berguna untuk testing lokal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.LLM_API_KEY || '';
  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!key) {
    return res.status(503).json({
      error: 'llm_not_configured',
      message: 'LLM_API_KEY belum di-set di environment Vercel.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const keluhan = (body && body.keluhan ? String(body.keluhan) : '').trim();

  if (!keluhan) {
    return res.status(400).json({ error: 'keluhan_required', message: 'Field "keluhan" wajib diisi.' });
  }
  if (keluhan.length > 2000) {
    return res.status(400).json({ error: 'keluhan_too_long', message: 'Keluhan maksimal 2000 karakter.' });
  }

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Deskripsi keluhan siswa: ${keluhan}` },
        ],
      }),
    });

    if (!upstream.ok) {
      const text = (await upstream.text()).slice(0, 300);
      return res.status(502).json({ error: 'upstream_error', status: upstream.status, detail: text });
    }

    const data = await upstream.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonLoose(raw);

    if (!parsed || !parsed.status) {
      return res.status(502).json({ error: 'invalid_llm_response', raw: String(raw).slice(0, 300) });
    }

    const upper = String(parsed.status).toUpperCase();
    const status = upper.includes('TIDAK')
      ? 'TIDAK LAYAK'
      : upper.includes('OBSERVASI')
      ? 'PERLU OBSERVASI'
      : 'LAYAK';

    return res.status(200).json({
      status,
      confidence: Number(parsed.confidence) || 0.8,
      alasan: parsed.alasan || '-',
      rekomendasi: parsed.rekomendasi || '-',
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      sumber: `llm:${model}`,
    });
  } catch (e) {
    return res.status(500).json({ error: 'proxy_failed', message: String(e && e.message ? e.message : e) });
  }
}
