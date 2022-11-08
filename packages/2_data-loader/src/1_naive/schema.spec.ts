import { execute, parse, DocumentNode, printSchema, print } from "graphql"

import { createSchema, ProductModel, OrderModel } from "./schema"

describe("schema", () => {
  describe("SDL", () => {
    it("generate schema definition", () => {
      const typeDefs = `
        type Query {
          product(id: ID!): Product
          allProducts: [Product!]!
          order(id: ID!): Order
          allOrders: [Order!]!
        }

        type Product {
          id: ID!
          name: String!
          orders: [OrderInterface!]!
        }

        interface OrderInterface {
          id: ID!
          amount: Int!
          orderedAt: String!
        }

        type Order implements OrderInterface {
          id: ID!
          product: Product!
          amount: Int!
          orderedAt: String!
        }
      `
      expect(printSchema(createSchema())).toBe(print(parse(typeDefs)))
    })
  })

  describe("execution", () => {
    let document: DocumentNode
    let variableValues: Record<string, any> = {}
    const productModel = new ProductModel()
    const orderModel = new OrderModel()
    const productFindBy = jest.spyOn(productModel, "findBy")
    const productFetchAll = jest.spyOn(productModel, "fetchAll")
    const orderFindBy = jest.spyOn(orderModel, "findBy")
    const orderFetchAll = jest.spyOn(orderModel, "fetchAll")
    const orderfindManyByProduct = jest.spyOn(orderModel, "findManyByProduct")
    const mocks = [productFindBy, productFetchAll, orderFindBy, orderFetchAll, orderfindManyByProduct]
    const subject = async () =>
      await execute({ schema: createSchema(), contextValue: { productModel, orderModel }, document, variableValues })

    beforeEach(() => {
      variableValues = {}
      mocks.forEach(mock => mock.mockClear())
    })

    describe("when product to look up exists", () => {
      beforeEach(() => {
        const products = [
          { id: "001", name: "product 001" },
          { id: "002", name: "product 002" },
          { id: "003", name: "product 003" },
          { id: "004", name: "product 004" },
          { id: "005", name: "product 005" },
          { id: "006", name: "product 006" },
        ]
        const orders = [
          { id: "order001", productId: "001", amount: 1_000, orderedAt: new Date("2022-11-01") },
          { id: "order002", productId: "002", amount: 2_000, orderedAt: new Date("2022-11-02") },
          { id: "order003", productId: "001", amount: 4_000, orderedAt: new Date("2022-11-03") },
          { id: "order004", productId: "003", amount: 3_000, orderedAt: new Date("2022-11-04") },
          { id: "order005", productId: "003", amount: 5_000, orderedAt: new Date("2022-11-05") },
        ]
        productFindBy.mockImplementation(id => Promise.resolve(products.find(data => data.id === id) ?? null))
        productFetchAll.mockImplementation(() => Promise.resolve(products))
        orderFindBy.mockImplementation(id => Promise.resolve(orders.find(data => data.id === id) ?? null))
        orderFetchAll.mockImplementation(() => Promise.resolve(orders))
        orderfindManyByProduct.mockImplementation((...ids) =>
          Promise.resolve(orders.filter(order => ids.includes(order.productId))),
        )
      })

      test("product", async () => {
        document = gql`
          query ProductQuery($id: ID!) {
            product(id: $id) {
              id
            }
          }
        `
        variableValues = { id: "001" }
        await expect(subject()).resolves.toMatchObject({
          data: { product: { id: "001" } },
        })
        expect(productFindBy).toBeCalledTimes(1)
        expect(orderFetchAll).toBeCalledTimes(0)
        expect(orderFindBy).toBeCalledTimes(0)
      })

      test("nested object", async () => {
        document = gql`
          query OrderQuery($id: ID!) {
            order(id: $id) {
              id
              amount
              product {
                id
                name
              }
            }
          }
        `
        variableValues = { id: "order001" }
        await expect(subject()).resolves.toMatchObject({
          data: {
            order: { product: { id: "001", name: "product 001" } },
          },
        })
        expect(productFindBy).toBeCalledTimes(1)
        expect(orderFindBy).toBeCalledTimes(1)
      })

      test("object in list", async () => {
        document = gql`
          query OrdersQuery {
            allOrders {
              id
              amount
              product {
                id
                name
              }
            }
          }
        `
        variableValues = {}
        await expect(subject()).resolves.toMatchObject({
          data: {
            allOrders: [{}, {}, {}, {}, {}],
          },
        })
        expect(orderFetchAll).toBeCalledTimes(1)
        expect(orderFindBy).toBeCalledTimes(0)
        expect(productFindBy).toBeCalledTimes(5)
      })

      test("object in list", async () => {
        document = gql`
          query ProductsOrdersQuery {
            allProducts {
              id
              name
              orders {
                id
                amount
                orderedAt
              }
            }
          }
        `
        variableValues = {}
        await expect(subject()).resolves.toMatchObject({
          data: {
            allProducts: [{}, {}, {}, {}, {}, {}],
          },
        })
        expect(productFetchAll).toBeCalledTimes(1)
        expect(orderfindManyByProduct).toBeCalledTimes(6)
      })
    })
  })
})

function gql(arr: TemplateStringsArray) {
  return parse(arr[0])
}
