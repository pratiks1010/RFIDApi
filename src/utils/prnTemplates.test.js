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

    expect(prn).toContain('RFWTAG;48;EPC');
    expect(prn).toContain('16;H;*1800*');
    expect(prn).toContain('*4E5350593130*');
    expect(prn).toContain('G DORLE');
    expect(prn).toContain('AASHIRWAD ALANKAR');
    expect(prn).toContain('15/-');
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

    expect(prn).toContain('RFWTAG;48;EPC');
    expect(prn).toContain('16;H;*1800*');
    expect(prn).toContain('*4E444F523030*');
    expect(prn).toContain('S PAYAL');
    expect(prn).toContain('916 HM');
  });
});
