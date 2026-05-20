import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { Public, CurrentUser, OrgId } from '../../shared/decorators';
import { MarketplaceService } from './marketplace.service';

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @Public()
  getListings(@Query() query: any) {
    return this.marketplaceService.getPublicListings(query);
  }

  @Post('deals/:id/publish')
  publish(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.marketplaceService.publishDeal(id, orgId);
  }

  @Post('deals/:id/save')
  saveDeal(
    @CurrentUser('id') buyerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes?: string,
  ) {
    return this.marketplaceService.saveDeal(buyerId, id, notes);
  }

  @Get('saved')
  getSaved(@CurrentUser('id') buyerId: string) {
    return this.marketplaceService.getSavedDeals(buyerId);
  }
}
