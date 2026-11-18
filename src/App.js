import React, { useEffect, useMemo, useState } from 'react';
import StudentForm from './components/StudentForm';
import Results from './components/Results';
import { classify, llmConfig } from './lib/classifier';
import { loadHistory, saveRecord, clearHistory, toCSV } from './lib/storage';

export default function App() {
  const [tab, setTab] = useState('klasifikasi');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [siswa, setSiswa] = useState(null);
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);

  const cfg = useMemo(() => llmConfig(), []);

  useEffect(() => {
    setHistory(loadHistory());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleSubmit = async ({ nama, kelas, keluhan }) => {
    setLoading(true);
    setResult(null);
    setSiswa({ nama, kelas, keluhan });
    try {
      const res = await classify(keluhan);
      setResult(res);
      const record = {
        id: Date.now(),
        waktu: new Date().toLocaleString('id-ID'),
        nama: nama || '-',
        kelas: kelas || '-',
        keluhan,
        ...res,
      };
      setHistory(saveRecord(record));
    } catch (e) {
      setResult({
        status: 'PERLU OBSERVASI',
        confidence: 0,
        alasan: 'Terjadi kesalahan saat memproses.',
        rekomendasi: 'Periksa kondisi siswa secara manual dan catat keluhan.',
        redFlags: [],
        sumber: 'error',
        catatan: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setSiswa(null);
  };

  const exportCSV = () => {
    const blob = new Blob([toCSV(history)], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `riwayat-uks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Klasifikasi Kelayakan Siswa</h1>
          <p className="muted">Unit Kesehatan Sekolah · triase cepat berbasis AI</p>
        </div>
        <div className="status-pills">
          <span className={`pill ${online ? 'on' : 'off'}`}>{online ? 'Online' : 'Offline'}</span>
          <span className={`pill ${cfg.enabled ? 'on' : 'off'}`}>
            {cfg.enabled ? `LLM: ${cfg.model}` : 'Mode aturan lokal'}
          </span>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'klasifikasi' ? 'active' : ''} onClick={() => setTab('klasifikasi')}>
          Klasifikasi
        </button>
        <button className={tab === 'riwayat' ? 'active' : ''} onClick={() => setTab('riwayat')}>
          Riwayat ({history.length})
        </button>
      </nav>

      {tab === 'klasifikasi' && (
        <main>
          {!result && <StudentForm onSubmit={handleSubmit} loading={loading} />}
          {result && (
            <>
              {siswa && (
                <p className="muted center">
                  {siswa.nama || 'Tanpa nama'} {siswa.kelas ? `· ${siswa.kelas}` : ''}
                </p>
              )}
              <Results result={result} onReset={reset} />
            </>
          )}
        </main>
      )}

      {tab === 'riwayat' && (
        <main>
          <div className="card">
            <div className="row between">
              <h2>Riwayat klasifikasi</h2>
              <div className="actions">
                <button className="btn-ghost" onClick={exportCSV} disabled={!history.length}>
                  Ekspor CSV
                </button>
                <button
                  className="btn-ghost danger-text"
                  onClick={() => setHistory(clearHistory())}
                  disabled={!history.length}
                >
                  Hapus
                </button>
              </div>
            </div>
            {!history.length && <p className="muted">Belum ada data.</p>}
            {history.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Nama</th>
                      <th>Kelas</th>
                      <th>Keluhan</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="nowrap">{h.waktu}</td>
                        <td>{h.nama}</td>
                        <td>{h.kelas}</td>
                        <td className="ellipsis" title={h.keluhan}>{h.keluhan}</td>
                        <td>
                          <span className={`tag ${h.status === 'LAYAK' ? 'ok' : h.status === 'TIDAK LAYAK' ? 'bad' : 'warn'}`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}

      <footer className="foot">
        Alat bantu triase, bukan pengganti diagnosis medis. Tanda bahaya selalu dirujuk.
      </footer>
    </div>
  );
}
