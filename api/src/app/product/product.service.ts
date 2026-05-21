import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { Not, Repository } from 'typeorm';
import { Product, ProductList } from './interfaces/product';
import { ProductModel } from './models/product.model';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private productRepository: Repository<ProductEntity>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    await this.ensureNameIsUnique(createProductDto.name);

    try {
      const product = this.productRepository.create(createProductDto);

      return this.productRepository.save(product);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictException('Product name already exists');
      }

      throw error;
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findProduct(id);

    if (updateProductDto.name) {
      await this.ensureNameIsUnique(updateProductDto.name, id);
    }

    const updated = Object.assign(product, updateProductDto);

    try {
      return this.productRepository.save(updated);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictException('Product name already exists');
      }

      throw error;
    }
  }

  async findAll(page = 1, limit = 10): Promise<ProductList> {
    const [data, total] = await this.productRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        id: 'DESC',
      },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Product> {
    return this.findProduct(id);
  }

  async remove(id: number): Promise<Product> {
    const product = await this.findProduct(id);
    await this.productRepository.remove(product);
    return product;
  }

  async upsertFromScraper(product: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { name: product.name },
    });

    if (existing) {
      const updated = Object.assign(existing, product);
      return this.productRepository.save(updated);
    }

    const newProduct = this.productRepository.create(product);
    return this.productRepository.save(newProduct);
  }

  //#region Private methods

  private async ensureNameIsUnique(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existingProduct = await this.productRepository.findOne({
      where: {
        name,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    if (existingProduct) {
      throw new ConflictException('Product name already exists');
    }
  }

  private async findProduct(id: number): Promise<ProductModel> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }
  //#endregion
}
