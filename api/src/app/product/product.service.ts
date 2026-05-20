import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Not, Repository } from 'typeorm';
import { error } from 'console';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    await this.ensureNameIsUnique(createProductDto.name);

    try {
      const product = this.productRepository.create(createProductDto);

      return await this.productRepository.save(product);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictException('Product name already exists');
      }

      throw error;
    }
  }

  async findAll(page = 1, limit = 10) {
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

  findOne(id: number) {
    return this.findProduct(id);
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findProduct(id);

    if (updateProductDto.name) {
      await this.ensureNameIsUnique(updateProductDto.name, id);
    }

    const updated = Object.assign(product, updateProductDto);

    try {
      return await this.productRepository.save(updated);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictException('Product name already exists');
      }

      throw error;
    }
  }
  remove(id: number) {
    return `This action removes a #${id} product`;
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

  private async findProduct(id: number) {
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
