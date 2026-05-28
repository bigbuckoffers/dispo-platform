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
    @Body() body: { message: string; orgId?: string },
  ) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.sendMessage(body.orgId || defaultOrg, buyerId, body.message);
  }

  @Post('bulk')
  sendBulk(@Body() body: { buyerIds: string[]; message: string; delayMs?: number; orgId?: string }) {
    const defaultOrg = 'c87f4e63-fd29-4ff5-823f-e4926daa0820';
    return this.messagesService.sendBulk(body.orgId || defaultOrg, body.buyerIds, body.message, body.delayMs);
  }

  @Post('webhook/inbound')
  handleInbound(@Body() body: any) {
    return this.messagesService.handleInbound(body);
  }
}
