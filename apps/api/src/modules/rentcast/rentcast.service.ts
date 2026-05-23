import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MONTHLY_LIMIT = 50;
const WARNING_THRESHOLD = 40;
let callsThisMonth = 0;
let lastResetMonth = new Date().getMonth();

function checkReset() {
  const m = new Date().getMonth();
  if (m !== lastResetMonth) { callsThisMonth = 0; lastResetMonth = m; }
}

@Injectable()
export class RentCastService {
  private readonly logger = new Logger(RentCastService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.rentcast.io/v1';
  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('RENTCAST_API_KEY') || '';
  }
  getUsage() {
    checkReset();
    const remaining = Math.max(0, MONTHLY_LIMIT - callsThisMonth);
    const status = callsThisMonth >= MONTHLY_LIMIT ? 'limit_reached' : callsThisMonth >= WARNING_THRESHOLD ? 'warning' : 'ok';
    const message = status === 'limit_reached' ? `RentCast limit reached (${MONTHLY_LIMIT}/month). Auto-fetch paused — enter estimates manually or upgrade your RentCast plan.` : status === 'warning' ? `Running low on RentCast calls (${callsThisMonth}/${MONTHLY_LIMIT} used).` : undefined;
    return { callsThisMonth, limit: MONTHLY_LIMIT, remaining, status, message };
  }
  async getValueEstimate(address: string, city: string, state: string, zipCode?: string, beds?: number, baths?: number, sqft?: number, propertyType?: string) {
    checkReset();
    if (!this.apiKey || callsThisMonth >= MONTHLY_LIMIT) return null;
    try {
      const typeMap: Record<string,string> = { SINGLE_FAMILY:'Single Family', MULTI_FAMILY:'Multi Family', CONDO:'Condo', TOWNHOUSE:'Townhouse' };
      const params = new URLSearchParams({ address: `${address}, ${city}, ${state}${zipCode?' '+zipCode:''}` });
      if (beds) params.set('bedrooms', String(beds));
      if (baths) params.set('bathrooms', String(baths));
      if (sqft) params.set('squareFootage', String(sqft));
      if (propertyType) params.set('propertyType', typeMap[propertyType] || 'Single Family');
      const res = await fetch(`${this.baseUrl}/avm/value?${params}`, { headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' } });
      if (!res.ok) { this.logger.error(`RentCast error: ${res.status}`); return null; }
      callsThisMonth++;
      this.logger.log(`RentCast AVM call #${callsThisMonth} — ${address}`);
      const data = await res.json();
      return { price: data.price, priceRangeLow: data.priceRangeLow, priceRangeHigh: data.priceRangeHigh };
    } catch(e) { this.logger.error(`RentCast failed: ${e}`); return null; }
  }
}
