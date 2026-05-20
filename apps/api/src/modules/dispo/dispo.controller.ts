import { Controller, Get, Post, Body, Param, Query, UseGuards, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Public, OrgId } from '../../shared/decorators';
import { DispoService } from './dispo.service';

@ApiTags('dispo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispo')
export class DispoController {
  constructor(private readonly dispoService: DispoService) {}

  @Get('campaigns')
  getCampaigns(@OrgId() orgId: string, @Query('dealId') dealId?: string) {
    return this.dispoService.getOrgCampaigns(orgId, dealId);
  }

  @Get('campaigns/:id/stats')
  getCampaignStats(@Param('id') id: string) {
    return this.dispoService.getCampaignStats(id);
  }

  @Post('webhooks/twilio')
  @Public()
  handleTwilioWebhook(@Body() body: any) {
    return this.dispoService.handleTwilioWebhook(body);
  }
}
