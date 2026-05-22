import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { ProductEntity } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';
import { ProductService } from '../product/product.service';
import { ScraperModule } from '../scraper/scraper.module';
import { ScraperService } from '../scraper/scraper.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
  imports: [
    ExchangeRateModule,
    TypeOrmModule.forFeature([ProductEntity]),
    ScraperModule,
    ProductModule,
  ],
  controllers: [ScheduledTasksController],
  providers: [ScheduledTasksService, ScraperService, ProductService],
})
export class ScheduledTasksModule {}
