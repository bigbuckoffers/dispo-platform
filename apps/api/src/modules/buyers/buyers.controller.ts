import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, CurrentUser, OrgId } from '../../shared/decorators';
import { BuyersService } from './buyers.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { UpdateBuyBoxDto } from './dto/update-buy-box.dto';
import { ListBuyersDto } from './dto/list-buyers.dto';

@ApiTags('buyers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buyers')
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Get()
  @ApiOperation({ summary: 'List buyers with filtering, sorting, pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  findAll(
    @OrgId() orgId: string,
    @Query() query: ListBuyersDto,
  ) {
    return this.buyersService.findAll(orgId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new buyer profile' })
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  create(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBuyerDto,
  ) {
    return this.buyersService.create(orgId, userId, dto);
  }

  @Get('top-matched')
  @ApiOperation({ summary: 'Get top buyers by composite score' })
  getTopBuyers(
    @OrgId() orgId: string,
    @Query('limit') limit = 20,
  ) {
    return this.buyersService.getTopBuyers(orgId, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full buyer profile' })
  findOne(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.findOne(orgId, id);
  }

  @Put(':id')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Update buyer profile' })
  update(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuyerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.buyersService.update(orgId, id, dto, userId);
  }

  @Get(':id/scores')
  @ApiOperation({ summary: 'Get buyer reliability, liquidity, activity scores + history' })
  getScores(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.getScores(orgId, id);
  }

  @Post(':id/recalculate-scores')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Force recalculate all scores for a buyer' })
  recalculateScores(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.recalculateScores(orgId, id);
  }

  @Get(':id/buy-box')
  @ApiOperation({ summary: 'Get stated buy box' })
  getBuyBox(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.getBuyBox(orgId, id);
  }

  @Put(':id/buy-box')
  @ApiOperation({ summary: 'Update buyer buy box' })
  updateBuyBox(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuyBoxDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.buyersService.updateBuyBox(orgId, id, dto, userId);
  }

  @Get(':id/real-buy-box')
  @ApiOperation({ summary: 'Get AI-learned real buy box vs stated buy box' })
  getRealBuyBox(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.getRealBuyBox(orgId, id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get buyer activity timeline' })
  getActivity(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days = 30,
  ) {
    return this.buyersService.getActivityTimeline(orgId, id, +days);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Full buyer analytics: close rate, ghosting %, avg fees, etc.' })
  getAnalytics(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.buyersService.getAnalytics(orgId, id);
  }

  @Patch(':id/tier')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Manually update buyer tier' })
  updateTier(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tier') tier: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.buyersService.updateTier(orgId, id, tier as any, userId);
  }

  @Patch(':id/suspend')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Suspend a buyer' })
  suspend(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.buyersService.suspend(orgId, id, reason, userId);
  }

  @Delete(':id')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete buyer (soft delete)' })
  remove(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.buyersService.remove(orgId, id, userId);
  }
}
