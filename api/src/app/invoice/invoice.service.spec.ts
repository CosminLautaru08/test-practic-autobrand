const { InvoiceService } = require('./invoice.service');

describe('InvoiceService', () => {
  let service: InstanceType<typeof InvoiceService>;

  beforeEach(() => {
    service = new InvoiceService();
  });

  it('extracts the invoice row from the attached eFactura layout', () => {
    const text = `
RO eFactura
20241747776
Nr. facturaData emitere
2024-03-01
Moneda facturii
RON
Linia
CotaTVA
Pretul net alarticolului
Cantitate de baza
 Cantitatefacturata
UM
 Valoare neta
Moneda
Nume articol/Descriere articol
Taraprovenienta
251.96
RON
-1
-1
H87
19
-251.96
172812F COMUTATOR PORNIRE FEBI
1
172812F
Identificator vanzator articol pentru linia 1 :172812FInstructiuni de plataCodul tipului de instrument de
42
RO21BTRLRONCRT0P66633401
Nr. cont de plataNumele contului de plata
`;

    const rows = (service as any).extractRows(text);

    expect(rows).toEqual([
      {
        productCode: '172812F',
        productName: 'COMUTATOR PORNIRE FEBI',
        unitPrice: 251.96,
        currency: 'RON',
        quantity: 1,
      },
    ]);
  });

  it('keeps supporting simple code plus name invoice rows', () => {
    const text = `
Cod produs
Denumire produs
172812F
COMUTATOR PORNIRE FEBI
42
RON
1
`;

    const rows = (service as any).extractRows(text);

    expect(rows).toEqual([
      {
        productCode: '172812F',
        productName: 'COMUTATOR PORNIRE FEBI',
        unitPrice: 42,
        currency: 'RON',
        quantity: 1,
      },
    ]);
  });
});
