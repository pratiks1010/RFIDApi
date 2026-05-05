import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCloudDownloadAlt, FaInfoCircle, FaRocket } from 'react-icons/fa';
import '../styles/AboutSparkleApplication.css';

const AboutSparkleApplication = () => {
  const navigate = useNavigate();
  const [version, setVersion] = React.useState('N/A');
  const [latestVersion, setLatestVersion] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [readyToInstall, setReadyToInstall] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const hasDesktopApi = typeof window !== 'undefined' && !!window.electronAPI?.appGetVersion;

  React.useEffect(() => {
    if (!hasDesktopApi) return;
    window.electronAPI.appGetVersion()
      .then((result) => {
        const appVersion = String(result?.version || '').trim();
        setVersion(appVersion || 'N/A');
      })
      .catch(() => setVersion('N/A'));
  }, [hasDesktopApi]);

  React.useEffect(() => {
    if (!window.electronAPI?.onAppUpdaterStatus) return undefined;
    const unsub = window.electronAPI.onAppUpdaterStatus((event) => {
      if (!event?.type) return;
      if (event.type === 'update-available') {
        setLatestVersion(event?.version || '');
        setStatus(event?.message || 'Update available.');
        setProgress(8);
        setModalOpen(true);
        setReadyToInstall(false);
      } else if (event.type === 'download-started') {
        setStatus(event?.message || 'Downloading update...');
        setProgress((prev) => Math.max(prev, 12));
      } else if (event.type === 'download-progress') {
        setStatus('Downloading update package...');
        setProgress(Number(event?.progress || 0));
      } else if (event.type === 'update-downloaded') {
        setLatestVersion(event?.version || latestVersion);
        setStatus(event?.message || 'Update downloaded successfully.');
        setProgress(100);
        setReadyToInstall(true);
      } else if (event.type === 'update-not-available') {
        setStatus('You are already on the latest version.');
        setProgress(100);
        setModalOpen(true);
      } else if (event.type === 'error') {
        setStatus(event?.message || 'Update operation failed.');
        setProgress(0);
        setModalOpen(true);
      }
    });
    return () => unsub?.();
  }, [latestVersion]);

  const handleCheck = async () => {
    if (!window.electronAPI?.appCheckForUpdates || busy) return;
    setBusy(true);
    setStatus('Checking for updates...');
    setProgress(5);
    setModalOpen(true);
    setReadyToInstall(false);
    try {
      const result = await window.electronAPI.appCheckForUpdates();
      if (!result?.ok) {
        setStatus(
          result?.reason === 'skipped'
            ? (result?.details || 'Auto-update is disabled in development mode.')
            : result?.reason === 'not-configured'
              ? (result?.details || 'Updater feed URL is not configured for this build.')
              : (result?.reason || 'Unable to check updates right now.')
        );
        setProgress(0);
        return;
      }
      if (result?.updateAvailable) {
        setLatestVersion(result?.latestVersion || '');
        setStatus(`New version ${result?.latestVersion} found.`);
        setProgress(10);
      } else {
        setLatestVersion(result?.latestVersion || result?.currentVersion || '');
        setStatus(`You are on latest version (${result?.currentVersion || version}).`);
        setProgress(100);
      }
    } catch (error) {
      setStatus(error?.message || 'Unable to check updates right now.');
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!window.electronAPI?.appStartUpdateDownload || busy) return;
    setBusy(true);
    try {
      const result = await window.electronAPI.appStartUpdateDownload();
      if (!result?.ok) {
        setStatus(result?.reason || 'Failed to start download.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = async () => {
    if (!window.electronAPI?.appInstallDownloadedUpdate || busy) return;
    setBusy(true);
    setStatus('Restarting app to install update...');
    try {
      await window.electronAPI.appInstallDownloadedUpdate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sparkle-about-page">
      <div className="sparkle-about-header">
        <button type="button" className="sparkle-back-btn" onClick={() => navigate('/rfid-utility')}>
          <FaArrowLeft /> Back to RFID Utility Center
        </button>
        <h1>About Current Sparkle Application</h1>
        <p>View EXE version details and install new updates with guided progress.</p>
      </div>

      <div className="sparkle-about-card">
        <div className="sparkle-about-meta">
          <span className="sparkle-badge"><FaInfoCircle /> Installed Version</span>
          <h2>v{version}</h2>
          <p>RFID Utility Center desktop build currently running on this system.</p>
        </div>
        <div className="sparkle-about-actions">
          <button type="button" className="sparkle-primary-btn" onClick={handleCheck} disabled={!hasDesktopApi || busy}>
            <FaRocket /> {busy ? 'Please wait...' : 'Check for Updates'}
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="sparkle-update-overlay">
          <div className="sparkle-update-modal">
            <h3>Update Center</h3>
            <p className="sparkle-update-subtitle">{status || 'Preparing updater...'}</p>
            {!!latestVersion && <p className="sparkle-update-version">Latest available: v{latestVersion}</p>}
            <div className="sparkle-progress-track">
              <div className="sparkle-progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
            <div className="sparkle-progress-text">{Math.max(0, Math.min(100, progress))}%</div>
            <div className="sparkle-update-actions">
              {!readyToInstall ? (
                <button type="button" className="sparkle-primary-btn" onClick={handleDownload} disabled={busy || progress >= 100 || !latestVersion}>
                  <FaCloudDownloadAlt /> {busy ? 'Please wait...' : 'Download Update'}
                </button>
              ) : (
                <button type="button" className="sparkle-primary-btn" onClick={handleInstall} disabled={busy}>
                  Install and Restart
                </button>
              )}
              <button type="button" className="sparkle-ghost-btn" onClick={() => setModalOpen(false)} disabled={busy}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutSparkleApplication;
