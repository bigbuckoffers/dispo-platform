import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.getConversations(orgId || defaultOrg);
  }

  @Get('conversations/:buyerId')
  getMessages(@Param('buyerId') buyerId: string, @Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.getMessages(orgId || defaultOrg, buyerId);
  }

  @Post('conversations/:buyerId/send')
  sendMessage(
    @Param('buyerId') buyerId: string,
    @Body() body: { message: string; orgId?: string; intakeTrackingType?: 'link_sent' | 'reminder' },
  ) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.sendMessage(body.orgId || defaultOrg, buyerId, body.message, { intakeTrackingType: body.intakeTrackingType });
  }

  @Get('bulk-campaigns')
  getBulkCampaigns(@Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.getBulkCampaigns(orgId || defaultOrg);
  }

  @Get('bulk-campaigns/:batchId')
  getBulkCampaign(@Param('batchId') batchId: string, @Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.getBulkCampaign(orgId || defaultOrg, batchId);
  }

  @Post('bulk-campaigns/:batchId/pause')
  pauseBulkCampaign(@Param('batchId') batchId: string, @Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.pauseBulkCampaign(orgId || defaultOrg, batchId);
  }

  @Post('bulk-campaigns/:batchId/resume')
  resumeBulkCampaign(@Param('batchId') batchId: string, @Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.resumeBulkCampaign(orgId || defaultOrg, batchId);
  }

  @Post('bulk-campaigns/:batchId/cancel')
  cancelBulkCampaign(@Param('batchId') batchId: string, @Query('orgId') orgId: string) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.cancelBulkCampaign(orgId || defaultOrg, batchId);
  }

  @Post('bulk-buybox')
  sendBulkBuyBox(@Body() body: {
    buyerIds: string[];
    templateKey?: string;
    customMessage?: string;
    includeAlreadySent?: boolean;
    delayMs?: number;
    orgId?: string;
  }) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.sendBulkBuyBox(body.orgId || defaultOrg, body.buyerIds || [], {
      templateKey: body.templateKey || 'general',
      customMessage: body.customMessage || '',
      includeAlreadySent: !!body.includeAlreadySent,
      delayMs: body.delayMs || 12000,
    });
  }

  @Post('bulk')
  sendBulk(@Body() body: { buyerIds: string[]; message: string; delayMs?: number; orgId?: string; intakeTrackingType?: 'link_sent' | 'reminder'; batchId?: string }) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.sendBulk(body.orgId || defaultOrg, body.buyerIds, body.message, body.delayMs, { intakeTrackingType: body.intakeTrackingType, batchId: body.batchId });
  }

  @Post('webhook/inbound')
  handleInbound(@Body() body: any) {
    return this.messagesService.handleInbound(body);
  }
}
