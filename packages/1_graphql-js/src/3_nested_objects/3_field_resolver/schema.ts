import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLString, GraphQLID } from "graphql"

export type Context = {
  readonly productModel: ProductModel
}

const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (source: ProductFindByResult) => source.id,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (source: ProductFindByResult) => source.name.toUpperCase(),
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

type ProductFindByResult = {
  readonly id: string
  readonly name: string
}

export class ProductModel {
  async findBy(id: string): Promise<ProductFindByResult | null> {
    throw new Error("To be implemented lator")
  }
}
