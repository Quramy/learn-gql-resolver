import { execute, parse, DocumentNode, printSchema, print } from "graphql"

import { createSchema } from "./schema"

describe("schema", () => {
  describe("SDL", () => {
    it("generate schema definition", () => {
      const typeDefs = `
        type Query {
          hello: String!
          goodbye: String!
        }
      `
      expect(printSchema(createSchema())).toBe(print(parse(typeDefs)))
    })
  })

  describe("execution", () => {
    let document: DocumentNode
    let variableValues: Record<string, any> = {}
    const mockedHelloResolver = jest.fn(() => "WORLD")
    const mockedGoodbyeResolver = jest.fn(() => "BYE BYE")

    const subject = async () =>
      await execute({
        schema: createSchema({
          helloResolver: mockedHelloResolver,
          goodbyeResolver: mockedGoodbyeResolver,
        }),
        document,
        variableValues,
      })

    beforeEach(() => {
      variableValues = {}
      mockedHelloResolver.mockClear()
      mockedGoodbyeResolver.mockClear()
    })

    it("should resolve hello field", async () => {
      document = parse(`query { hello }`)
      await expect(subject()).resolves.toMatchObject({
        data: { hello: "WORLD" },
      })
      expect(mockedHelloResolver).toBeCalled()
      expect(mockedGoodbyeResolver).not.toBeCalled()
    })

    it("should resolve goodbye field", async () => {
      document = parse(`query { goodbye }`)
      await expect(subject()).resolves.toMatchObject({
        data: { goodbye: "BYE BYE" },
      })
      expect(mockedHelloResolver).not.toBeCalled()
      expect(mockedGoodbyeResolver).toBeCalled()
    })

    it("should resolve both fields", async () => {
      document = parse(`query { hello, goodbye }`)
      await expect(subject()).resolves.toMatchObject({
        data: { hello: "WORLD", goodbye: "BYE BYE" },
      })
      expect(mockedHelloResolver).toBeCalled()
      expect(mockedGoodbyeResolver).toBeCalled()
    })
  })
})
