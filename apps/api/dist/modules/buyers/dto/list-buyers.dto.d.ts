import { BuyerTier, InvestorType } from '@prisma/client';
export declare class ListBuyersDto {
    page?: number;
    limit?: number;
    search?: string;
    tier?: BuyerTier;
    investorType?: InvestorType;
    sortBy?: string;
    minScore?: number;
    isActive?: boolean;
}
import { CreateBuyerDto } from './create-buyer.dto';
declare const UpdateBuyerDto_base: import("@nestjs/common").Type<Partial<Omit<CreateBuyerDto, "buyBox">>>;
export declare class UpdateBuyerDto extends UpdateBuyerDto_base {
}
export { CreateBuyBoxDto as UpdateBuyBoxDto } from './create-buyer.dto';
