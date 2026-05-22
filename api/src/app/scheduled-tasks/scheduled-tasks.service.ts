import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScraperService } from '../scraper/scraper.service';

@Injectable()
export class ScheduledTasksService {
  private isRunning = false;
  constructor(private readonly scraperService: ScraperService) {}

  @Cron('0 0 12-18 * * *')
  async fetchProducts() {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      await this.scraperService.scrapeProducts();
    } finally {
      this.isRunning = false;
    }
  }
}
