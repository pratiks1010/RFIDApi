import { generateClientPrn } from './prnTemplates';

describe('LS000606 PRN generation', () => {
  const baseItem = {
    ItemCode: 'NSPY1064',
    Category: 'Gold',
    CategoryName: 'GOLD',
    DesignName: 'G DORLE',
    ProductName: 'AASHIRWAD ALANKAR',
    GrossWt: '27.220',
    NetWt: '27.220',
    TotalStoneWeight: '0.00',
    MRP: '15',
    PurityName: '916',
  };

  it('generates a gold label PRN for LS000606', () => {
    const prn = generateClientPrn(baseItem, 'LS000606');

    expect(prn).toContain('RFWTAG;64;EPC');
    expect(prn).toContain('16;H;*2400*');
    expect(prn).toContain('*4E53505931303634*');
    expect(prn).toContain('G DORLE');
    expect(prn).toContain('AASHIRWAD ALANKAR');
    expect(prn).toContain('15/-');
    expect(prn).toContain('NSPY1064');
  });

  it('generates a silver label PRN for LS000606', () => {
    const prn = generateClientPrn(
      {
        ...baseItem,
        ItemCode: 'NDOR0059',
        Category: 'Silver',
        CategoryName: 'SILVER',
        DesignName: 'S PAYAL',
        PurityName: '916 HM',
      },
      'LS000606'
    );

    expect(prn).toContain('RFWTAG;64;EPC');
    expect(prn).toContain('16;H;*2400*');
    expect(prn).toContain('*4E444F5230303539*');
    expect(prn).toContain('S PAYAL');
    expect(prn).toContain('916 HM');
  });

  it.each(['SJ126', 'SJ001234', 'SJ25', 'S34'])(
    'supports varied alphanumeric item codes: %s',
    (itemCode) => {
      const prn = generateClientPrn({ ...baseItem, ItemCode: itemCode }, 'LS000606');

      expect(prn).toContain(`"${itemCode}"`);
      expect(prn).toMatch(/RFWTAG;\d+;EPC/);
      expect(prn).toMatch(/C128B;INV;[^\n]+\n"[^"]+"/);
      expect(prn).not.toContain("''");
    }
  );
});
