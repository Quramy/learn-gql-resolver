import { execute, parse, DocumentNode, printSchema, buildSchema, print, GraphQLError } from "graphql"

import { createSchema } from "./schema"

describe("schema", () => {
  describe("SDL", () => {
    it("generate schema definition", () => {
      const typeDefs = `
        type Query {
          hello: String!
        }
      `
      expect(printSchema(createSchema())).toBe(print(parse(typeDefs)))
    })
  })

  describe("execution", () => {
    let document: DocumentNode
    const subject = async () => await execute({ schema: createSchema(), document })

    it("should resolve hello field", async () => {
      document = parse(`query { hello }`)
      await expect(subject()).resolves.toMatchObject({
        data: { hello: "world" },
      })
    })
  })
})

describe("client schema", () => {
  it("should resolve not field value but GraphQLError", async () => {
    const SDLString = printSchema(createSchema())
    const clientSchema = buildSchema(SDLString)
    const subject = async () => await execute({ schema: clientSchema, document: parse(`query { hello }`) })
    await expect(subject()).resolves.toMatchObject({
      data: null,
    })
    expect((await subject()).errors?.[0]).toBeInstanceOf(GraphQLError)
  })
})
