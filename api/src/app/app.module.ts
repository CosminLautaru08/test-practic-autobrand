import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    ProductModule,
    ScraperModule,
    ScheduledTasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
