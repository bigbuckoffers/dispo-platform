import { RentCastService } from './rentcast.service';
export declare class RentCastController {
    private readonly svc;
    constructor(svc: RentCastService);
    getUsage(): {
        callsThisMonth: number;
        limit: number;
        remaining: number;
        status: string;
        message: string;
    };
    estimate(b: {
        address: string;
        city: string;
        state: string;
        zipCode?: string;
        beds?: number;
        baths?: number;
        sqft?: number;
        propertyType?: string;
    }): Promise<{
        error: string;
        message: string;
        usage: {
            callsThisMonth: number;
            limit: number;
            remaining: number;
            status: string;
            message: string;
        };
        value?: undefined;
    } | {
        value: {
            price: any;
            priceRangeLow: any;
            priceRangeHigh: any;
        };
        usage: {
            callsThisMonth: number;
            limit: number;
            remaining: number;
            status: string;
            message: string;
        };
        error?: undefined;
        message?: undefined;
    }>;
}
