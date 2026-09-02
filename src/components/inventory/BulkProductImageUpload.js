import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaSearch,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import PageHeader from '../common/PageHeader';
import UiButton from '../common/UiButton';
import {
  ACCEPTED_IMAGE_EXT,
  MAX_FILE_BYTES,
  WARN_FILE_COUNT,
  WARN_TOTAL_BYTES,
  getProductImagePreviewUrl,
  isAcceptedImageFile,
  itemCodeFromFileName,
  resolveLoggedInClientCode,
  searchLabelledStockByItemCode,
  uploadBulkProductImagesByItemCode,
} from '../../services/bulkProductImageUploadApi';

const ACCEPT_ATTR = ACCEPTED_IMAGE_EXT.join(',');
const PAGE_SIZE = 15;

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const newRowId = () =>
  `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const serverText = (err) =>
  String(
    err?.result?.message ||
      err?.response?.data?.Message ||
      err?.response?.data?.message ||
      err?.message ||
      'Upload failed.'
  ).trim();

const BulkProductImageUpload = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const rowsRef = useRef([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [rows, setRows] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [page, setPage] = useState(1);

  const clientCode = useMemo(() => resolveLoggedInClientCode(), []);

  rowsRef.current = rows;
  useEffect(
    () => () => {
      rowsRef.current.forEach((row) => {
        if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
      });
    },
    []
  );

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const next = [];
    let rejected = 0;
    incoming.forEach((file) => {
      if (!isAcceptedImageFile(file)) {
        rejected += 1;
        return;
      }
      next.push({
        id: newRowId(),
        file,
        previewUrl: URL.createObjectURL(file),
        itemCode: itemCodeFromFileName(file.name),
        productName: '',
        categoryName: '',
        designName: '',
        matched: false,
      });
    });
    if (rejected) {
      toast.warn(`${rejected} file${rejected === 1 ? '' : 's'} skipped. Use JPG, JPEG, PNG, WEBP, GIF or BMP.`);
    }
    if (!next.length) return;
    setRows((prev) => {
      const merged = [...prev, ...next];
      setPage(Math.max(1, Math.ceil(merged.length / PAGE_SIZE)));
      return merged;
    });
    setResult(null);
    setShowResultModal(false);
    setServerMessage('');
  }, []);

  const onPick = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const clearAll = () => {
    setRows((prev) => {
      prev.forEach((row) => {
        if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
      });
      return [];
    });
    setPage(1);
    setResult(null);
    setShowResultModal(false);
    setServerMessage('');
    setProgress(0);
  };

  const setRowItemCode = (id, itemCode, extra = {}) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              itemCode,
              productName: extra.productName ?? '',
              categoryName: extra.categoryName ?? '',
              designName: extra.designName ?? '',
              matched: extra.matched === true,
            }
          : row
      )
    );
  };

  const removeRow = (id) => {
    setRows((prev) => {
      const hit = prev.find((row) => row.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      const next = prev.filter((row) => row.id !== id);
      const nextPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage((p) => Math.min(p, nextPages));
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = String(row.itemCode || '').trim() || '__empty__';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return map;
  }, [rows]);

  const productCount = useMemo(
    () => [...grouped.keys()].filter((k) => k !== '__empty__').length,
    [grouped]
  );
  const emptyCount = rows.filter((row) => !String(row.itemCode || '').trim()).length;
  const oversizeCount = rows.filter((row) => row.file.size > MAX_FILE_BYTES).length;
  const totalBytes = rows.reduce((sum, row) => sum + (row.file.size || 0), 0);
  const canUpload = rows.length > 0 && emptyCount === 0 && !uploading && Boolean(clientCode);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleUpload = async () => {
    if (!canUpload) {
      if (!clientCode) {
        const msg = 'Client code is missing. Please sign in again.';
        setServerMessage(msg);
        toast.error(msg);
      } else if (emptyCount) {
        const msg = 'Assign ItemCode on every image before upload.';
        setServerMessage(msg);
        toast.error(msg);
      }
      return;
    }
    if (replaceExisting) {
      const ok = window.confirm('Old images for these products will be replaced. Continue?');
      if (!ok) return;
    }
    if (oversizeCount) toast.warn(`${oversizeCount} file${oversizeCount === 1 ? '' : 's'} over 10 MB.`);
    if (rows.length > WARN_FILE_COUNT || totalBytes > WARN_TOTAL_BYTES) {
      toast.warn('Large batch — upload may take a few minutes.');
    }

    setUploading(true);
    setProgress(8);
    setResult(null);
    setServerMessage('Uploading images…');
    const trickle = setInterval(() => {
      setProgress((prev) => (prev < 88 ? prev + 2 : prev));
    }, 400);
    try {
      const parsed = await uploadBulkProductImagesByItemCode({
        clientCode,
        replaceExisting,
        items: rows.map((row) => ({ file: row.file, itemCode: row.itemCode })),
        onUploadProgress: (pct) => setProgress((prev) => Math.max(prev, pct)),
      });
      setProgress(100);
      setResult(parsed);
      setShowResultModal(true);
      setServerMessage(parsed.message || 'Bulk product images uploaded.');
      toast.success(parsed.message || 'Bulk product images uploaded.');
    } catch (err) {
      setProgress(0);
      const msg = serverText(err);
      const parsed = err?.result || {
        ok: false,
        status: 'Error',
        message: msg,
        updatedProducts: 0,
        uploadedFiles: 0,
        skippedProducts: 0,
        failedFiles: 0,
        products: [],
        skipped: [],
        errors: [{ Message: msg }],
      };
      setResult(parsed);
      setShowResultModal(true);
      setServerMessage(msg);
      toast.error(msg);
    } finally {
      clearInterval(trickle);
      setUploading(false);
    }
  };

  return (
    <div className="bpiu">
      <PageHeader
        title="Bulk Upload Product Images"
        subtitle="Select images and assign ItemCode. File name does not need to match ItemCode."
        actions={
          <UiButton variant="ghost" onClick={() => navigate('/label-stock')}>
            <FaArrowLeft /> Back to labelled
          </UiButton>
        }
      />

      <div className="bpiu-card">
        <div className="bpiu-toolbar">
          <p className="bpiu-help">
            One product can have many photos. ItemCode must already exist in labelled stock.
          </p>
          <div className="bpiu-mode">
            <button
              type="button"
              disabled={uploading}
              className={!replaceExisting ? 'is-on' : ''}
              onClick={() => setReplaceExisting(false)}
            >
              Append images
            </button>
            <button
              type="button"
              disabled={uploading}
              className={replaceExisting ? 'is-on' : ''}
              onClick={() => setReplaceExisting(true)}
            >
              Replace existing
            </button>
          </div>
        </div>

        <div
          className={`bpiu-drop${dragOver ? ' is-over' : ''}${uploading ? ' is-locked' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) addFiles(e.dataTransfer.files);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <FaCloudUploadAlt />
          <strong>{uploading ? 'Upload in progress' : 'Drag & drop images here, or click to select'}</strong>
          <span>JPG, JPEG, PNG, WEBP, GIF, BMP · multiple files</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            hidden
            disabled={uploading}
            onChange={onPick}
          />
        </div>

        {uploading ? (
          <div className="bpiu-progress" aria-live="polite">
            <div className="bpiu-progress-top">
              <span className="bpiu-progress-pulse" />
              Uploading {rows.length} image{rows.length === 1 ? '' : 's'}…
              <b>{progress}%</b>
            </div>
            <div className="bpiu-progress-track">
              <div className="bpiu-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {serverMessage ? (
          <div className={`bpiu-server${result?.ok === false ? ' is-bad' : result ? ' is-ok' : ''}`}>
            {serverMessage}
          </div>
        ) : null}

        {rows.length ? (
          <>
            <div className="bpiu-stats">
              <span>{rows.length} files</span>
              <span>{productCount} products</span>
              <span className={replaceExisting ? 'is-warn' : 'is-ok'}>
                {replaceExisting ? 'Replace' : 'Append'}
              </span>
              {emptyCount ? <span className="is-bad">{emptyCount} missing ItemCode</span> : null}
              {oversizeCount ? <span className="is-warn">{oversizeCount} over 10 MB</span> : null}
              <div className="bpiu-actions">
                <UiButton variant="ghost" disabled={uploading} onClick={clearAll}>
                  Clear all
                </UiButton>
                <UiButton variant="primary" disabled={!canUpload} onClick={handleUpload}>
                  {uploading ? <FaSpinner className="bpiu-spin" /> : null}
                  {uploading ? `Uploading ${progress}%` : 'Upload images'}
                </UiButton>
              </div>
            </div>

            <div className="bpiu-table-wrap">
              <table className="app-data-table bpiu-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>File name</th>
                    <th>Size</th>
                    <th>ItemCode</th>
                    <th>Product</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const empty = !String(row.itemCode || '').trim();
                    return (
                      <tr key={row.id} className={`${empty ? 'is-empty' : ''}${row.matched ? ' is-matched' : ''}`}>
                        <td data-label="Preview">
                          <img src={row.previewUrl} alt="" className="bpiu-thumb" />
                        </td>
                        <td data-label="File name">
                          <div className="bpiu-file">{row.file.name}</div>
                        </td>
                        <td data-label="Size" className={row.file.size > MAX_FILE_BYTES ? 'is-warn' : ''}>
                          {formatBytes(row.file.size)}
                        </td>
                        <td data-label="ItemCode">
                          <div className="bpiu-code-wrap">
                            <ItemCodeSearch
                              row={row}
                              clientCode={clientCode}
                              disabled={uploading}
                              onChange={(value) => setRowItemCode(row.id, value)}
                              onSelect={(hit) =>
                                setRowItemCode(row.id, hit.itemCode, {
                                  productName: hit.product,
                                  categoryName: hit.category,
                                  designName: hit.design,
                                  matched: true,
                                })
                              }
                            />
                            {row.matched ? (
                              <span className="bpiu-tick" title="ItemCode mapped">
                                <FaCheckCircle />
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td data-label="Product">
                          <div className="bpiu-product">{row.productName || '—'}</div>
                          {row.categoryName || row.designName ? (
                            <div className="bpiu-meta">
                              {[row.categoryName, row.designName].filter(Boolean).join(' · ')}
                            </div>
                          ) : null}
                        </td>
                        <td data-label="Remove">
                          <button
                            type="button"
                            className="bpiu-remove"
                            disabled={uploading}
                            onClick={() => removeRow(row.id)}
                            title="Remove this image"
                          >
                            <FaTimes /> Remove this image
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bpiu-pager">
              <span>
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className="bpiu-pager-btns">
                <button
                  type="button"
                  disabled={safePage <= 1 || uploading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <FaChevronLeft /> Prev
                </button>
                <strong>
                  {safePage} / {totalPages}
                </strong>
                <button
                  type="button"
                  disabled={safePage >= totalPages || uploading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showResultModal && result ? (
        <ResultModal
          result={result}
          onClose={() => setShowResultModal(false)}
        />
      ) : null}
      <style>{BPIU_CSS}</style>
    </div>
  );
};

const ItemCodeSearch = ({ row, clientCode, disabled, onChange, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [menuPos, setMenuPos] = useState(null);
  const timerRef = useRef(null);
  const seqRef = useRef(0);
  const boxRef = useRef(null);

  const updatePos = () => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 300);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setMenuPos({
      top: r.bottom + 4,
      left: Math.max(8, left),
      width,
    });
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!open) return undefined;
    updatePos();
    const onMove = () => updatePos();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, results, loading]);

  const search = (value) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = String(value || '').trim();
    if (!clientCode || q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    timerRef.current = setTimeout(async () => {
      const seq = seqRef.current + 1;
      seqRef.current = seq;
      try {
        const hits = await searchLabelledStockByItemCode(clientCode, q);
        if (seq !== seqRef.current) return;
        setResults(hits);
      } catch {
        if (seq !== seqRef.current) return;
        setResults([]);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 280);
  };

  return (
    <div className="bpiu-search" ref={boxRef}>
      <FaSearch className="bpiu-search-icon" />
      <input
        value={row.itemCode}
        disabled={disabled}
        placeholder="Search ItemCode"
        onFocus={() => search(row.itemCode)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
      />
      {open && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="bpiu-suggest"
              role="listbox"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 9999,
              }}
            >
              {loading ? <div className="bpiu-suggest-empty">Searching labelled stock…</div> : null}
              {!loading && results.length === 0 ? (
                <div className="bpiu-suggest-empty">No labelled stock for this ItemCode.</div>
              ) : null}
              {!loading
                ? results.map((hit, idx) => (
                    <button
                      key={`${hit.itemCode}-${idx}`}
                      type="button"
                      role="option"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelect(hit);
                        setOpen(false);
                      }}
                    >
                      <b>{hit.itemCode}</b>
                      <small>
                        {hit.product || '—'}
                        {hit.category ? ` · ${hit.category}` : ''}
                        {hit.design ? ` · ${hit.design}` : ''}
                      </small>
                    </button>
                  ))
                : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

const ResultModal = ({ result, onClose }) => {
  const products = result.products || [];
  const skipped = result.skipped || [];
  const errors = result.errors || [];
  const hasWarn = Number(result.skippedProducts || 0) > 0 || skipped.length > 0;
  const hasFail = result.ok === false || Number(result.failedFiles || 0) > 0 || errors.length > 0;
  const tone = !result.ok ? 'bad' : hasFail || hasWarn ? 'warn' : 'ok';
  const title =
    tone === 'ok'
      ? 'Upload successful'
      : tone === 'warn'
        ? 'Upload completed with warnings'
        : 'Upload failed';
  const message = result.message || (tone === 'ok' ? 'Bulk product images uploaded.' : 'Upload failed.');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="bpiu-modal-back" onClick={onClose} role="presentation">
      <div
        className={`bpiu-modal is-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bpiu-result-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="bpiu-modal-x" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
        <div className="bpiu-modal-icon" aria-hidden="true">
          {tone === 'ok' ? (
            <span className="bpiu-anim-ok">
              <FaCheckCircle />
            </span>
          ) : tone === 'warn' ? (
            <span className="bpiu-anim-warn">
              <FaExclamationTriangle />
            </span>
          ) : (
            <span className="bpiu-anim-bad">
              <FaTimes />
            </span>
          )}
        </div>
        <h2 id="bpiu-result-title">{title}</h2>
        <p className="bpiu-modal-msg">{message}</p>
        <div className="bpiu-result-chips">
          <Chip tone="ok">
            <FaCheckCircle /> Updated {result.updatedProducts || 0} products · {result.uploadedFiles || 0} images
          </Chip>
          {hasWarn ? (
            <Chip tone="warn">
              <FaExclamationTriangle /> Skipped {result.skippedProducts || skipped.length}
            </Chip>
          ) : null}
          {hasFail ? <Chip tone="bad">{result.failedFiles || errors.length} failed</Chip> : null}
        </div>
        <div className="bpiu-modal-body">
          {products.length ? (
            <ResultTable title="Updated products" tone="ok" rows={products} columns={['ItemCode', 'Action', 'UploadedCount', 'Images']} />
          ) : null}
          {skipped.length ? (
            <ResultTable title="Skipped (ItemCode not in labelled stock)" tone="warn" rows={skipped} columns={['ItemCode', 'Message', 'Images']} />
          ) : null}
          {errors.length ? (
            <ResultTable title="Errors" tone="bad" rows={errors} columns={Object.keys(errors[0] || { Message: '' })} />
          ) : null}
        </div>
        <div className="bpiu-modal-actions">
          <UiButton variant="primary" onClick={onClose}>
            OK
          </UiButton>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ResultTable = ({ title, tone, rows, columns }) => (
  <div className={`bpiu-result-table is-${tone}`}>
    <div className="bpiu-result-title">{title}</div>
    <div className="bpiu-table-wrap">
      <table className="app-data-table bpiu-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.ItemCode || idx}`}>
              {columns.map((col) => (
                <td key={col} data-label={col}>
                  {col === 'Images' ? (
                    <ImageThumbs paths={row.Images || row.images} />
                  ) : (
                    String(row[col] ?? row[col?.charAt?.(0)?.toLowerCase() + col?.slice?.(1)] ?? '—')
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ImageThumbs = ({ paths }) => {
  const list = Array.isArray(paths)
    ? paths
    : String(paths || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (!list.length) return '—';
  return (
    <div className="bpiu-thumbs">
      {list.map((path) => {
        const src = getProductImagePreviewUrl(path);
        return src ? <img key={path} src={src} alt="" /> : <span key={path}>{path}</span>;
      })}
    </div>
  );
};

const Chip = ({ children, tone = 'neutral' }) => (
  <span className={`bpiu-chip is-${tone}`}>{children}</span>
);

const BPIU_CSS = `
  .bpiu { padding: 4px 0 28px; }
  .bpiu-card {
    margin-top: 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  }
  .bpiu-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .bpiu-help { margin: 0; font-size: 13px; color: #475569; max-width: 640px; }
  .bpiu-mode {
    display: inline-flex;
    border: 1px solid #d7dee6;
    border-radius: 9px;
    overflow: hidden;
    background: #fff;
  }
  .bpiu-mode button {
    border: 0;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    background: #fff;
    color: #334155;
  }
  .bpiu-mode button.is-on { background: #0f4c81; color: #fff; }
  .bpiu-mode button:disabled { opacity: 0.6; cursor: not-allowed; }
  .bpiu-drop {
    margin-top: 14px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 12px;
    background: #f8fafc;
    padding: 28px 16px;
    text-align: center;
    cursor: pointer;
    color: #0f4c81;
  }
  .bpiu-drop svg { font-size: 28px; }
  .bpiu-drop strong { display: block; margin-top: 8px; color: #0f172a; }
  .bpiu-drop span { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }
  .bpiu-drop.is-over { background: #eef6ff; border-color: #0f4c81; }
  .bpiu-drop.is-locked { opacity: 0.55; cursor: not-allowed; }
  .bpiu-progress { margin-top: 14px; }
  .bpiu-progress-top {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #0f4c81;
    margin-bottom: 8px;
  }
  .bpiu-progress-top b { margin-left: auto; }
  .bpiu-progress-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #0f766e;
    animation: bpiu-pulse 1s ease-in-out infinite;
  }
  .bpiu-progress-track {
    height: 8px;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
  }
  .bpiu-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0f766e, #0f4c81);
    transition: width 0.25s ease;
  }
  .bpiu-server {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f8fafc;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
  }
  .bpiu-server.is-ok { background: #ecfdf5; color: #047857; }
  .bpiu-server.is-bad { background: #fef2f2; color: #b91c1c; }
  .bpiu-stats {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }
  .bpiu-stats > span {
    padding: 4px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
  .bpiu-stats .is-ok { background: #ecfdf5; color: #047857; }
  .bpiu-stats .is-warn { background: #fff7ed; color: #c2410c; }
  .bpiu-stats .is-bad { background: #fef2f2; color: #b91c1c; }
  .bpiu-actions { margin-left: auto; display: flex; gap: 8px; }
  .bpiu-table-wrap {
    margin-top: 12px;
    overflow-x: auto;
    border: 1px solid #e8eef5;
    border-radius: 12px;
    background: #fff;
  }
  .bpiu-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 860px; }
  .bpiu-table th {
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 12px 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .bpiu-table td {
    padding: 12px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    vertical-align: middle;
    background: #fff;
  }
  .bpiu-table tbody tr:nth-child(even) td { background: #fbfdff; }
  .bpiu-table tbody tr:hover td { background: #f0f7ff; }
  .bpiu-table tr.is-empty td { background: #fff7f7; }
  .bpiu-table tr.is-matched td { background: #f3fdf7; }
  .bpiu-table tbody tr:last-child td { border-bottom: 0; }
  .bpiu-thumb {
    width: 52px;
    height: 52px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(15,23,42,0.06);
  }
  .bpiu-file { font-weight: 600; color: #0f172a; word-break: break-all; }
  .bpiu-product { font-weight: 600; color: #0f172a; }
  .bpiu-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
  .bpiu-code-wrap { display: flex; align-items: center; gap: 8px; }
  .bpiu-tick { color: #059669; font-size: 16px; flex-shrink: 0; }
  .bpiu-remove {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #fecaca;
    background: #fff;
    color: #b91c1c;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .bpiu-remove:hover { background: #fef2f2; }
  .bpiu-remove:disabled { opacity: 0.5; cursor: not-allowed; }
  .bpiu-search { position: relative; min-width: 220px; flex: 1; }
  .bpiu-search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 11px;
    pointer-events: none;
  }
  .bpiu-search input {
    width: 100%;
    padding: 8px 10px 8px 28px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #fff;
    font-family: inherit;
    font-size: 13px;
    outline: none;
  }
  .bpiu-table tr.is-empty .bpiu-search input { border-color: #ef4444; background: #fff5f5; }
  .bpiu-table tr.is-matched .bpiu-search input { border-color: #86efac; background: #fff; }
  .bpiu-suggest {
    background: #fff;
    border: 1px solid #dbe4ef;
    border-radius: 10px;
    box-shadow: 0 16px 36px rgba(15,23,42,0.16);
    max-height: 260px;
    overflow-y: auto;
  }
  .bpiu-suggest-empty { padding: 10px 12px; font-size: 11px; color: #64748b; }
  .bpiu-suggest button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    border: 0;
    border-bottom: 1px solid #f1f5f9;
    background: #fff;
    cursor: pointer;
    font-family: inherit;
  }
  .bpiu-suggest button:hover { background: #f8fafc; }
  .bpiu-suggest b { display: block; color: #0f172a; font-size: 13px; }
  .bpiu-suggest small { display: block; margin-top: 3px; color: #64748b; font-size: 11px; }
  .bpiu-pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    font-size: 12px;
    color: #475569;
  }
  .bpiu-pager-btns { display: flex; align-items: center; gap: 8px; }
  .bpiu-pager button {
    border: 1px solid #e2e8f0;
    background: #fff;
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    color: #334155;
  }
  .bpiu-pager button:disabled { opacity: 0.45; cursor: not-allowed; }
  .bpiu-result { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }
  .bpiu-result-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .bpiu-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #f1f5f9;
    color: #334155;
  }
  .bpiu-chip.is-ok { background: #ecfdf5; color: #047857; }
  .bpiu-chip.is-warn { background: #fff7ed; color: #c2410c; }
  .bpiu-chip.is-bad { background: #fef2f2; color: #b91c1c; }
  .bpiu-result-table { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
  .bpiu-result-title { padding: 8px 12px; font-weight: 800; font-size: 12px; background: #f8fafc; }
  .bpiu-result-table.is-ok .bpiu-result-title { color: #047857; }
  .bpiu-result-table.is-warn .bpiu-result-title { color: #b45309; }
  .bpiu-result-table.is-bad .bpiu-result-title { color: #b91c1c; }
  .bpiu-thumbs { display: flex; flex-wrap: wrap; gap: 6px; }
  .bpiu-thumbs img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
  .bpiu-spin { animation: bpiu-spin 0.8s linear infinite; }
  .bpiu-modal-back {
    position: fixed;
    inset: 0;
    z-index: 12000;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: bpiu-fade 0.2s ease;
  }
  .bpiu-modal {
    width: min(720px, 100%);
    max-height: min(86vh, 820px);
    overflow: auto;
    background: #fff;
    border-radius: 18px;
    padding: 22px 20px 16px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
    position: relative;
    animation: bpiu-pop 0.32s cubic-bezier(.2,1.1,.3,1);
    text-align: center;
  }
  .bpiu-modal-x {
    position: absolute;
    top: 10px;
    right: 10px;
    border: 0;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    font-size: 14px;
  }
  .bpiu-modal-icon { font-size: 46px; line-height: 1; margin-bottom: 8px; }
  .bpiu-modal h2 { margin: 0 0 6px; font-size: 18px; color: #0f172a; }
  .bpiu-modal-msg { margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #334155; }
  .bpiu-modal.is-ok .bpiu-modal-icon, .bpiu-anim-ok { color: #059669; }
  .bpiu-modal.is-warn .bpiu-modal-icon, .bpiu-anim-warn { color: #d97706; }
  .bpiu-modal.is-bad .bpiu-modal-icon, .bpiu-anim-bad { color: #dc2626; }
  .bpiu-anim-ok, .bpiu-anim-warn, .bpiu-anim-bad {
    display: inline-flex;
    animation: bpiu-icon 0.55s cubic-bezier(.2,1.4,.3,1);
  }
  .bpiu-modal-body { margin-top: 12px; text-align: left; display: flex; flex-direction: column; gap: 10px; }
  .bpiu-modal-actions { margin-top: 14px; display: flex; justify-content: center; }
  @keyframes bpiu-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bpiu-pop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes bpiu-icon { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
  .bpiu-spin { animation: bpiu-spin 0.8s linear infinite; }
  @keyframes bpiu-spin { to { transform: rotate(360deg); } }
  @keyframes bpiu-pulse { 0%,100% { opacity: .35; transform: scale(.85); } 50% { opacity: 1; transform: scale(1); } }
  @media (max-width: 820px) {
    .bpiu-table { min-width: 0; }
    .bpiu-table thead { display: none; }
    .bpiu-table tr { display: block; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; padding: 10px; }
    .bpiu-table td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 6px 0; }
    .bpiu-table td::before { content: attr(data-label); font-size: 11px; font-weight: 700; color: #64748b; flex: 0 0 92px; }
    .bpiu-search { min-width: 0; width: 100%; }
    .bpiu-code-wrap { width: 100%; }
    .bpiu-remove { width: 100%; justify-content: center; }
    .bpiu-actions { width: 100%; margin-left: 0; }
    .bpiu-actions button { flex: 1; }
  }
`;

export default BulkProductImageUpload;
