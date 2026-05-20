import {
  IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType, OccupancyStatus } from '@prisma/client';

export class CreateDealDto {
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() zipCode: string;
  @ApiPropertyOptional() @IsString() @IsOptional() county?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() latitude?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() longitude?: number;

  @ApiProperty() @IsNumber() @Min(0) askingPrice: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() arv?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() assignmentFee?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() repairEstimate?: number;

  @ApiPropertyOptional() @IsEnum(PropertyType) @IsOptional() propertyType?: PropertyType;
  @ApiPropertyOptional() @IsNumber() @IsOptional() beds?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() baths?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sqft?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() yearBuilt?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() lotSize?: number;

  @ApiPropertyOptional() @IsEnum(OccupancyStatus) @IsOptional() occupancy?: OccupancyStatus;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() hasLiens?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() lienAmount?: number;

  @ApiPropertyOptional() @IsString() @IsOptional() sellerNotes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() accessInstructions?: string;
}
