import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductEntity } from './entities/product.entity';
import { CreateProduct } from './interfaces/create-product';
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
      const product = this.productRepository.create(
        this.applyPricingMetadata(createProductDto),
      );

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

    const updated = this.applyPricingMetadata(
      Object.assign(product, updateProductDto),
    );

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

  async upsertFromScraper(product: CreateProduct): Promise<Product> {
    const normalizedProduct = this.applyPricingMetadata(product);
    const existing = await this.productRepository.findOne({
      where: { name: normalizedProduct.name },
    });

    if (existing) {
      const updated = Object.assign(existing, normalizedProduct);
      return this.productRepository.save(updated);
    }

    const newProduct = this.productRepository.create(normalizedProduct);
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

  private applyPricingMetadata<T extends CreateProductDto | ProductModel>(
    product: T,
  ): T {
    const price = this.normalizeAmount(product.price);
    const currency = this.normalizeCurrency(product.currency);

    if (currency === 'RON') {
      return Object.assign(product, {
        price,
        currency,
        exchangeRate: 1,
        priceRon: price,
      });
    }

    if (
      typeof product.exchangeRate !== 'number' ||
      Number.isNaN(product.exchangeRate) ||
      product.exchangeRate <= 0
    ) {
      throw new BadRequestException(
        `Exchange rate is required when currency is ${currency}.`,
      );
    }

    const exchangeRate = this.normalizeExchangeRate(product.exchangeRate);

    return Object.assign(product, {
      price,
      currency,
      exchangeRate,
      priceRon: this.normalizeAmount(price * exchangeRate),
    });
  }

  private normalizeCurrency(currency?: string): string {
    return currency?.trim().toUpperCase() || 'RON';
  }

  private normalizeAmount(value: number): number {
    return Number(value.toFixed(2));
  }

  private normalizeExchangeRate(value: number): number {
    return Number(value.toFixed(4));
  }
  //#endregion
}
