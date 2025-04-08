import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({cmd: 'create_order'})
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern({cmd: 'find_all_orders'})
  findAll(
    @Payload() 
    orderPaginationDto: OrderPaginationDto
  ) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern({cmd: 'find_one_order'})
  findOne(
    @Payload('id') 
    id: string,
  ) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({cmd: 'change_order_status'})
  changeOrderStatus(
    @Payload() changeOrderStatusDto: ChangeOrderStatusDto
  ) {
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

//   @MessagePattern({cmd: 'update_order'})
//   update(@Payload() updateOrderDto: UpdateOrderDto) {
//     return this.ordersService.update(updateOrderDto.id, updateOrderDto);
//   }
// 
//   @MessagePattern({cmd: 'delete_order'})
//   remove(@Payload() id: number) {
//     return this.ordersService.remove(id);
//   }

}
