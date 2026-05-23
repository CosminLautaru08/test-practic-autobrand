import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsDto } from './dto/product-pagination';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { CreateProduct } from './interfaces/create-product';
import { Product, ProductList } from './interfaces/product';
import { ProductModel } from './models/product.model';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private productRepository: Repository<ProductEntity>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const normalizedProduct = this.normalizeProductInput(createProductDto);

    await this.ensureNameIsUnique(normalizedProduct.name);

    try {
      const product = this.productRepository.create(
        this.applyPricingMetadata(normalizedProduct),
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
    const normalizedProduct = this.normalizeProductInput(updateProductDto);

    if (typeof normalizedProduct.name === 'string') {
      await this.ensureNameIsUnique(normalizedProduct.name, id);
    }

    const updated = this.applyPricingMetadata(
      Object.assign(product, normalizedProduct),
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

  async findAll(body: FindProductsDto): Promise<ProductList> {
    const query = this.productRepository.createQueryBuilder('product');

    if (body?.name) {
      query.andWhere('LOWER(product.name) LIKE LOWER(:name)', {
        name: `%${body.name}%`,
      });
    }

    const sortField = body?.sortField || 'id';
    const sortOrder = body?.sortOrder || 'DESC';

    query.orderBy(`product.${sortField}`, sortOrder);

    query.skip((body.page - 1) * body.limit).take(body.limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page: body.page,
      lastPage: Math.ceil(total / body.limit),
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
    const normalizedProduct = this.applyPricingMetadata(
      this.normalizeProductInput(product),
    );
    const existing = await this.findProductByName(normalizedProduct.name);

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
    const existingProduct = await this.findProductByName(name, excludeId);

    if (existingProduct) {
      throw new ConflictException('Product name already exists');
    }
  }

  private findProductByName(
    name: string,
    excludeId?: number,
  ): Promise<ProductEntity | null> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(TRIM(product.name)) = LOWER(TRIM(:name))', {
        name,
      });

    if (excludeId !== undefined) {
      query.andWhere('product.id != :excludeId', { excludeId });
    }

    return query
      .orderBy('product.updatedAt', 'DESC')
      .addOrderBy('product.id', 'DESC')
      .getOne();
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

  private applyPricingMetadata<T extends CreateProduct>(product: T): T {
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

  private normalizeProductInput<T extends { name: string }>(product: T): T {
    return Object.assign({}, product, {
      name: this.normalizeProductName(product.name),
    });
  }

  private normalizeProductName(name: string): string {
    return name.trim();
  }
  //#endregion
}
