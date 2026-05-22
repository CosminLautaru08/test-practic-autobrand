import { Injectable, Logger } from '@nestjs/common';
import { chromium, Page } from 'playwright';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { CreateProduct } from '../product/interfaces/create-product';
import { ProductService } from '../product/product.service';

interface ScrapedListingProduct {
  name: string;
  price: number | null;
  description: string;
  imageUrl: string;
  detailUrl: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async scrapeProducts(): Promise<CreateProduct[]> {
    let browser;
    let context;

    try {
      browser = await chromium.launch({
        headless: true,
      });

      context = await browser.newContext();
      const listingPage = await context.newPage();
      await this.login(listingPage);

      const listedProducts = await this.scrapeListingProducts(listingPage);
      const detailPage = await context.newPage();
      const allProducts: CreateProduct[] = [];

      for (const product of listedProducts) {
        allProducts.push(
          await this.enrichProductWithPricing(detailPage, product),
        );
      }

      await detailPage.close();

      for (const product of allProducts) {
        await this.productService.upsertFromScraper(product);
      }

      this.logger.log(`Scraped total ${allProducts.length} products`);

      return allProducts;
    } catch (err) {
      this.logger.error('Scraping failed', err);
      throw err;
    } finally {
      await context?.close();
      await browser?.close();
    }
  }

  private async login(page: Page): Promise<void> {
    this.logger.log('Opening login page...');

    await page.goto('https://www.web-scraping.dev/login');
    await page.locator('input[name="username"]').fill('user123');
    await page.locator('input[name="password"]').fill('password');

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]'),
    ]);

    this.logger.log('Login successful');
  }

  private async scrapeListingProducts(
    page: Page,
  ): Promise<ScrapedListingProduct[]> {
    await page.goto(
      'https://www.web-scraping.dev/products?category=consumables&page=1',
    );
    await page.waitForLoadState('networkidle');

    const pagingText = await page.textContent('.paging-meta');
    const match = pagingText?.match(/in (\d+) pages/);
    const totalPages = match ? Number(match[1]) : 1;

    this.logger.log(`Detected ${totalPages} pages`);

    const listedProducts: ScrapedListingProduct[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      this.logger.log(`Scraping page ${pageNumber}`);

      await page.goto(
        `https://www.web-scraping.dev/products?category=consumables&page=${pageNumber}`,
      );
      await page.waitForLoadState('networkidle');

      listedProducts.push(...(await this.extractProductsFromPage(page)));
    }

    return listedProducts;
  }

  private async extractProductsFromPage(
    page: Page,
  ): Promise<ScrapedListingProduct[]> {
    return page.$$eval('.product', (items) => {
      return items.map((item) => {
        const priceText =
          item.querySelector('.price')?.textContent?.trim() || '';
        const price = Number.parseFloat(priceText.replace(',', '.'));

        return {
          name: item.querySelector('h3 a')?.textContent?.trim() || '',
          price: Number.isNaN(price) ? null : price,
          description:
            item.querySelector('.short-description')?.textContent?.trim() || '',
          imageUrl: item.querySelector('img')?.getAttribute('src') || '',
          detailUrl: item.querySelector('h3 a')?.getAttribute('href') || '',
        };
      });
    });
  }

  private async enrichProductWithPricing(
    detailPage: Page,
    product: ScrapedListingProduct,
  ): Promise<CreateProduct> {
    const pricing = await this.scrapeDetailPricing(detailPage, product);

    if (pricing.price === null) {
      throw new Error(`Unable to determine a price for "${product.name}".`);
    }

    if (!pricing.currency) {
      throw new Error(`Unable to determine a currency for "${product.name}".`);
    }

    const { exchangeRate, amountRon } =
      await this.exchangeRateService.convertAmountToRon(
        pricing.price,
        pricing.currency,
      );

    return {
      name: product.name,
      price: pricing.price,
      currency: pricing.currency,
      exchangeRate,
      priceRon: amountRon,
      description: product.description,
      imageUrl: product.imageUrl,
    };
  }

  private async scrapeDetailPricing(
    detailPage: Page,
    product: ScrapedListingProduct,
  ): Promise<{ price: number | null; currency: string | null }> {
    await detailPage.goto(product.detailUrl, {
      waitUntil: 'domcontentloaded',
    });
    await detailPage.locator('.price').first().waitFor();

    const priceText = await detailPage.locator('.price').first().textContent();
    const parsedPricing = this.extractPricingFromText(priceText ?? '');

    return {
      price: parsedPricing?.price ?? product.price,
      currency: parsedPricing?.currency ?? null,
    };
  }

  private extractPricingFromText(
    value: string,
  ): { price: number; currency: string } | null {
    const normalizedValue = value.replace(/\s+/g, ' ').trim();

    const symbolMatch = normalizedValue.match(
      /([\u0024\u20AC\u00A3])\s*(\d+(?:[.,]\d+)?)/,
    );
    if (symbolMatch) {
      return {
        price: this.normalizeAmount(symbolMatch[2]),
        currency: this.normalizeCurrency(symbolMatch[1]),
      };
    }

    const leadingCodeMatch = normalizedValue.match(
      /\b(RON|USD|EUR|GBP|CHF|LEI|LEU)\b\s*(\d+(?:[.,]\d+)?)/i,
    );
    if (leadingCodeMatch) {
      return {
        price: this.normalizeAmount(leadingCodeMatch[2]),
        currency: this.normalizeCurrency(leadingCodeMatch[1]),
      };
    }

    const trailingCodeMatch = normalizedValue.match(
      /(\d+(?:[.,]\d+)?)\s*(RON|USD|EUR|GBP|CHF|LEI|LEU)\b/i,
    );
    if (trailingCodeMatch) {
      return {
        price: this.normalizeAmount(trailingCodeMatch[1]),
        currency: this.normalizeCurrency(trailingCodeMatch[2]),
      };
    }

    return null;
  }

  private normalizeAmount(value: string | number): number {
    const normalizedValue =
      typeof value === 'number'
        ? value
        : Number.parseFloat(value.replace(',', '.'));

    return Number(normalizedValue.toFixed(2));
  }

  private normalizeCurrency(value: string): string {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue === '\u0024') {
      return 'USD';
    }

    if (normalizedValue === '\u20AC') {
      return 'EUR';
    }

    if (normalizedValue === '\u00A3') {
      return 'GBP';
    }

    if (normalizedValue === 'LEI' || normalizedValue === 'LEU') {
      return 'RON';
    }

    return normalizedValue;
  }
}
