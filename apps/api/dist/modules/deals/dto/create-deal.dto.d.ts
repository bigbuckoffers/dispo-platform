import { PropertyType, OccupancyStatus } from '@prisma/client';
export declare class CreateDealDto {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    county?: string;
    latitude?: number;
    longitude?: number;
    askingPrice: number;
    arv?: number;
    assignmentFee?: number;
    repairEstimate?: number;
    propertyType?: PropertyType;
    beds?: number;
    baths?: number;
    sqft?: number;
    yearBuilt?: number;
    lotSize?: number;
    occupancy?: OccupancyStatus;
    hasLiens?: boolean;
    lienAmount?: number;
    sellerNotes?: string;
    accessInstructions?: string;
}
