import { ConfigService } from '@nestjs/config';
export declare class RentCastService {
    private config;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(config: ConfigService);
    getUsage(): {
        callsThisMonth: number;
        limit: number;
        remaining: number;
        status: string;
        message: string;
    };
    getValueEstimate(address: string, city: string, state: string, zipCode?: string, beds?: number, baths?: number, sqft?: number, propertyType?: string): Promise<{
        price: any;
        priceRangeLow: any;
        priceRangeHigh: any;
    }>;
}
