import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('buy-box-sending')
  getBuyBoxSending(@Query('orgId') orgId?: string) {
    return this.settingsService.getBuyBoxSendingSettings(orgId);
  }

  @Put('buy-box-sending')
  updateBuyBoxSending(@Body() body: any) {
    return this.settingsService.updateBuyBoxSendingSettings(body.orgId, body);
  }
}
