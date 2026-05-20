// deals.controller.ts
import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus, UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, CurrentUser, OrgId } from '../../shared/decorators';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll(@OrgId() orgId: string, @Query() query: any) {
    return this.dealsService.findAll(orgId, query);
  }

  @Post()
  @Roles(TeamRole.ACQUISITIONS_REP, TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Create deal — triggers AI property analysis automatically' })
  create(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateDealDto) {
    return this.dealsService.create(orgId, userId, dto);
  }

  @Get(':id')
  findOne(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.dealsService.findOne(orgId, id);
  }

  @Put(':id')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  update(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateDealDto>,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealsService.update(orgId, id, dto, userId);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Get AI-ranked buyer matches for this deal' })
  getMatches(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string, @Query('limit') limit = 25) {
    return this.dealsService.getMatches(orgId, id, +limit);
  }

  @Post(':id/trigger-matching')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Queue AI matching job for this deal' })
  triggerMatching(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.dealsService.triggerMatching(orgId, id);
  }

  @Post(':id/release')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'Release deal to a buyer tier (1, 2, or 3)' })
  release(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { tier: 1 | 2 | 3; scheduledAt?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.dealsService.releaseToDealTier(orgId, id, body.tier, userId);
  }

  @Post(':id/generate-campaign')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  @ApiOperation({ summary: 'AI-generate SMS + email campaign for this deal' })
  generateCampaign(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { tier: string },
  ) {
    return this.dealsService.generateAiCampaign(orgId, id, body.tier);
  }

  @Patch(':id/status')
  @Roles(TeamRole.DISPO_REP, TeamRole.ADMIN, TeamRole.OWNER)
  updateStatus(
    @OrgId() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dealsService.updateStatus(orgId, id, status as any, userId);
  }

  @Delete(':id')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@OrgId() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.dealsService.remove(orgId, id);
  }
}
