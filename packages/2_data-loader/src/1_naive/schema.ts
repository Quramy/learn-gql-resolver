import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLInterfaceType,
} from "graphql"

export type Context = {
  readonly productModel: ProductModel
  readonly orderModel: OrderModel
}

const OrderInterface = new GraphQLInterfaceType({
  name: "OrderInterface",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    amount: {
      type: new GraphQLNonNull(GraphQLInt),
    },
    orderedAt: {
      type: new GraphQLNonNull(GraphQLString),
    },
  },
})

const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (source: ProductData) => source.id,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (source: ProductData) => source.name,
    },
    orders: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(OrderInterface))),
      resolve: (source: ProductData, __, context: Context) => context.orderModel.findManyByProduct(source.id),
    },
  },
})

const OrderType = new GraphQLObjectType({
  name: "Order",
  interfaces: [OrderInterface],
  isTypeOf: () => true,
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (source: OrderData) => source.id,
    },
    product: {
      type: new GraphQLNonNull(ProductType),
      resolve: (source: OrderData, _, context: Context) => context.productModel.findBy(source.productId),
    },
    amount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: (source: OrderData) => source.amount,
    },
    orderedAt: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (source: OrderData) => source.orderedAt.toISOString(),
    },
  },
})

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    product: {
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      type: ProductType,
      resolve: (_, args: { readonly id: string }, context: Context) => context.productModel.findBy(args.id),
    },
    allProducts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ProductType))),
      resolve: (_, __, context: Context) => context.productModel.fetchAll(),
    },
    order: {
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      type: OrderType,
      resolve: (_, args: { readonly id: string }, context: Context) => context.orderModel.findBy(args.id),
    },
    allOrders: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(OrderType))),
      resolve: (_, __, context: Context) => context.orderModel.fetchAll(),
    },
  },
})

export const createSchema = () =>
  new GraphQLSchema({
    query: QueryType,
  })

type ProductData = {
  readonly id: string
  readonly name: string
}

type OrderData = {
  readonly id: string
  readonly amount: number
  readonly productId: string
  readonly orderedAt: Date
}

export class ProductModel {
  async fetchAll(): Promise<readonly ProductData[]> {
    throw new Error("To be implemented lator")
  }

  async findBy(id: string): Promise<ProductData | null> {
    throw new Error("To be implemented lator")
  }
}

export class OrderModel {
  async fetchAll(): Promise<readonly OrderData[]> {
    throw new Error("To be implemented lator")
  }

  async findBy(id: string): Promise<OrderData | null> {
    throw new Error("To be implemented lator")
  }

  async findManyByProduct(...productIds: string[]): Promise<readonly OrderData[]> {
    throw new Error("To be implemented lator")
  }
}
