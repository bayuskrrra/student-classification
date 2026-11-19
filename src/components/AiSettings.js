import React, { useEffect, useState, useCallback } from 'react';
import { PROVIDERS, getLlmSettings, saveLlmSettings, clearLlmSettings, maskKey, isHttpsPage } from '../lib/llmSettings';
import { testLlm } from '../lib/classifier';

export default function AiSettings({ open, onClose, onSaved }) {
  const [provider, setProvider] = useState('kenari');
  const [base, setBase] = useState('https://kenari.id/v1');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);   // daftar model yang sudah ter-pull
  const [fetchingModels, setFetchingModels] = useState(false);
  const [proxyReady, setProxyReady] = useState(false);    // server punya key (mode siap pakai)

  // Ambil daftar model dari Ollama lokal
  const fetchOllamaModels = useCallback(async (baseUrl) => {
    const ollamaBase = (baseUrl || 'http://localhost:11434').replace('/v1', '');
    setFetchingModels(true);
    try {
      const res = await fetch(`${ollamaBase}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Ollama tidak merespons');
      const data = await res.json();
      const names = (data.models || []).map((m) => m.name);
      setOllamaModels(names);
      // Auto-pilih model pertama jika model belum diset atau tidak ada di daftar
      if (names.length > 0) {
        setModel((prev) => (names.includes(prev) ? prev : names[0]));
      }
      if (names.length === 0) {
        setMsg({ type: 'bad', text: 'Tidak ada model di Ollama. Jalankan: ollama pull llama3.2' });
      } else {
        setMsg(null);
      }
    } catch (_) {
      setOllamaModels([]);
      setMsg({ type: 'bad', text: 'Ollama tidak dapat dijangkau. Pastikan Ollama sudah berjalan (ollama serve).' });
    } finally {
      setFetchingModels(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const s = getLlmSettings();
    setProvider(s.provider);
    setBase(s.base);
    setModel(s.model);
    setKey(s.key);
    setMsg(null);
    setShowKey(false);
    setOllamaModels([]);
    // Auto-fetch model Ollama saat dialog dibuka
    if (s.provider === 'ollama') {
      fetchOllamaModels(s.base);
    }
    fetch('/api/classify', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProxyReady(Boolean(d && d.configured)))
      .catch(() => setProxyReady(false));
  }, [open, fetchOllamaModels]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const preset = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const isOllama = provider === 'ollama';

  const pickProvider = (id) => {
    const p = PROVIDERS.find((x) => x.id === id) || PROVIDERS[0];
    setProvider(id);
    setBase(p.base);
    setModel(p.model);
    setMsg(null);
    setOllamaModels([]);
    if (id === 'ollama') fetchOllamaModels(p.base);
  };

  const current = () => ({ provider, base: base.trim(), model: model.trim(), key: key.trim() });

  const runTest = async () => {
    setTesting(true);
    setMsg(null);
    try {
      await testLlm(current());
      setMsg({ type: 'ok', text: 'Koneksi berhasil. Model merespons.' });
    } catch (e) {
      setMsg({ type: 'bad', text: `Gagal: ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    const cfg = saveLlmSettings(current());
    onSaved(cfg);
    onClose();
  };

  const remove = () => {
    const cfg = clearLlmSettings();
    onSaved(cfg);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ai-title">
        <div className="modal-head">
          <div>
            <h2 id="ai-title">Pengaturan AI</h2>
            <p className="muted small">Hubungkan model bahasa untuk klasifikasi otomatis.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">×</button>
        </div>

        <form onSubmit={save} className="modal-body">
          {proxyReady && (
            <p className="inline-msg ok">
              AI sudah aktif lewat server (key tersimpan aman di server). Anda tidak perlu mengisi apa pun —
              klasifikasi berjalan otomatis tanpa perlu menyalakan komputer/laptop.
            </p>
          )}
          {isHttpsPage() && (
            <p className="inline-msg warn">
              Situs ini dibuka lewat https. Provider <strong>lokal (Ollama)</strong> tidak bisa dipakai di sini —
              browser memblokir akses ke http://localhost. Pakai provider cloud gratis seperti Kenari.id.
            </p>
          )}
          <label className="field">
            <span>Provider</span>
            <select value={provider} onChange={(e) => pickProvider(e.target.value)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Base URL</span>
            <input
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="http://localhost:11434/v1"
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          {/* Model — Ollama: dropdown dari daftar yg sudah di-pull; lainnya: free-text */}
          <label className="field">
            <span>
              Model
              {isOllama && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginLeft: 8, fontSize: '0.78rem', padding: '2px 8px' }}
                  onClick={() => fetchOllamaModels(base)}
                  disabled={fetchingModels}
                >
                  {fetchingModels ? 'Memuat…' : '↻ Refresh'}
                </button>
              )}
            </span>
            {isOllama && ollamaModels.length > 0 ? (
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {ollamaModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={isOllama ? 'Klik Refresh untuk memuat model…' : (preset.model || 'nama-model')}
                  list="model-suggestions"
                  autoComplete="off"
                  spellCheck="false"
                />
                <datalist id="model-suggestions">
                  {(preset.models || []).map((m) => <option key={m} value={m} />)}
                </datalist>
              </>
            )}
            {isOllama && ollamaModels.length > 0 && (
              <small className="muted small">
                {ollamaModels.length} model tersedia di Ollama lokal Anda.
              </small>
            )}
          </label>

          {/* API key — sembunyikan untuk Ollama */}
          {!isOllama && (
            <label className="field">
              <span>API key</span>
              <div className="input-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={preset.hint || 'Tempel API key di sini'}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button type="button" className="btn-ghost" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
              <small className="muted small">
                {key ? `Tersimpan: ${maskKey(key)}` : 'Key hanya disimpan di browser ini (localStorage), tidak dikirim ke server aplikasi.'}
              </small>
            </label>
          )}

          {msg && <p className={`inline-msg ${msg.type}`}>{msg.text}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={runTest} disabled={testing || !base || !model}>
              {testing ? 'Menguji…' : 'Tes koneksi'}
            </button>
            <div className="spacer" />
            {key && !isOllama && (
              <button type="button" className="btn-ghost danger-text" onClick={remove}>
                Hapus key
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={!base || !model}>
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
