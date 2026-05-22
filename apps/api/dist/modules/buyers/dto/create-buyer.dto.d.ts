import { InvestorType } from '@prisma/client';
export declare class CreateBuyBoxDto {
    states?: string[];
    counties?: string[];
    zipCodes?: string[];
    radiusMiles?: number;
    propertyTypes?: string[];
    minPrice?: number;
    maxPrice?: number;
    minArv?: number;
    maxArv?: number;
    minRehab?: number;
    maxRehab?: number;
    minBeds?: number;
    maxBeds?: number;
    minSqft?: number;
    maxSqft?: number;
    minYearBuilt?: number;
    maxYearBuilt?: number;
    investmentStrategy?: string[];
    maxAssignmentFee?: number;
    rehabTolerance?: string;
}
export declare class CreateBuyerDto {
    firstName: string;
    lastName: string;
    company?: string;
    email: string;
    phone?: string;
    website?: string;
    llcNames?: string[];
    investorType?: InvestorType;
    hasCash?: boolean;
    hasHardMoney?: boolean;
    notes?: string;
    tags?: string[];
    source?: string;
    buyBox?: CreateBuyBoxDto;
}
