import { getRepository, Repository } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

interface IProductLookup {
  [key: string]: number;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({ name, price, quantity });

    return this.ormRepository.save(product);
  }

  public async findByName(name: string): Promise<Product | undefined> {
    return this.ormRepository.findOne({
      where: {
        name,
      },
    });
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const productIds = products.map(product => product.id);

    return this.ormRepository.findByIds(productIds);
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const quantityLookup = {} as IProductLookup;
    products.forEach(product => {
      quantityLookup[product.id] = product.quantity;
    });

    const productIds = Object.keys(quantityLookup);
    const foundProducts = await this.ormRepository.findByIds(productIds);

    const updatedProducts = foundProducts.map(product => {
      const quantity = quantityLookup[product.id];

      return {
        ...product,
        quantity,
      };
    });

    return this.ormRepository.save(updatedProducts);
  }
}

export default ProductsRepository;
