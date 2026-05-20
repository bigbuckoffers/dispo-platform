// matching.controller.ts
import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { OrgId } from '../../shared/decorators';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('deals/:id')
  getMatchesForDeal(
    @Param('id', ParseUUIDPipe) dealId: string,
    @Query('limit') limit = 25,
  ) {
    return this.matchingService.getMatchesForDeal(dealId, +limit);
  }
}
