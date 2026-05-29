import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { IntakeService } from './intake.service';

@Controller('intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Get('token/:token')
  getBuyerByToken(@Param('token') token: string) {
    return this.intakeService.getBuyerByToken(token);
  }

  @Post('token/:token/opened')
  logOpened(@Param('token') token: string, @Body() body: { metadata?: any } = {}) {
    return this.intakeService.logOpened(token, body?.metadata || {});
  }

  @Post('token/:token/started')
  logStarted(@Param('token') token: string, @Body() body: { metadata?: any } = {}) {
    return this.intakeService.logStarted(token, body?.metadata || {});
  }

  @Post('token/:token/sent')
  markLinkSent(@Param('token') token: string, @Body() body: { metadata?: any } = {}) {
    return this.intakeService.markLinkSent(token, body?.metadata || {});
  }

  @Post('token/:token/submit')
  submitIntake(@Param('token') token: string, @Body() data: any) {
    return this.intakeService.submitIntake(token, data);
  }

  @Post('generate/:buyerId')
  generateToken(@Param('buyerId') buyerId: string) {
    return this.intakeService.generateToken(buyerId);
  }

  @Post('generate-bulk')
  generateBulkTokens(@Body() body: { orgId?: string }) {
    return this.intakeService.generateBulkTokens(body.orgId || 'c87f4e63-fd29-4ff5-823f-e4926daa0820');
  }

  @Get('submissions')
  getPendingSubmissions(@Query('orgId') orgId: string) {
    return this.intakeService.getPendingSubmissions(orgId || 'c87f4e63-fd29-4ff5-823f-e4926daa0820');
  }

  @Post('submissions/:id/approve')
  approveSubmission(@Param('id') id: string, @Body() body: any) {
    return this.intakeService.approveSubmission(id, body);
  }

  @Post('token/:token/track')
  trackEvent(@Param('token') token: string, @Body() body: { event?: string; metadata?: any } = {}) {
    return this.intakeService.trackEvent(token, body.event || '', body.metadata || {});
  }

  @Get('buyers/:buyerId/events')
  getBuyerIntakeEvents(@Param('buyerId') buyerId: string) {
    return this.intakeService.getBuyerIntakeEvents(buyerId);
  }

  @Post('submissions/:id/reject')
  rejectSubmission(@Param('id') id: string) {
    return this.intakeService.rejectSubmission(id);
  }
}
