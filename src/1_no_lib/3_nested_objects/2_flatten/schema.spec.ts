import { execute, parse, DocumentNode, printSchema, print } from "graphql"

import { createSchema, ProductModel } from "./schema"

describe("schema", () => {
  describe("SDL", () => {
    it("generate schema definition", () => {
      const typeDefs = `
        type Query {
          product(id: ID!): Product
        }

        type Product {
          id: ID!
          name: String!
        }
      `
      expect(printSchema(createSchema())).toBe(print(parse(typeDefs)))
    })
  })

  describe("execution", () => {
    let document: DocumentNode
    let variableValues: Record<string, any> = {}
    const productModel = new ProductModel()
    const findBy = jest.spyOn(productModel, "findBy")
    const subject = async () =>
      await execute({ schema: createSchema(), contextValue: { productModel }, document, variableValues })

    beforeEach(() => {
      variableValues = {}
      findBy.mockClear()
    })

    describe("when product to look up exists", () => {
      beforeEach(() => findBy.mockResolvedValue({ id: "001", name: "product 001" }))

      it("should resolve product field with Product type object", async () => {
        document = parse(`query ProductQuery($id: ID!) { product(id: $id) { name } }`)
        variableValues = { id: "001" }
        await expect(subject()).resolves.toMatchObject({
          data: {
            product: { name: "product 001" },
          },
        })
        expect(findBy).toBeCalledWith("001")
      })
    })

    describe("when product to look up does not exist", () => {
      beforeEach(() => findBy.mockResolvedValue(null))

      it("should resolve product field as null", async () => {
        document = parse(`query ProductQuery($id: ID!) { product(id: $id) { name } }`)
        variableValues = { id: "001" }
        await expect(subject()).resolves.toMatchObject({
          data: {
            product: null,
          },
        })
        expect(findBy).toBeCalledWith("001")
      })
    })
  })
})

