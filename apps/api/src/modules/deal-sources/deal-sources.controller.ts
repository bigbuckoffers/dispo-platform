import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { DealSourcesService } from './deal-sources.service';

@Controller('api/v1/sources')
export class DealSourcesController {
  constructor(private readonly svc: DealSourcesService) {}

  @Get()
  async findAll(@Query('orgId') orgId: string) {
    const org = orgId || await this.svc.getDefaultOrgId();
    return this.svc.findAll(org);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    const orgId = body.organizationId || await this.svc.getDefaultOrgId();
    return this.svc.findOrCreate(orgId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Post(':id/recalculate')
  recalculate(@Param('id') id: string) {
    return this.svc.recalculateScore(id);
  }
}
