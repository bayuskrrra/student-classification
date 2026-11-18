import React, { useEffect, useState } from 'react';
import StudentForm from './components/StudentForm';
import Results from './components/Results';
import AiSettings from './components/AiSettings';
import { classify } from './lib/classifier';
import { getLlmSettings } from './lib/llmSettings';
import { loadHistory, saveRecord, clearHistory, toCSV } from './lib/storage';

const TABS = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'klasifikasi', label: 'Klasifikasi' },
  { id: 'riwayat', label: 'Riwayat' },
  { id: 'tentang', label: 'Profil Sekolah' },
];

export default function App() {
  const [tab, setTab] = useState('beranda');
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCfg, setAiCfg] = useState({ enabled: false, model: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [siswa, setSiswa] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadHistory());
    setAiCfg(getLlmSettings());
  }, []);

  const go = (id) => {
    setTab(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    <div className="site-container">
      <header className="navbar">
        <div className="nav-brand" onClick={() => go('beranda')}>
          <img
            src={`${process.env.PUBLIC_URL}/logo192.png`}
            alt="Logo SMP Wisata Sanur"
            className="logo-img"
          />
          <div className="brand-text">
            <div className="school-name">SMP Wisata Sanur</div>
            <div className="system-tag">Sistem Pelayanan Kesehatan UKS</div>
          </div>
        </div>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Buka menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => go(t.id)}
            >
              {t.label}
              {t.id === 'riwayat' && history.length > 0 ? ` (${history.length})` : ''}
            </button>
          ))}
          <button
            className={`ai-pill ${aiCfg.enabled ? 'on' : 'off'}`}
            onClick={() => { setAiOpen(true); setMenuOpen(false); }}
            title={aiCfg.enabled ? `AI aktif: ${aiCfg.model}` : 'Klik untuk mengaktifkan AI'}
          >
            <span className="dot" />
            {aiCfg.enabled ? 'AI aktif' : 'Aturan lokal'}
          </button>
        </nav>
      </header>

      {tab === 'beranda' && (
        <main className="main-content">
          <section className="hero-section">
            <div className="hero-left">
              <div className="pill-badge">SMP Wisata Sanur · UKS System</div>
              <h1 className="hero-title">Sistem Klasifikasi Kesehatan Siswa</h1>
              <p className="hero-subtitle">
                Fasilitas pendukung triase untuk membantu penanganan dan evaluasi kondisi kesehatan siswa
                di Unit Kesehatan Sekolah (UKS).
              </p>
              <div className="hero-actions">
                <button className="btn-hero-primary" onClick={() => go('klasifikasi')}>
                  Mulai Klasifikasi
                </button>
                <button className="btn-hero-secondary" onClick={() => setAiOpen(true)}>
                  {aiCfg.enabled ? 'Pengaturan AI' : 'Aktifkan AI'}
                </button>
              </div>
              <p className="hero-note">
                {aiCfg.enabled
                  ? `Klasifikasi memakai model ${aiCfg.model}.`
                  : 'Belum ada API key — sistem berjalan dengan aturan lokal. Klik "Aktifkan AI" untuk memakai model bahasa.'}
              </p>
            </div>

            <div className="hero-right">
              <div className="photo-frame logo-frame">
                <img
                  src={`${process.env.PUBLIC_URL}/logo512.png`}
                  alt="Logo SMP Wisata Sanur"
                  className="school-photo logo"
                />
              </div>
              <p className="photo-caption">Jl. Danau Buyan No.58, Sanur, Denpasar Selatan, Bali</p>
            </div>
          </section>

          <section className="features-grid">
            <div className="feature-card">
              <div className="feature-info">
                <h3>Klasifikasi Kondisi</h3>
                <p>Mengevaluasi tingkat keparahan berdasarkan gejala dan keluhan yang disampaikan siswa.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-info">
                <h3>Rekomendasi Tindakan</h3>
                <p>Petunjuk tindakan standar seperti observasi UKS, istirahat, atau rujukan medis.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-info">
                <h3>Pencatatan Riwayat</h3>
                <p>Pendataan rekam pemeriksaan kesehatan siswa terstruktur dan rapi.</p>
              </div>
            </div>
          </section>

          <section className="severity-section">
            <div className="section-header">
              <h2>Kategori Evaluasi Kesehatan</h2>
            </div>
            <div className="severity-cards">
              <div className="severity-card">
                <span className="severity-title">Ringan</span>
                <p className="severity-desc">Siswa dapat diistirahatkan dan diobservasi singkat di UKS (±15-30 menit) sebelum kembali ke kelas.</p>
              </div>
              <div className="severity-card">
                <span className="severity-title">Sedang</span>
                <p className="severity-desc">Memerlukan pemantauan berkala di UKS dan penanganan standar, serta koordinasi dengan wali siswa bila diperlukan.</p>
              </div>
              <div className="severity-card">
                <span className="severity-title">Berat</span>
                <p className="severity-desc">Perlu pertolongan pertama segera, pemanggilan orang tua/wali, serta penanganan rujukan ke faskes terdekat.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {tab === 'klasifikasi' && (
        <main className="main-content container-narrow">
          <div className="form-page-header">
            <h2>Form Pemeriksaan &amp; Triase UKS</h2>
            <p className="muted">Isi informasi siswa dan deskripsi keluhan secara lengkap untuk memulai pemeriksaan.</p>
          </div>

          {!result && <StudentForm onSubmit={handleSubmit} loading={loading} />}

          {result && (
            <>
              {siswa && (
                <p className="muted center">
                  Data Siswa: <strong>{siswa.nama || 'Tanpa nama'}</strong>
                  {siswa.kelas ? ` · Kelas ${siswa.kelas}` : ''}
                </p>
              )}
              <Results result={result} onReset={reset} />
            </>
          )}
        </main>
      )}

      {tab === 'riwayat' && (
        <main className="main-content container-narrow">
          <div className="card">
            <div className="row between">
              <h2>Riwayat Pemeriksaan ({history.length})</h2>
              <div className="actions">
                <button className="btn-ghost" onClick={exportCSV} disabled={!history.length}>
                  Ekspor CSV
                </button>
                <button
                  className="btn-ghost danger-text"
                  onClick={() => setHistory(clearHistory())}
                  disabled={!history.length}
                >
                  Hapus Data
                </button>
              </div>
            </div>
            {!history.length && <p className="muted">Belum ada data pemeriksaan tersimpan.</p>}
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
                        <td className="nowrap" data-label="Waktu">{h.waktu}</td>
                        <td data-label="Nama">{h.nama}</td>
                        <td data-label="Kelas">{h.kelas}</td>
                        <td className="ellipsis" title={h.keluhan} data-label="Keluhan">{h.keluhan}</td>
                        <td data-label="Status">
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

      {tab === 'tentang' && (
        <main className="main-content container-narrow">
          <div className="card about-card">
            <h2>Profil &amp; Layanan Kesehatan SMP Wisata Sanur</h2>
            <p>
              Sistem Pelayanan Kesehatan UKS di <strong>SMP Wisata Sanur</strong> membantu memfasilitasi
              penanganan awal serta triase kesehatan bagi peserta didik selama kegiatan persekolahan berlangsung.
            </p>

            <div className="school-info-box">
              <h3>Informasi Satuan Pendidikan</h3>
              <ul>
                <li><strong>Nama Sekolah:</strong> SMP Wisata Sanur</li>
                <li><strong>Alamat:</strong> Jl. Danau Buyan No.58, Sanur, Denpasar Selatan, Kota Denpasar, Bali 80227</li>
                <li><strong>Kontak:</strong> (0361) 288508 | info@smpwisatasanur.sch.id</li>
                <li>
                  <strong>Website Resmi:</strong>{' '}
                  <a href="https://www.smpwisatasanur.sch.id" target="_blank" rel="noreferrer">
                    smpwisatasanur.sch.id
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <p className="copyright">© 2026 SMP Wisata Sanur · Layanan UKS</p>
            <p className="disclaimer">Sistem penunjang triase kesehatan sekolah. Bukan pengganti diagnosis medis penuh.</p>
          </div>
        </div>
      </footer>

      <AiSettings
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onSaved={(cfg) => setAiCfg(cfg)}
      />
    </div>
  );
}
