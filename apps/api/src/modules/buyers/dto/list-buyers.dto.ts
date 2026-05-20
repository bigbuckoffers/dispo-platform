// list-buyers.dto.ts
import { IsOptional, IsNumber, IsString, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BuyerTier, InvestorType } from '@prisma/client';

export class ListBuyersDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) limit?: number = 25;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(BuyerTier) tier?: BuyerTier;
  @IsOptional() @IsEnum(InvestorType) investorType?: InvestorType;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minScore?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() isActive?: boolean = true;
}

// update-buyer.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBuyerDto } from './create-buyer.dto';

export class UpdateBuyerDto extends PartialType(OmitType(CreateBuyerDto, ['buyBox'] as const)) {}

// update-buy-box.dto.ts
export { CreateBuyBoxDto as UpdateBuyBoxDto } from './create-buyer.dto';
