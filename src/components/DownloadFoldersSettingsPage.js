import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCheckCircle, FaFolderOpen, FaInfoCircle, FaLayerGroup } from 'react-icons/fa';
import {
  RiFileExcel2Line,
  RiFilePdf2Line,
  RiDraftLine,
} from 'react-icons/ri';
import {
  clearExportDownloadFolder,
  clearPrnDownloadFolder,
  getExportDownloadFolder,
  getPrnDownloadFolder,
  isElectronBinarySaveAvailable,
  isElectronFolderPickerAvailable,
  setExportDownloadFolder,
  setPrnDownloadFolder,
} from '../services/exportDownloadHelper';

const shell = {
  width: '100%',
  minHeight: 'calc(100vh - 48px)',
  boxSizing: 'border-box',
  fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 35%, #eef2ff 100%)',
};

const hero = {
  width: '100%',
  padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 48px) clamp(32px, 5vw, 52px)',
  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 42%, #4c1d95 100%)',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
};

const heroGlow = {
  position: 'absolute',
  width: 'min(80vw, 520px)',
  height: 'min(80vw, 520px)',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)',
  top: '-20%',
  right: '-10%',
  pointerEvents: 'none',
};

const btnPrimary = {
  border: 'none',
  borderRadius: 12,
  padding: '12px 20px',
  fontWeight: 700,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a855f7 100%)',
  color: '#fff',
  fontSize: 14,
  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const btnGhost = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '12px 18px',
  fontWeight: 600,
  cursor: 'pointer',
  background: '#fff',
  color: '#475569',
  fontSize: 14,
  transition: 'background 0.15s ease, border-color 0.15s ease',
};

const FolderCard = ({
  title,
  subtitle,
  icon: Icon,
  accent,
  bullets,
  pathDisplay,
  onChoose,
  onClear,
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid rgba(226, 232, 240, 0.9)',
      boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 20px 40px -12px rgba(15, 23, 42, 0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <div
      style={{
        padding: '20px 22px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${accent}18 0%, ${accent}30 100%)`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 26,
        }}
      >
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(1.05rem, 2vw, 1.2rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      </div>
    </div>

    <div style={{ padding: '16px 22px 10px', flex: 1 }}>
      <ul style={{ margin: 0, padding: '0 0 0 18px', color: '#475569', fontSize: 13, lineHeight: 1.65 }}>
        {bullets.map((b) => (
          <li key={b} style={{ marginBottom: 4 }}>
            {b}
          </li>
        ))}
      </ul>
    </div>

    <div style={{ padding: '8px 22px 20px' }}>
      <div
        style={{
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          color: pathDisplay ? '#0f172a' : '#94a3b8',
          background: pathDisplay ? '#f8fafc' : '#fafafa',
          border: `1px solid ${pathDisplay ? '#e2e8f0' : '#f1f5f9'}`,
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 16,
          wordBreak: 'break-all',
          lineHeight: 1.5,
          borderLeft: `4px solid ${accent}`,
        }}
      >
        {pathDisplay || 'Not set — files use your default download location'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          style={btnPrimary}
          onClick={onChoose}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = '';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
          }}
        >
          <FaFolderOpen size={15} aria-hidden />
          Choose folder
        </button>
        <button type="button" style={btnGhost} onClick={onClear}>
          Clear path
        </button>
      </div>
    </div>
  </div>
);

const DownloadFoldersSettingsPage = () => {
  const [exportPath, setExportPath] = useState(() => getExportDownloadFolder());
  const [prnPath, setPrnPath] = useState(() => getPrnDownloadFolder());
  const electronPicker = isElectronFolderPickerAvailable();
  const electronSave = isElectronBinarySaveAvailable();

  const refresh = useCallback(() => {
    setExportPath(getExportDownloadFolder());
    setPrnPath(getPrnDownloadFolder());
  }, []);

  const pickExport = async () => {
    if (!electronPicker) {
      toast.info(
        'Folder picker runs in the Sparkle RFID Windows desktop (EXE). In the browser, files go to your usual Downloads folder.',
        { theme: 'colored', position: 'top-right', autoClose: 5000 }
      );
      return;
    }
    const p = await window.electronAPI.selectFolder();
    if (p) {
      setExportDownloadFolder(p);
      refresh();
      toast.success('Export folder saved. Excel and PDF exports from labelled stock will write here.', { theme: 'colored' });
    }
  };

  const pickPrn = async () => {
    if (!electronPicker) {
      toast.info(
        'Folder picker runs in the Sparkle RFID Windows desktop (EXE). In the browser, PRN files use your usual Downloads folder.',
        { theme: 'colored', position: 'top-right', autoClose: 5000 }
      );
      return;
    }
    const p = await window.electronAPI.selectFolder();
    if (p) {
      setPrnDownloadFolder(p);
      refresh();
      toast.success('PRN folder saved. All .prn downloads from Create PRN Label will write here.', { theme: 'colored' });
    }
  };

  return (
    <div style={shell}>
      <div style={hero}>
        <div style={heroGlow} aria-hidden />
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Link
            to="/profile-menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'rgba(255,255,255,0.88)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <FaArrowLeft size={12} />
            Back to Developer Hub
          </Link>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ maxWidth: 'min(100%, 720px)' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.75rem, 4vw, 2.35rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                }}
              >
                Download folders
              </h1>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 'clamp(0.95rem, 1.8vw, 1.05rem)',
                  lineHeight: 1.6,
                  color: 'rgba(226, 232, 240, 0.95)',
                  maxWidth: 640,
                }}
              >
                Control where exports land on this PC. Use the full width below to configure <strong style={{ color: '#fff' }}>inventory exports</strong> and{' '}
                <strong style={{ color: '#fff' }}>PRN label files</strong> separately — ideal for fixed folders on showroom or back-office machines.
              </p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 999,
                background: electronSave ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                border: `1px solid ${electronSave ? 'rgba(74, 222, 128, 0.45)' : 'rgba(253, 224, 71, 0.5)'}`,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {electronSave ? <FaCheckCircle style={{ opacity: 0.95 }} /> : <FaInfoCircle style={{ opacity: 0.95 }} />}
              {electronSave ? 'Desktop EXE — direct save enabled' : 'Browser — default downloads'}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'clamp(20px, 3vw, 36px) clamp(16px, 3vw, 40px) clamp(40px, 5vw, 64px)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {!electronSave && (
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              padding: '16px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: 14,
              lineHeight: 1.55,
              marginBottom: 28,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
            }}
          >
            <FaInfoCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              You are in the <strong>browser</strong> (or binary save is off). Paths you save here are remembered, but files still download through the browser until you use the{' '}
              <strong>Windows EXE</strong>, where the app can write straight into the folders you pick.
            </span>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 'clamp(20px, 3vw, 28px)',
            alignItems: 'stretch',
          }}
        >
          <FolderCard
            title="Labelled stock & reports"
            subtitle="Excel exports, PDF exports, and printable stock reports from the inventory list."
            icon={RiFileExcel2Line}
            accent="#2563eb"
            bullets={[
              'Bulk Excel export from Label Stock',
              'PDF export from the export modal',
              'Label stock summary / report PDFs',
            ]}
            pathDisplay={exportPath}
            onChoose={pickExport}
            onClear={() => {
              clearExportDownloadFolder();
              refresh();
              toast.info('Export folder cleared.', { theme: 'colored' });
            }}
          />
          <FolderCard
            title="PRN label files (.prn)"
            subtitle="Create PRN Label — every download path uses this folder when set."
            icon={RiDraftLine}
            accent="#7c3aed"
            bullets={[
              'Single row PRN download',
              'Download all (multiple .prn files)',
              'Combined multi-label .prn & single print',
            ]}
            pathDisplay={prnPath}
            onChoose={pickPrn}
            onClear={() => {
              clearPrnDownloadFolder();
              refresh();
              toast.info('PRN folder cleared.', { theme: 'colored' });
            }}
          />
        </div>

        <div
          style={{
            marginTop: 32,
            padding: '20px 24px',
            borderRadius: 16,
            background: '#fff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 13 }}>
            <span style={{ display: 'flex', color: '#6366f1' }}>
              <RiFilePdf2Line size={22} />
            </span>
            <span style={{ display: 'flex', color: '#6366f1' }}>
              <FaLayerGroup size={20} />
            </span>
            <span style={{ lineHeight: 1.45 }}>
              Tip: pick a dedicated folder per workflow (e.g. <strong style={{ color: '#334155' }}>Exports\Stock</strong> vs <strong style={{ color: '#334155' }}>PRN\Bartender</strong>) so operators always know where to look.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadFoldersSettingsPage;
