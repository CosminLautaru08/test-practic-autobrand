import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateProduct } from '../interfaces/create-product';

export class CreateProductDto implements CreateProduct {
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
  imageUrl: string;
}
