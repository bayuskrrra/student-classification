import React, { useEffect, useMemo, useState } from 'react';
import StudentForm from './components/StudentForm';
import Results from './components/Results';
import { classify, llmConfig } from './lib/classifier';
import { loadHistory, saveRecord, clearHistory, toCSV } from './lib/storage';

export default function App() {
  const [tab, setTab] = useState('beranda');
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
    <div className="site-container">
      {/* Top Header / Company Profile Navigation */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => setTab('beranda')}>
          <div className="logo-container">
            <svg className="school-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 5 L88 20 V50 C88 72 70 90 50 96 C30 90 12 72 12 50 V20 L50 5 Z" fill="#0F2C59" stroke="#E2E8F0" strokeWidth="2"/>
              <path d="M50 10 L82 23 V48 C82 67 66 83 50 88 C34 83 18 67 18 48 V23 L50 10 Z" fill="#1E3A8A"/>
              <circle cx="50" cy="35" r="12" fill="#F59E0B"/>
              <path d="M30 65 C38 60 46 62 50 66 C54 62 62 60 70 65 V48 C62 43 54 45 50 49 C46 45 38 43 30 48 V65 Z" fill="#FFFFFF"/>
              <path d="M50 25 C50 25 45 33 48 37 C49 38 51 38 52 37 C55 33 50 25 50 25 Z" fill="#EF4444"/>
            </svg>
          </div>
          <div className="brand-text">
            <div className="school-name">SMP Wisata Sanur</div>
            <div className="system-tag">SISKA-AI | Sistem Kesehatan Siswa</div>
          </div>
        </div>

        <nav className="nav-links">
          <button className={`nav-btn ${tab === 'beranda' ? 'active' : ''}`} onClick={() => setTab('beranda')}>
            Beranda
          </button>
          <button className={`nav-btn ${tab === 'tentang' ? 'active' : ''}`} onClick={() => setTab('tentang')}>
            Tentang Sistem
          </button>
          <button className={`nav-btn ${tab === 'klasifikasi' ? 'active' : ''}`} onClick={() => setTab('klasifikasi')}>
            Klasifikasi
          </button>
          <button className={`nav-btn ${tab === 'riwayat' ? 'active' : ''}`} onClick={() => setTab('riwayat')}>
            Riwayat ({history.length})
          </button>
          <button className="login-btn" onClick={() => alert('Fitur Login Petugas UKS dalam pengembangan')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Login Petugas
          </button>
        </nav>
      </header>

      {/* Main Page Content */}
      {tab === 'beranda' && (
        <main className="main-content">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-left">
              <div className="pill-badge">
                <span className="dot"></span> SISKA-AI SMP Wisata Sanur
              </div>
              <h1 className="hero-title">Sistem Klasifikasi Kesehatan Siswa</h1>
              <p className="hero-subtitle">
                Membantu petugas UKS dalam menentukan tingkat keparahan kondisi kesehatan siswa dan memberikan rekomendasi penanganan yang tepat.
              </p>
              <div className="hero-actions">
                <button className="btn-hero-primary" onClick={() => setTab('klasifikasi')}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                  Klasifikasi Sekarang
                </button>
                <button className="btn-hero-secondary" onClick={() => setTab('tentang')}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Tentang Sistem
                </button>
              </div>
            </div>

            <div className="hero-right">
              <div className="photo-frame">
                <img 
                  src="https://www.smpwisatasanur.sch.id/storage/website/homepage-highlights/CwH6P0xbB28Jv5SXocfDHRU8O2dmqVNDI8dBlcom.png" 
                  alt="SMP Wisata Sanur Building" 
                  className="school-photo"
                  onError={(e) => {
                    e.target.src = "https://www.smpwisatasanur.sch.id/storage/website/galleries/XfRQmIjubGCfjzThvjm97wE3lOA47ZSn2LwnNHRf.jpg";
                  }}
                />
                <div className="photo-overlay"></div>
                <div className="school-tag-overlay">
                  <span>Jl. Danau Buyan No.58, Sanur, Denpasar - Bali</span>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Highlights Grid */}
          <section className="features-grid">
            <div className="feature-card">
              <div className="feature-icon bg-blue-light">
                <svg width="24" height="24" fill="none" stroke="#2563EB" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div className="feature-info">
                <h3>Klasifikasi Kondisi</h3>
                <p>Menentukan tingkat keparahan berdasarkan keluhan siswa secara obyektif.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-green-light">
                <svg width="24" height="24" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
              </div>
              <div className="feature-info">
                <h3>Saran Penanganan</h3>
                <p>Memberikan rekomendasi seperti observasi di UKS, istirahat, atau rujuk.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon bg-purple-light">
                <svg width="24" height="24" fill="none" stroke="#7C3AED" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="feature-info">
                <h3>Riwayat Pemeriksaan</h3>
                <p>Menyimpan rekam data dan hasil triase kesehatan siswa secara teratur.</p>
              </div>
            </div>
          </section>

          {/* Classification Levels Section */}
          <section className="severity-section">
            <div className="section-header">
              <h2>Tingkat Klasifikasi</h2>
              <div className="accent-line"></div>
            </div>

            <div className="severity-cards">
              <div className="severity-card mild">
                <div className="severity-header">
                  <div className="severity-icon-badge icon-green">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="severity-title text-green">Ringan</span>
                </div>
                <p className="severity-desc">Istirahat dan observasi di UKS (± 15–30 menit).</p>
              </div>

              <div className="severity-card moderate">
                <div className="severity-header">
                  <div className="severity-icon-badge icon-yellow">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <span className="severity-title text-yellow">Sedang</span>
                </div>
                <p className="severity-desc">Perawatan di UKS dan pemantauan lanjutan, dapat menghubungi orang tua.</p>
              </div>

              <div className="severity-card severe">
                <div className="severity-header">
                  <div className="severity-icon-badge icon-red">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </div>
                  <span className="severity-title text-red">Berat</span>
                </div>
                <p className="severity-desc">Pertolongan pertama, hubungi orang tua, dan rujuk ke fasilitas kesehatan.</p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Form Page */}
      {tab === 'klasifikasi' && (
        <main className="main-content container-narrow">
          <div className="form-page-header">
            <h2>Form Triase Klasifikasi UKS</h2>
            <p className="muted">Masukkan data dan deskripsi keluhan siswa untuk mendapatkan rekomendasi tindakan.</p>
          </div>

          {!result && <StudentForm onSubmit={handleSubmit} loading={loading} />}

          {result && (
            <>
              {siswa && (
                <p className="muted center">
                  Siswa: <strong>{siswa.nama || 'Tanpa nama'}</strong> {siswa.kelas ? `· Kelas ${siswa.kelas}` : ''}
                </p>
              )}
              <Results result={result} onReset={reset} />
            </>
          )}
        </main>
      )}

      {/* History Page */}
      {tab === 'riwayat' && (
        <main className="main-content container-narrow">
          <div className="card">
            <div className="row between">
              <h2>Riwayat klasifikasi ({history.length})</h2>
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
            {!history.length && <p className="muted">Belum ada data riwayat pemeriksaan.</p>}
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

      {/* About Page */}
      {tab === 'tentang' && (
        <main className="main-content container-narrow">
          <div className="card about-card">
            <h2>Tentang SISKA-AI</h2>
            <p>
              <strong>SISKA-AI (Sistem Klasifikasi Kesehatan Siswa)</strong> merupakan aplikasi triase berbasis web yang dirancang khusus untuk membantu Unit Kesehatan Sekolah (UKS) di <strong>SMP Wisata Sanur</strong>.
            </p>
            <p>
              Aplikasi ini menganalisis keluhan fisik atau kesehatan yang disampaikan siswa secara cepat dan objektif, guna memilah tingkat keparahan (Ringan, Sedang, atau Berat) serta menentukan keputusan terbaik.
            </p>

            <div className="school-info-box">
              <h3>Profil SMP Wisata Sanur</h3>
              <ul>
                <li><strong>Alamat:</strong> Jl. Danau Buyan No.58, Sanur, Denpasar Selatan, Kota Denpasar, Bali 80227</li>
                <li><strong>Telepon:</strong> (0361) 288508</li>
                <li><strong>Website Resmi:</strong> <a href="https://www.smpwisatasanur.sch.id" target="_blank" rel="noreferrer">smpwisatasanur.sch.id</a></li>
                <li><strong>Slogan:</strong> Berkarakter, Berprestasi dan Berbudaya</li>
              </ul>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <p className="copyright">© 2026 SMP Wisata Sanur · SISKA-AI UKS System</p>
            <p className="disclaimer">Alat bantu triase kesehatan sekolah, bukan pengganti diagnosis medis penuh.</p>
          </div>
          <div className="footer-right">
            <span className={`status-pill ${online ? 'online' : 'offline'}`}>
              {online ? 'System Online' : 'Offline Mode'}
            </span>
            <span className="status-pill model-pill">
              {cfg.enabled ? `AI: ${cfg.model}` : 'Rule Engine Active'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
