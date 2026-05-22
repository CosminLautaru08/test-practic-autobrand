import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduledTasksService } from './scheduled-tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Get('test-cron')
  testCron() {
    return this.scheduledTasksService.fetchProducts();
  }
}
