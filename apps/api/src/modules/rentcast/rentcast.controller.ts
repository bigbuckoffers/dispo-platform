import { Controller, Get, Post, Body } from '@nestjs/common';
import { RentCastService } from './rentcast.service';

@Controller('api/v1/rentcast')
export class RentCastController {
  constructor(private readonly svc: RentCastService) {}
  @Get('usage')
  getUsage() { return this.svc.getUsage(); }
  @Post('estimate')
  async estimate(@Body() b: { address:string; city:string; state:string; zipCode?:string; beds?:number; baths?:number; sqft?:number; propertyType?:string }) {
    const usage = this.svc.getUsage();
    if (usage.status === 'limit_reached') return { error: 'limit_reached', message: usage.message, usage };
    const value = await this.svc.getValueEstimate(b.address, b.city, b.state, b.zipCode, b.beds, b.baths, b.sqft, b.propertyType);
    return { value, usage: this.svc.getUsage() };
  }
}
