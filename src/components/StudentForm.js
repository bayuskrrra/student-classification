import React, { useState } from 'react';

const CONTOH = [
  'Pusing ringan, belum sarapan, sudah minum air',
  'Demam 38 derajat, mual, lemas sejak pagi',
  'Sesak napas dan nyeri dada saat olahraga',
  'Sakit perut, muntah 4 kali, tidak mau minum',
  'Nyeri haid, kram perut, masih bisa duduk',
  'Terjatuh, kepala terbentur, sekarang bingung',
];

export default function StudentForm({ onSubmit, loading }) {
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [keluhan, setKeluhan] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!keluhan.trim()) return;
    onSubmit({ nama: nama.trim(), kelas: kelas.trim(), keluhan: keluhan.trim() });
  };

  return (
    <form onSubmit={submit} className="card">
      <div className="row">
        <label className="field">
          <span>Nama siswa</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Opsional" />
        </label>
        <label className="field">
          <span>Kelas</span>
          <input value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Contoh: XI IPA 2" />
        </label>
      </div>

      <label className="field">
        <span>Keluhan yang disampaikan siswa</span>
        <textarea
          rows={5}
          value={keluhan}
          onChange={(e) => setKeluhan(e.target.value)}
          placeholder="Tulis apa adanya, misal: demam sejak pagi, mual, badan lemas, sudah minum paracetamol"
        />
      </label>

      <div className="chips">
        {CONTOH.map((c) => (
          <button type="button" key={c} className="chip" onClick={() => setKeluhan(c)}>
            {c.length > 34 ? c.slice(0, 34) + '…' : c}
          </button>
        ))}
      </div>

      <button type="submit" className="btn-primary" disabled={loading || !keluhan.trim()}>
        {loading ? 'Menganalisis…' : 'Klasifikasi sekarang'}
      </button>
    </form>
  );
}
