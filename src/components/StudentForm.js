import React, { useState, useRef, useCallback } from 'react';
import { CameraIcon, FlipCameraIcon, PulseIcon } from './Icons';

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

  // ---- Kamera ----
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [photo, setPhoto] = useState(null); // base64 data URL
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = useCallback(async (facing) => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing || facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setCameraError(`Kamera tidak bisa diakses: ${err.message}`);
    }
  }, [facingMode]);

  const openCamera = () => {
    setPhoto(null);
    setCameraOpen(true);
    setTimeout(() => startCamera(facingMode), 100);
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraError(null);
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
    closeCamera();
  };

  const removePhoto = () => setPhoto(null);

  // ---- Submit ----
  const submit = (e) => {
    e.preventDefault();
    if (!keluhan.trim()) return;
    onSubmit({ nama: nama.trim(), kelas: kelas.trim(), keluhan: keluhan.trim(), photo: photo || null });
  };

  return (
    <>
      <form onSubmit={submit} className="card">
        <div className="student-grid-row">
          <label className="field">
            <span>Nama siswa</span>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Opsional" />
          </label>
          <label className="field">
            <span>Kelas</span>
            <input value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="Contoh: XI IPA 2" />
          </label>
        </div>

        {/* Foto siswa */}
        <div className="field photo-field">
          <span className="field-label">Foto siswa <span className="muted small">(opsional)</span></span>
          {photo ? (
            <div className="photo-preview-wrap">
              <img src={photo} alt="Foto siswa" className="photo-preview" />
              <button type="button" className="btn-ghost photo-remove-btn" onClick={removePhoto}>
                × Hapus foto
              </button>
            </div>
          ) : (
            <button type="button" className="btn-ghost camera-btn" onClick={openCamera}>
              <CameraIcon size={16} />
              <span>Ambil Foto</span>
            </button>
          )}
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
          {loading ? (
            'Menganalisis…'
          ) : (
            <>
              <PulseIcon size={18} />
              <span>Klasifikasi Sekarang</span>
            </>
          )}
        </button>
      </form>

      {/* Modal kamera */}
      {cameraOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeCamera(); }}>
          <div className="modal camera-modal" role="dialog" aria-modal="true" aria-label="Kamera">
            <div className="modal-head">
              <h2>Ambil Foto Siswa</h2>
              <button type="button" className="icon-btn" onClick={closeCamera} aria-label="Tutup">×</button>
            </div>
            <div className="camera-body">
              {cameraError ? (
                <p className="inline-msg bad">{cameraError}</p>
              ) : (
                <video
                  ref={videoRef}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                />
              )}
            </div>
            <div className="modal-actions camera-actions">
              <button type="button" className="btn-ghost" onClick={flipCamera} title="Ganti kamera">
                <FlipCameraIcon size={16} />
                <span>Balik</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={takePhoto}
                disabled={!!cameraError}
              >
                <CameraIcon size={16} />
                <span>Ambil Foto</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
