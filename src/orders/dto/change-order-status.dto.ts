import { IsEnum, IsUUID } from "class-validator";
import { OrderStatusList } from "../enum/order.enum";
import { OrderStatus } from "@prisma/client";

export class ChangeOrderStatusDto {

  @IsUUID('4')  
  id: string;

  @IsEnum(OrderStatusList,{
    message: `Valid Status are ${ OrderStatusList }`
  })
  status: OrderStatus;
}