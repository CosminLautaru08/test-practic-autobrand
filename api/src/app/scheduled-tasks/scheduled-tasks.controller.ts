import { Controller, Get } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';

// @UseGuards(JwtAuthGuard)
@Controller('scheduled-tasks')
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Get('test-cron')
  testCron() {
    return this.scheduledTasksService.fetchProducts();
  }
}
