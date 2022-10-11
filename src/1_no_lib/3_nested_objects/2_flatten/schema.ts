import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLString, GraphQLID } from "graphql"

type ProductFindByResult = {
  readonly id: string
  readonly name: string
}

export class ProductModel {
  async findBy(id: string): Promise<ProductFindByResult | null> {
    throw new Error("To be implemented lator")
  }
}

export type Context = {
  readonly productModel: ProductModel
}

const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
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
  },
})

export const createSchema = () =>
  new GraphQLSchema({
    query: QueryType,
  })
