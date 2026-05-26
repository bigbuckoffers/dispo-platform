"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RentCastService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentCastService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const MONTHLY_LIMIT = 50;
const WARNING_THRESHOLD = 40;
let callsThisMonth = 0;
let lastResetMonth = new Date().getMonth();
function checkReset() {
    const m = new Date().getMonth();
    if (m !== lastResetMonth) {
        callsThisMonth = 0;
        lastResetMonth = m;
    }
}
let RentCastService = RentCastService_1 = class RentCastService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RentCastService_1.name);
        this.baseUrl = 'https://api.rentcast.io/v1';
        this.apiKey = this.config.get('RENTCAST_API_KEY') || '';
    }
    getUsage() {
        checkReset();
        const remaining = Math.max(0, MONTHLY_LIMIT - callsThisMonth);
        const status = callsThisMonth >= MONTHLY_LIMIT ? 'limit_reached' : callsThisMonth >= WARNING_THRESHOLD ? 'warning' : 'ok';
        const message = status === 'limit_reached' ? `RentCast limit reached (${MONTHLY_LIMIT}/month). Auto-fetch paused — enter estimates manually or upgrade your RentCast plan.` : status === 'warning' ? `Running low on RentCast calls (${callsThisMonth}/${MONTHLY_LIMIT} used).` : undefined;
        return { callsThisMonth, limit: MONTHLY_LIMIT, remaining, status, message };
    }
    async getValueEstimate(address, city, state, zipCode, beds, baths, sqft, propertyType) {
        checkReset();
        if (!this.apiKey || callsThisMonth >= MONTHLY_LIMIT)
            return null;
        try {
            const typeMap = { SINGLE_FAMILY: 'Single Family', MULTI_FAMILY: 'Multi Family', CONDO: 'Condo', TOWNHOUSE: 'Townhouse' };
            const params = new URLSearchParams({ address: `${address}, ${city}, ${state}${zipCode ? ' ' + zipCode : ''}` });
            if (beds)
                params.set('bedrooms', String(beds));
            if (baths)
                params.set('bathrooms', String(baths));
            if (sqft)
                params.set('squareFootage', String(sqft));
            if (propertyType)
                params.set('propertyType', typeMap[propertyType] || 'Single Family');
            const res = await fetch(`${this.baseUrl}/avm/value?${params}`, { headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' } });
            if (!res.ok) {
                this.logger.error(`RentCast error: ${res.status}`);
                return null;
            }
            callsThisMonth++;
            this.logger.log(`RentCast AVM call #${callsThisMonth} — ${address}`);
            const data = await res.json();
            return { price: data.price, priceRangeLow: data.priceRangeLow, priceRangeHigh: data.priceRangeHigh };
        }
        catch (e) {
            this.logger.error(`RentCast failed: ${e}`);
            return null;
        }
    }
};
exports.RentCastService = RentCastService;
exports.RentCastService = RentCastService = RentCastService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RentCastService);
//# sourceMappingURL=rentcast.service.js.map