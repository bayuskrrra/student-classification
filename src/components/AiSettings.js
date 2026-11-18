import React, { useEffect, useState } from 'react';
import { PROVIDERS, getLlmSettings, saveLlmSettings, clearLlmSettings, maskKey } from '../lib/llmSettings';
import { testLlm } from '../lib/classifier';

export default function AiSettings({ open, onClose, onSaved }) {
  const [provider, setProvider] = useState('kenari');
  const [base, setBase] = useState('');
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!open) return;
    const s = getLlmSettings();
    setProvider(s.provider);
    setBase(s.base);
    setModel(s.model);
    setKey(s.key);
    setMsg(null);
    setShowKey(false);
  }, [open]);

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

  const pickProvider = (id) => {
    const p = PROVIDERS.find((x) => x.id === id) || PROVIDERS[0];
    setProvider(id);
    setBase(p.base);
    setModel(p.model);
    setMsg(null);
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
              placeholder="https://kenari.id/v1"
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          <label className="field">
            <span>Model</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={preset.model || 'nama-model'}
              list="model-suggestions"
              autoComplete="off"
              spellCheck="false"
            />
            <datalist id="model-suggestions">
              {(preset.models || []).map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>

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

          {msg && <p className={`inline-msg ${msg.type}`}>{msg.text}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={runTest} disabled={testing || !base || !model}>
              {testing ? 'Menguji…' : 'Tes koneksi'}
            </button>
            <div className="spacer" />
            {key && (
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
