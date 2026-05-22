import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { ProductService } from '../product/product.service';

export interface ScrapedProduct {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly productService: ProductService) {}

  async scrapeProducts(): Promise<ScrapedProduct[]> {
    let browser;

    try {
      browser = await chromium.launch({
        headless: true,
      });

      const page = await browser.newPage();

      this.logger.log('Opening login page...');

      await page.goto('https://www.web-scraping.dev/login');

      await page.locator('input[name="username"]').fill('user123');

      await page.locator('input[name="password"]').fill('password');

      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]'),
      ]);

      this.logger.log('Login successful');

      await page.goto(
        'https://www.web-scraping.dev/products?category=consumables',
      );

      await page.waitForLoadState('networkidle');

      const products = await page.$$eval('.product', (items) => {
        return items.map((item) => {
          const name = item.querySelector('h3 a')?.textContent?.trim() || '';

          const price = item.querySelector('.price')?.textContent?.trim() || '';

          const description =
            item.querySelector('.short-description')?.textContent?.trim() || '';

          const image = item.querySelector('img')?.getAttribute('src') || '';

          return {
            name,
            price,
            description,
            imageUrl: image,
          };
        });
      });
      for (const product of products) {
        await this.productService.upsertFromScraper(product);
      }

      this.logger.log(`Scraped ${products.length} products`);

      return products;
    } catch (err) {
      this.logger.error('Scraping failed', err);
      throw err;
    } finally {
      await browser?.close();
    }
  }
}
