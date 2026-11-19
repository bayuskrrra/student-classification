import React from 'react';
import { STATUS } from '../lib/classifier';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  PrinterIcon,
  ArrowRightIcon,
} from './Icons';

const META = {
  [STATUS.LAYAK]: {
    cls: 'ok',
    title: 'Layak Melanjutkan Belajar',
    icon: <CheckCircleIcon size={24} />,
  },
  [STATUS.OBSERVASI]: {
    cls: 'warn',
    title: 'Perlu Observasi di UKS',
    icon: <AlertCircleIcon size={24} />,
  },
  [STATUS.TIDAK]: {
    cls: 'bad',
    title: 'Tidak Layak Melanjutkan Belajar',
    icon: <AlertTriangleIcon size={24} />,
  },
};

export default function Results({ result, siswa, onReset }) {
  if (!result) return null;
  const meta = META[result.status] || META[STATUS.OBSERVASI];
  const pct = Math.round((result.confidence || 0) * 100);

  return (
    <div className={`card result ${meta.cls}`}>
      <div className="result-head">
        <span className="badge">{meta.icon}</span>
        <div>
          <h2>{meta.title}</h2>
          <p className="muted">Keyakinan {pct}% · sumber: {result.sumber}</p>
        </div>
        {/* Foto siswa tampil di pojok kanan result */}
        {siswa?.photo && (
          <img src={siswa.photo} alt="Foto siswa" className="result-photo" />
        )}
      </div>

      <div className="block">
        <h3>Alasan</h3>
        <p>{result.alasan}</p>
      </div>

      <div className="block">
        <h3>Rekomendasi tindakan</h3>
        <p>{result.rekomendasi}</p>
      </div>

      {result.redFlags?.length > 0 && (
        <div className="block danger">
          <h3>Tanda bahaya</h3>
          <ul>{result.redFlags.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}

      {result.catatan && <p className="note">{result.catatan}</p>}

      <div className="actions">
        <button className="btn-ghost" onClick={() => window.print()}>
          <PrinterIcon size={16} />
          <span>Cetak</span>
        </button>
        <button className="btn-primary" onClick={onReset}>
          <span>Siswa berikutnya</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
