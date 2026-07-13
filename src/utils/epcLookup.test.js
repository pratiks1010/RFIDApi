import {
  buildTrayStockLookupPayload,
  expandEpcLookupKeys,
  hexToAscii,
  padEpcHexToBitLength,
  propagateRfidMappingToRawEpcs,
  stringToAsciiHex,
} from './epcLookup';

describe('epcLookup', () => {
  it('decodes 3016 stone tag EPC from gun (48-bit)', () => {
    expect(hexToAscii('000033303136')).toBe('3016');
    expect(stringToAsciiHex('3016')).toBe('33303136');
    expect(padEpcHexToBitLength('33303136', 48)).toBe('000033303136');
  });

  it('decodes 13016 standard tag EPC variants', () => {
    expect(stringToAsciiHex('13016')).toBe('3133303136');
    expect(padEpcHexToBitLength('3133303136', 48)).toBe('003133303136');
    expect(hexToAscii('003133303136')).toBe('13016');
    expect(hexToAscii('0000003133303136')).toBe('13016');
  });

  it('expands scanned EPC to lookup variants', () => {
    const keys3016 = expandEpcLookupKeys('000033303136');
    expect(keys3016).toContain('000033303136');
    expect(keys3016).toContain('33303136');

    const keys13016 = expandEpcLookupKeys('003133303136');
    expect(keys13016).toContain('003133303136');
    expect(keys13016).toContain('3133303136');
    expect(keys13016).toContain('0000003133303136');
  });

  it('builds tray payload with decoded item codes', () => {
    const payload = buildTrayStockLookupPayload(['000033303136', '003133303136']);
    expect(payload.decodedCodes).toEqual(expect.arrayContaining(['3016', '13016']));
    expect(payload.epcKeys.length).toBeGreaterThan(2);
  });

  it('propagates API mapping back to raw scanned EPC', () => {
    const raw = ['000033303136'];
    const mapping = { '000033303136': '3016' };
    expect(propagateRfidMappingToRawEpcs(raw, mapping)).toEqual({
      '000033303136': '3016',
    });
  });
});
