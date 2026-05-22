import { Module } from '@nestjs/common';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { ProductModule } from '../product/product.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../product/entities/product.entity';
import { ProductService } from '../product/product.service';

@Module({
  imports: [
    ExchangeRateModule,
    ProductModule,
    TypeOrmModule.forFeature([ProductEntity]),
  ],
  controllers: [ScraperController],
  providers: [ScraperService, ProductService],
})
export class ScraperModule {}
