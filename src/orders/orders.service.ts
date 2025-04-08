import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChangeOrderStatusDto, CreateOrderDto } from './dto/';
import { PrismaClient } from '@prisma/client';
import { OrderPaginationDto } from './dto/';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrsersService');

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Orders Database connected');

  }

  async create(createOrderDto: CreateOrderDto) {

    try {

      // 1. Confirmar los ids de los productos
      const productIds = createOrderDto.items.map(item => item.productId);
      const products: any[] = await this.ValidateProduct(productIds);

      // 2. Cálculos de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return price * orderItem.quantity;

      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)

      // 3. Crear una transacción de base de datos
      const order = await this.order.create({
        data: {
          totalAmmount: totalAmount,
          totalItems: totalItems,
          OrderItems: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              })),
            },
          },
        },
        include: {
          OrderItems: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          }
        }
      });

      const { OrderItems, ...rest } = order;

      return {
        ...rest,
        OrderItem: OrderItems.map((orderItem) => ({
          productId: orderItem.productId,
          name: products.find(product => product.id === orderItem.productId)?.name || null,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      };



    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs'
      })
    }

  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10, status } = orderPaginationDto;
  
    const totalOrders = await this.order.count({
      where: { status },
    });
  
    if (totalOrders === 0) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `No orders found with status '${status}'`,
      });
    }
  
    const lastPage = Math.ceil(totalOrders / limit);
  
    if (page > lastPage) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Page #${page} not found`,
      });
    }
  
    const orders = await this.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: { status },
    });
  
    return {
      data: orders,
      meta: {
        total: totalOrders,
        page,
        lastPage,
        limit,
        hasNextPage: page < lastPage,
      },
    };
  }
  
  async findOne(id: string) {

    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItems: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({
        message: `order with id #${id} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    const productIds = order.OrderItems.map( orderItem =>  orderItem.productId );
    const products: any[] = await this.ValidateProduct(productIds);


    const { OrderItems, ...rest } = order;

      return {
        ...rest,
        OrderItem: OrderItems.map((orderItem) => ({
          productId: orderItem.productId,
          name: products.find(product => product.id === orderItem.productId)?.name || null,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      };

  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    if (!order) {
      throw new RpcException({
        message: `order with id #${id} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    return this.order.update({
      where: { id },
      data: { status: status },
    });

  }

  async ValidateProduct(productIds){
    return await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productIds)
    )
  }

  //   update(id: number, updateOrderDto: UpdateOrderDto) {
  //     return `This action updates a #${id} order`;
  //   }
  // 
  //   remove(id: number) {
  //     return `This action removes a #${id} order`;
  //   }

}
