const { ScraperService } = require('./scraper.service');

describe('ScraperService', () => {
  let service: InstanceType<typeof ScraperService>;

  beforeEach(() => {
    service = new ScraperService(
      {
        upsertFromScraper: jest.fn(),
      },
      {
        convertAmountToRon: jest.fn(),
      },
    );
  });

  it('extracts the currency and price from symbol-based pricing', () => {
    const pricing = (service as any).extractPricingFromText(
      '$9.99 from $12.99',
    );

    expect(pricing).toEqual({
      price: 9.99,
      currency: 'USD',
    });
  });

  it('extracts the currency and price from code-based pricing', () => {
    const pricing = (service as any).extractPricingFromText('RON 42.50');

    expect(pricing).toEqual({
      price: 42.5,
      currency: 'RON',
    });
  });
});
