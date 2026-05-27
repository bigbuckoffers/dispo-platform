// create-buyer.dto.ts
import {
  IsString, IsEmail, IsOptional, IsEnum, IsBoolean, IsArray,
  IsNumber, IsObject, Min, Max, ValidateNested, IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvestorType } from '@prisma/client';

export class CreateBuyBoxDto {
  @IsArray() @IsOptional() states?: string[];
  @IsArray() @IsOptional() counties?: string[];
  @IsArray() @IsOptional() zipCodes?: string[];
  @IsNumber() @IsOptional() @Min(0) radiusMiles?: number;
  @IsArray() @IsOptional() propertyTypes?: string[];
  @IsNumber() @IsOptional() @Min(0) minPrice?: number;
  @IsNumber() @IsOptional() maxPrice?: number;
  @IsNumber() @IsOptional() minArv?: number;
  @IsNumber() @IsOptional() maxArv?: number;
  @IsNumber() @IsOptional() @Min(0) minRehab?: number;
  @IsNumber() @IsOptional() maxRehab?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(20) minBeds?: number;
  @IsNumber() @IsOptional() @Max(20) maxBeds?: number;
  @IsNumber() @IsOptional() minSqft?: number;
  @IsNumber() @IsOptional() maxSqft?: number;
  @IsNumber() @IsOptional() @Min(1800) minYearBuilt?: number;
  @IsNumber() @IsOptional() maxYearBuilt?: number;
  @IsArray() @IsOptional() investmentStrategy?: string[];
  @IsNumber() @IsOptional() @Min(0) maxAssignmentFee?: number;
  @IsEnum(['COSMETIC_ONLY','LIGHT','MEDIUM','HEAVY','FULL_GUT']) @IsOptional() rehabTolerance?: string;
}

export class CreateBuyerDto {
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() company?: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsUrl() @IsOptional() website?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() llcNames?: string[];
  @ApiPropertyOptional() @IsEnum(InvestorType) @IsOptional() investorType?: InvestorType;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasCash?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasHardMoney?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() tags?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() source?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ghlContactId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() importSource?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() marketPrimary?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() buyerIntelNotes?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() preferredStrategies?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() marketSecondary?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() dealBreakers?: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() avgCloseSpeedDays?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() preferredTitleCo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() preferredLender?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() closeCount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cancelCount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() retradeCount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ghostCount?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() aiSummary?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() proofOfFundsUrl?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxEmd?: number;
  @ApiPropertyOptional() @IsOptional() rawImportData?: any;
  @ApiPropertyOptional() @IsOptional() seriousnessScore?: number;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => CreateBuyBoxDto)
  @IsOptional()
  buyBox?: CreateBuyBoxDto;
}
