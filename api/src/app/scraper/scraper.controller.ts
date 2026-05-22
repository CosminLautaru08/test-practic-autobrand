import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScraperService } from './scraper.service';

@UseGuards(JwtAuthGuard)
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  runScraper() {
    return this.scraperService.scrapeProducts();
  }
}
