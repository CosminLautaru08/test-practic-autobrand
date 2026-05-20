import {
  IsString,
  MaxLength,
  IsNumber,
  Min,
  IsNotEmpty,
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
  @IsString()
  @MaxLength(5000)
  description: string;
  @IsString()
  @MaxLength(5000)
  imageUrl: string;
}
