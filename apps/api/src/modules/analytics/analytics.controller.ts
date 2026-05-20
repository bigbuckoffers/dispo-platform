import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { OrgId } from '../../shared/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@OrgId() orgId: string, @Query('days') days = 30) {
    return this.analyticsService.getOrgOverview(orgId, +days);
  }

  @Get('deal-velocity')
  getDealVelocity(@OrgId() orgId: string, @Query('days') days = 30) {
    return this.analyticsService.getDealVelocity(orgId, +days);
  }

  @Get('buyer-heatmap')
  getBuyerHeatmap(@OrgId() orgId: string) {
    return this.analyticsService.getBuyerActivityHeatmap(orgId);
  }

  @Get('assignment-fees')
  getAssignmentFees(@OrgId() orgId: string) {
    return this.analyticsService.getAssignmentFeeReport(orgId);
  }

  @Get('rep-performance')
  getRepPerformance(@OrgId() orgId: string) {
    return this.analyticsService.getDispoRepPerformance(orgId);
  }
}
