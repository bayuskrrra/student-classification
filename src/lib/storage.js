const KEY = 'uks_klasifikasi_riwayat_v1';

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function saveRecord(record) {
  const list = loadHistory();
  list.unshift(record);
  const trimmed = list.slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
  return [];
}

export function toCSV(list) {
  const head = ['waktu', 'nama', 'kelas', 'keluhan', 'status', 'keyakinan', 'alasan', 'rekomendasi', 'sumber'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = list.map((r) =>
    [r.waktu, r.nama, r.kelas, r.keluhan, r.status, r.confidence, r.alasan, r.rekomendasi, r.sumber]
      .map(esc)
      .join(',')
  );
  return [head.join(','), ...rows].join('\n');
}
