import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UpdateProduct } from '../interfaces/update-product';

export class UpdateProductDto implements UpdateProduct {
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  name: string;
  @IsNumber()
  @Min(0)
  price: number;
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceRon?: number;
  @IsString()
  @MaxLength(5000)
  description: string;
  @IsString()
  @MaxLength(5000)
  imageUrl: string;
}
