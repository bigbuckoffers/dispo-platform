import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { DealSourcesService } from './deal-sources.service';

@Controller('api/v1/sources')
export class DealSourcesController {
  constructor(private readonly svc: DealSourcesService) {}

  @Get()
  findAll(@Query('orgId') orgId: string) {
    const org = orgId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758';
    return this.svc.findAll(org);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    const orgId = body.organizationId || 'a296974d-74f4-4c8b-b6f4-5a57b9f36758';
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
