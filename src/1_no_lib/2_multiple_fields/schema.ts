import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql"

export const createSchema = (
  {
    helloResolver,
    goodbyeResolver,
  }: {
    readonly helloResolver: () => string
    readonly goodbyeResolver: () => string
  } = {
    helloResolver: () => "world",
    goodbyeResolver: () => "byebye",
  },
) =>
  new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        hello: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: helloResolver,
        },
        goodbye: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: goodbyeResolver,
        },
      },
    }),
  })
