import React, { useState, useEffect } from 'react';

const ServerDownPage = () => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds} WIB`);
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const styles = `
    :root {
      --bg: #0a0a0a;
      --surface: #111111;
      --border: #2a2a2a;
      --text-primary: #f0f0f0;
      --text-secondary: #888888;
      --text-muted: #555555;
      --accent: #ffffff;
      --dot: #ffffff;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background-color: var(--bg);
      color: var(--text-primary);
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
      z-index: 0;
    }

    .container {
      text-align: center;
      padding: 48px 32px;
      max-width: 640px;
      width: 100%;
      position: relative;
      z-index: 1;
    }

    .server-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 32px;
      border: 2px solid var(--border);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
      position: relative;
      animation: pulse-border 2.5s ease-in-out infinite;
    }

    .server-icon::before,
    .server-icon::after {
      content: '';
      position: absolute;
      left: 12px;
      right: 12px;
      height: 2px;
      background: var(--border);
      border-radius: 1px;
    }

    .server-icon::before {
      top: 32px;
    }
    .server-icon::after {
      top: 48px;
    }

    .server-icon .led {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--dot);
      top: 12px;
      right: 12px;
      animation: blink 1.2s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }

    @keyframes pulse-border {
      0%, 100% { border-color: var(--border); }
      50% { border-color: #3a3a3a; }
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border: 1px solid var(--border);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
      background: var(--surface);
      margin-bottom: 24px;
    }

    .status-badge .dot-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--dot);
      animation: blink 1.2s ease-in-out infinite;
    }

    h1 {
      font-size: clamp(1.8rem, 5vw, 2.8rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .description {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .description-sub {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 36px;
    }

    .divider {
      width: 48px;
      height: 1px;
      background: var(--border);
      margin: 0 auto 32px;
    }

    .info-grid {
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
      margin-bottom: 36px;
    }

    .info-item {
      text-align: center;
    }

    .info-item .label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .info-item .value {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .btn-group {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-primary);
      font-family: inherit;
    }

    .btn:hover {
      border-color: #444;
      background: #1a1a1a;
    }

    .btn:active {
      transform: scale(0.98);
      background: #0e0e0e;
    }

    .btn-primary {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
    }

    .btn-primary:hover {
      background: #e0e0e0;
      border-color: #e0e0e0;
    }

    .footer {
      margin-top: 40px;
      font-size: 0.75rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    @media (max-width: 480px) {
      .container {
        padding: 32px 20px;
      }
      .info-grid {
        gap: 24px;
      }
      .btn-group {
        flex-direction: column;
        align-items: center;
      }
      .btn {
        width: 100%;
        max-width: 280px;
        justify-content: center;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="server-icon">
          <span className="led"></span>
        </div>

        <div className="status-badge">
          <span className="dot-indicator"></span>
          Outage Terdeteksi
        </div>

        <h1>Server Sedang Gangguan</h1>

        <p className="description">
          Layanan kami saat ini sedang mengalami gangguan teknis.
          Tim kami sedang bekerja keras untuk memulihkan layanan secepat mungkin.
        </p>
        <p className="description-sub">
          Mohon maaf atas ketidaknyamanan yang ditimbulkan.
        </p>

        <div className="divider"></div>

        <div className="info-grid">
          <div className="info-item">
            <div className="label">Status</div>
            <div className="value">⚠ Tidak Tersedia</div>
          </div>
          <div className="info-item">
            <div className="label">Estimasi Pemulihan</div>
            <div className="value">± 60 menit</div>
          </div>
          <div className="info-item">
            <div className="label">Terakhir Update</div>
            <div className="value">{currentTime}</div>
          </div>
        </div>

        <div className="btn-group">
          <button className="btn" onClick={() => window.location.reload()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Muat Ulang
          </button>
          <a href="mailto:sultansyamsuddin1@gmail.com" className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
            Hubungi Support
          </a>
        </div>

        <div className="footer">
          &copy; 2025 Aivy Music &mdash; Semua hak dilindungi
        </div>
      </div>
    </>
  );
};

export default ServerDownPage;