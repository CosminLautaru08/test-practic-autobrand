import type { Repository } from 'typeorm';
import type { ProductEntity } from './entities/product.entity';

const { ConflictException } = require('@nestjs/common');
const { ProductService } = require('./product.service');

describe('ProductService', () => {
  let service: InstanceType<typeof ProductService>;
  let repository: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let queryBuilder: {
    addOrderBy: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
    orderBy: jest.Mock;
    where: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    repository = {
      create: jest.fn((value) => value),
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
    };

    service = new ProductService(
      repository as unknown as Repository<ProductEntity>,
    );
  });

  it('rejects creating a product when the name only differs by case', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 2,
      name: 'widget',
    });

    await expect(
      service.create({
        name: 'Widget',
        price: 12,
        currency: 'RON',
        description: 'demo',
        imageUrl: 'https://example.com/widget.jpg',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(TRIM(product.name)) = LOWER(TRIM(:name))',
      { name: 'Widget' },
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('keeps the trimmed casing on update while checking uniqueness case-insensitively', async () => {
    repository.findOne.mockResolvedValue({
      id: 1,
      name: 'Original',
      price: 15,
      currency: 'RON',
      exchangeRate: 1,
      priceRon: 15,
      description: 'existing description',
      imageUrl: 'https://example.com/original.jpg',
    });
    queryBuilder.getOne.mockResolvedValue(null);

    const updated = await service.update(1, {
      name: '  WiDget  ',
      price: 18,
      currency: 'RON',
      exchangeRate: 1,
      priceRon: 18,
      description: 'updated description',
      imageUrl: 'https://example.com/widget.jpg',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'product.id != :excludeId',
      { excludeId: 1 },
    );
    expect(updated.name).toBe('WiDget');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: 'WiDget',
      }),
    );
  });

  it('reuses an existing scraper product when the incoming name only changes case', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 7,
      name: 'crst',
      price: 20,
      currency: 'RON',
      exchangeRate: 1,
      priceRon: 20,
      description: 'old description',
      imageUrl: 'https://example.com/old.jpg',
    });

    const saved = await service.upsertFromScraper({
      name: 'Crst',
      price: 21.5,
      currency: 'RON',
      description: 'new description',
      imageUrl: 'https://example.com/new.jpg',
    });

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        name: 'Crst',
        price: 21.5,
      }),
    );
    expect(saved.name).toBe('Crst');
  });
});
