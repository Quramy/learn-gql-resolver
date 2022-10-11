import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql"

export const createSchema = () =>
  new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        hello: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: () => "world",
        },
      },
    }),
  })
