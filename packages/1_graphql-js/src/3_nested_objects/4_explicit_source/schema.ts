import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLString, GraphQLID } from "graphql"

export type Context = {
  readonly productModel: ProductModel
}

const res = Symbol("response")

export type Source<TInner extends Record<string, unknown> = Record<string, unknown>> = {
  [res]: TInner
}

const wrap = <TInner extends Record<string, unknown> = Record<string, unknown>>(response: TInner | null) =>
  res ? { [res]: response } : null

const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (source: Source<ProductFindByResult>) => source[res].id,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (source: Source<ProductFindByResult>) => source[res].name,
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
      resolve: (_, args: { readonly id: string }, context: Context) => context.productModel.findBy(args.id).then(wrap),
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
