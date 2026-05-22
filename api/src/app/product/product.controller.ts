import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsDto } from './dto/product-pagination';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductList } from './interfaces/product';
import { ProductService } from './product.service';

@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(@Query() query: FindProductsDto): Promise<ProductList> {
    return this.productService.findAll(query);
  }
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Product> {
    return this.productService.remove(+id);
  }
}
