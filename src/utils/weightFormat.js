/** Weight fields stored with exactly 3 decimal places (e.g. 1.144, 0.000). */
export const WEIGHT_FIELDS_3DP = new Set(['grosswt', 'stonewt', 'diamondweight', 'netwt']);

export const formatWeight3 = (value) => {
  if (value === '' || value === null || value === undefined) return '0.000';
  const n = parseFloat(String(value).replace(/,/g, '').trim());
  if (Number.isNaN(n)) return '0.000';
  return n.toFixed(3);
};

/** Net = gross − stone − diamond */
export const calculateNetWeight = (grosswt, stonewt, diamondweight = 0) => {
  const gross = parseFloat(grosswt) || 0;
  const stone = parseFloat(stonewt) || 0;
  const dia = parseFloat(diamondweight) || 0;
  const net = gross - stone - dia;
  return net >= 0 ? net.toFixed(3) : '0.000';
};

/**
 * Normalize gross / stone / diamond / net on a stock row before API submit.
 * @param {object} product
 * @param {{ netExcelValue?: * }} options - When set and non-empty, use Excel net instead of calculated net.
 */
export const normalizeProductWeights = (product, { netExcelValue } = {}) => {
  const out = { ...product };
  out.grosswt = formatWeight3(out.grosswt ?? '');
  out.stonewt = formatWeight3(out.stonewt ?? '');
  out.diamondweight = formatWeight3(out.diamondweight ?? '');

  const hasNetInExcel =
    netExcelValue !== undefined &&
    netExcelValue !== null &&
    String(netExcelValue).trim() !== '';

  if (hasNetInExcel) {
    out.netwt = formatWeight3(netExcelValue);
  } else if (out.netwt !== undefined && out.netwt !== null && String(out.netwt).trim() !== '') {
    out.netwt = formatWeight3(out.netwt);
  } else {
    out.netwt = calculateNetWeight(out.grosswt, out.stonewt, out.diamondweight);
  }

  return out;
};
