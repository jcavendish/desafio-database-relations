import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

interface IProductLookup {
  [key: string]: number;
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // Find customer and check if it exists
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Invalid customer');
    }

    // Create a lookup table with productId as key and quantity as value
    const productLookup = {} as IProductLookup;
    products.forEach(product => {
      productLookup[product.id] = product.quantity;
    });

    // Get ordered products from DB and check their validity
    const ids = Object.keys(productLookup).map(id => ({
      id,
    }));
    const foundProducts = await this.productsRepository.findAllById(ids);
    if (ids.length !== foundProducts.length) {
      throw new AppError('One or more products are invalid');
    }

    // Handle quantities for orders
    const updateProducts: IProduct[] = [];
    foundProducts.forEach(product => {
      const orderedProductQuantity = productLookup[product.id];
      if (orderedProductQuantity > product.quantity) {
        throw new AppError('The product you are trying to buy is out of stock');
      }
      updateProducts.push({
        id: product.id,
        quantity: product.quantity - orderedProductQuantity,
      });
    });
    // Update products quantities
    await this.productsRepository.updateQuantity(updateProducts);

    // Map product info with ordered product
    const orderedProducts = foundProducts.map(product => {
      const orderedQuantity = productLookup[product.id];

      const ordered = {
        ...product,
        product_id: product.id,
        quantity: orderedQuantity,
      };
      delete ordered.id;
      return ordered;
    });

    return this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });
  }
}

export default CreateOrderService;
