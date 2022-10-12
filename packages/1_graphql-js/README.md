# GraphQL Resolver 基本のき

## はじめに

ここでは GraphQL の参照実装(Reference Implementation) である https://github.com/graphql/graphql-js を使って GraphQL Resolver を構築する方法を見ていきます。

実務上では JavaScript / TypeScript のエコシステムで GraphQL サーバーサイド開発を行う上で、graphql-js のみで Resolver を組んでいくことは殆ど無いと思います。
しかし、 graphql-tools や Apollo Server など、頻繁に用いられるライブラリやフレームワークにおいても、大概のケースが Dependency(または Peer Dependency)に graphql-js を要求しており、最終的な GraphQL クエリの実行は graphql-js を利用しています。この意味では、graphql-tools などのライブラリは graphql-js のラッパーでしかありません。ライブラリやフレームワークの使い方を学ぶことは、それはそれで意味があるのですが、GraphQL バックエンドの根本的な動きを理解する上では、やはり基礎となる graphql-js 本体の挙動や機構を知っておくことも有用なのです。

なお、graphql-js の世界では "Executable Schema" のような呼称を用いるのですが、筆者が面倒なので、"Resolver" という単語にして説明します。特に断わりがなければ「サーバーサイドで動作する GraphQL の実体」程度の意味と捉えていただいて構いません。

## Hello world

### First GraphQL Schema

最も簡単な Resolver の例として、まずは Hello World のコードから見ていきましょう。graphql-js に記載の Hello World とほぼ同じコードです。

```ts
/* schema.ts */

import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLString } from "graphql"

export const createSchema = () =>
  new GraphQLSchema({
    // (A)
    query: new GraphQLObjectType({
      // (B)
      name: "Query",
      fields: {
        hello: {
          // (C)
          type: new GraphQLNonNull(GraphQLString),
        },
      },
    }),
  })
```

すごくシンプルな Schema 定義ですね。とはいえ、幾つか GraphQL における作法が垣間見えるコードなので、かるくポイントを列挙しておきましょう。

- A. `GraphQLSchema` クラスのインスタンスを作成することで、GraphQL Schema が得られる
- B. `Query` という 名前で GraphQL Object 型を定義している. また、この型は `query` というオプションに紐付いている
- C. `Query` には `hello` というフィールドが存在しており、このフィールドは 非 Null な文字列型である

上記の `createSchema` 関数で生成した Schema オブジェクトからは、対応する SDL (Schema Definition Language) 表現を得ることができます。今回の場合、SDL は以下のようになるはずです。

```graphql
type Query {
  hello: String!
}
```

実際にこの SDL が得られることをテストコードを書いて確認してみましょう。 graphql-js から import 可能である `printSchema` 関数を利用することで、Schema オブジェクトを SDL 表現に変換できます（ `print` や `parse` は一旦無視してもらって問題ありません）。

```ts
/* schema.spec.ts */

import { printSchema, parse, print } from "graphql"

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
})
```

### Field Resolver で値を返す

さて、この Schema が以下の SDL に対応していることはわかったものの、このままでは実行ができません。

```graphql
type Query {
  hello: String!
}
```

作成した Schema が以下のクエリを実行できるようにしていきましょう。

```graphql
query {
  hello
}
```

先程の `createSchema` 関数に `resolve: () => "world"` という行を追加します。

```ts
new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      hello: {
        type: new GraphQLNonNull(GraphQLString),
        resolve: () => "world", // この行を追加
      },
    },
  }),
})
```

これで「 `hello` というフィールドが要求されたら `world` という値を解決する」という意味になります。

フィールドに反応して値を返すことから、このような関数は "Field Resolver" と呼ばれます。

上記の例では Field Resolver は同期関数として文字列を返却していますが、非同期関数を与えることも可能です。また、今は仮引数の無い関数を与えていますが、Field Resolver 関数は幾つかの引数とともに呼び出されます。こちらについては後述します。

- `resolve: () => Promise.resolve("world")`
- `resolve: async () => "world"`

それでは、 `query { hello }` を与えて、 `{ "data": { "hello": "world" } }` の JSON が返却されることを確認してみす。テストコードを以下のように記載します。

```ts
/* schema.spec.ts */

import { execute, parse, DocumentNode } from "graphql"

import { createSchema } from "./schema"

describe("schema", () => {
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
```

graphql-js では、作成した Schema に対して、Query や Mutation を実行する手段は幾つか提供されているのですが、ここでは `execute` 関数を利用した例で説明します。

`execute` 関数は Schema オブジェクトの他に `document` という引数を必要とします。以下が `document` を作成している箇所の抜粋です。

```ts
document = parse(`query { hello }`)
```

クエリ文字列を `parse` 関数に食わせると、Operation AST Node が得られて、、、という説明はさておいて、このコード、実のところ Apollo 系でよく目にするような以下と何ら違いはありません。ここでは深いことは考えずに「 `execute` が理解可能な形にクエリ文字列を変換してくれる」程度に捉えてもらえれば十分です。

```ts
import { gql } from "graphql-tag"
// import { gql } from "@apollo/client"
// import { gql } from "apollo-server"

const document = gql`
  query {
    hello
  }
`
```

### Code First v.s. Schema First

ここまでの説明で見てきたように、 graphql-js の世界においては「JavaScript(または TypeScript)で Schema Object を作成すると、SDL を出力できる」という関係でした。

このように、API Interface を生成するためには事前にプログラムコードを書かねばならないアプローチは "Code First" と呼ばれます。

逆に、Interface (e.g. GraphQL SDL など)を事前に定めておき、この Interface に実装を与える形でサーバーサイドを実装していくアプローチは"Schema First" と呼ばれます。

- Code First なツール・フレームワーク: graphql-js, [graphql-nexus](https://nexusjs.org/), [graphql-ruby](https://graphql-ruby.org/), etc,,,,
- Schema First なツール・フレームワーク: [@graphql-tools/schema](https://www.the-guild.dev/graphql/tools/docs/generate-schema), [Apollo Server](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#options), [DGS](https://netflix.github.io/dgs/generating-code-from-schema/), [gqlgen](https://gqlgen.com/), etc,,,

一概にどちらが良いというものでもありません。サーバーサイドの実装に選択しているプログラミング言語との相性や、最終的な Schema の総量によってもどちらを選択すべきかが変わってきます。

JavaScript の場合、 graphql-js 本体から提供される `printSchema` と `buildSchema` 関数を利用することで、SDL と Schema オブジェクトを行き来できることは頭の片隅にとどめておくと良いでしょう。

### `execute` と HTTP Server

余談になりますが、 `execute` で Schema が実行できるということさえ抑えておけば、HTTP で Query や Mutation を受け付ける Web サービスとして公開するのは容易です。

以下は Express を `execute` とつなぎこむサンプルです(実際は parse や validation が必要となるので、飽くまで正常系の動作イメージを伝えるための例です)。

```ts
import express from "express"
import { execute } from "graphql"

import { createSchema } from "./schema"

const app = express()
const schema = createSchema()

app.use(express.json())

app.post("/graphql", (req, res) => {
  const document = parse(req.body.query)
  const variableValues = req.body.variables
  const exec = async () => execute({ schema, document, variableValues })
  exec().then(executionResult => res.status(200).json(executionResult).end())
})

app.listen(3000)
```

## Field が複数個になったら？

GraphQL の魅力の一つとして頻繁に挙げられるのが「一回の API Request で複数の値を同時に取得できる」という点です。さきほどの例では、Query できるフィールドが一つしかありませんでしたが、複数のフィールドを取得できるように Schema を改修してみましょう。

```graphql
type Query {
  hello: String!
  goodbye: String! # 追加
}
```

`goodbye` というフィールドを追加していきます。

それぞれの Field Resolver の動作を確認を容易にする目的で `helloResolver` や `goodbyeResolver` という名前で Field Resolver 関数を `createSchema` 関数のオプションで受け取れるようにしていますが、本質的には `goodbye: { ... }` の部分が追加されただけです。

```ts
/* schema.ts */

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

        // 新しく追加したフィールド
        goodbye: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: goodbyeResolver,
        },
      },
    }),
  })
```

今までの例と同じく、テストコードを用いて以下を確認していきます。

- SDL が意図とどおりかどうか
- 想定した Query を受け付けてくれるか

「想定した Query」は以下のクエリを差します。

```graphql
query {
  hello
  goodbye
}
```

```ts
/* schema.spec.ts */

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

    it("should resolve both fields", async () => {
      document = parse(`query { hello, goodbye }`)
      await expect(subject()).resolves.toMatchObject({
        data: { hello: "WORLD", goodbye: "BYE BYE" },
      })
    })
  })
})
```

今回のテストコードでは `mockedHelloResolver` と `mockedGoodbyeResolver` という名前で、それぞれの Field Resolver をモックに差し替えています(本実装との違いが判りやすくなるよう、モックが返却する値は大文字にしてあります)。

`query { hello, goodbye }` を入力したケースにおいて、これらのモック Field Resolver がどのように呼び出されているかを見ていきましょう。

```ts
it("should resolve both fields", async () => {
  document = parse(`query { hello, goodbye }`)
  await expect(subject()).resolves.toMatchObject({
    data: { hello: "WORLD", goodbye: "BYE BYE" },
  })

  // 両方の Field Resolver が呼ばれているはず
  expect(mockedHelloResolver).toBeCalledTimes(1)
  expect(mockedGoodbyeResolver).toBeCalledTimes(1)
})
```

では、`hello` フィールドのみを取得するクエリを記述したらどのようになるでしょう？

```ts
it("should resolve hello field", async () => {
  document = parse(`query { hello }`)
  await expect(subject()).resolves.toMatchObject({
    data: { hello: "WORLD" },
  })
  // 両方の Field Resolver の呼び出し状況は？
})
```

この場合は、`mockedHelloResolver` は呼び出されますが、`mockedGoodbyeResolver` は呼び出されません。

```ts
it("should resolve hello field", async () => {
  document = parse(`query { hello }`)
  await expect(subject()).resolves.toMatchObject({
    data: { hello: "WORLD" },
  })

  expect(mockedHelloResolver).toBeCalledTimes(1)
  expect(mockedGoodbyeResolver).not.toBeCalled()
})
```

「`goodbye` をクエリしていないのだから、それはそうでしょ」と思うかしれませんが、「クエリに含まれるフィールドに対応する Field Resolver だけが動作する」という GraphQL の特性は重要です。
裏を返せば「複数の Field Resolvers は、クライアントサイドの都合で呼び出されることもあれば、そうでないこともある」を意味しています。すなわち、**同じ階層においた Field Resolver は互いに独立して動作するように実装しなくてはなりません**。

## Nested Object Type

ここからは、Object Type が入れ子になっている Schema の Resolver を見ていきます。この辺りからややこしさ度合いが増していくやもしれません。

### お題とする Schema

この小節を通して、以下の Schema の実装を考えていくこととします。

```graphql
type Query {
  product(id: ID!): Product
}

type Product {
  id: ID!
  name: String!
}
```

EC サイトなどでよくあるような商品詳細 API を極限まで簡略化したものと考えてください。GraphQL の構造で見ると、`Query` という Root Type に対して、 `Product` という Object Type が入れ子になっている構造です。

### ナイーブな実装

まずは、今までの `createSchema` 関数をベースにして、上記の SDL を満たすような実装を与えてみます。

```ts
/* schema.ts */

import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLList, GraphQLString, GraphQLID } from "graphql"

export type Context = {
  readonly productModel: ProductModel
}

export const createSchema = () =>
  new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: {
        // (A) product フィールドに対応している箇所
        product: {
          // (B) フィールドの引数
          args: {
            id: {
              type: new GraphQLNonNull(GraphQLID),
            },
          },
          // (C) Product type の中身
          type: new GraphQLObjectType({
            name: "Product",
            fields: {
              id: {
                type: new GraphQLNonNull(GraphQLID),
              },
              name: {
                type: new GraphQLNonNull(GraphQLString),
              },
            },
          }),
          // (D) Field Resolver
          resolve: (_, args: { readonly id: string }, context: Context) => context.productModel.findBy(args.id),
        },
      },
    }),
  })

type ProductFindByResult = {
  readonly id: string
  readonly name: string
}

// (E) 実際のデータを取得するための何か. e.g. RDB と接続する OR マッパ
export class ProductModel {
  async findBy(id: string): Promise<ProductFindByResult | null> {
    throw new Error("To be implemented lator")
  }
}
```

主な変更点は以下のようになっています:

- A. `product` フィールドに対応している箇所
- B. フィールドの引数
- C. Product type の中身
- D. Field Resolver
- E. 実際のデータを取得するための何か. e.g. RDB と接続する OR マッパ

### Field Resolver の引数

今回用意している `product` フィールドは、商品 ID 相当が必要です。これを GraphQL Schema 上で明記するために、フィールドを定義する際に `args` を指定しています。

```ts
new GraphQLObjectType({
  fields: {
    product: {
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      // 以下略
    },
  },
})
```

また、商品 ID を指定してもらうようにしたことに対応して、実際にその値を利用する箇所も登場します。これは (D) の Field Resolver 関数における第二引数に渡ってきます。

```ts
new GraphQLObjectType({
  fields: {
    product: {
      // 中略
      resolve: (_, args: { readonly id: string }, context: Context) => context.productModel.findBy(args.id),
    },
  },
})
```

今回は商品詳細クエリにおける `id` は必須の GraphQL ID 型としているので、対応する TypeScript の型としても `{ readonly id: string }` として、「絶対に値が取れる」型を設定しています。裏を返すと、Schema に設定した GraphQL としての引数型と、Field Resolver で指定した TypeScript の型の整合性は、開発者が注意深く選んでいるだけの状態、という見方もできます。

### Resolver と Context

上記の Field Resolver では、`context` という名前の第三引数も利用されています。

一つ前の小節において、 `helloResolver` を `createSchema` する歳にモック実装に差し替えられるようにしていました。今回の `context` はこれの進化版のような存在です。

```ts
export const createSchema = (
  {
    // ここをテスト実行時に差し替えていた
    helloResolver,
  }: {
    readonly helloResolver: () => string
  } = {
    helloResolver: () => "world",
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
      },
    }),
  })
```

Field Resolver の第三引数である `context`、日本語では「文脈」となりますが、これは一度の `execute` において同じオブジェクトを使いまわしたいときに利用されます。

以下のように `execute` 時に `context` オプションにオブジェクトを与えておくと、その値が Resolver から参照できるという構造です。

```ts
const schema = createSchema()

execute({
  schema,
  document,
  context: {
    // 中身は任意のオブジェクト
  },
})
```

とくに Web サービスとして GraphQL Schema を公開する際には、1 HTTP Request に紐付くスコープがしばしば必要となります。たとえば認証済みユーザー情報を示す `currentUser` などが代表例でしょう。他にも、同一の非同期処理結果をキャッシュしたり、複数の非同期処理をバッチ処理にまとめたりするような、通称「ローダー」と呼ばれる処理も Context 経由で Resolver に受け渡すのが一般的です。

閑話休題。今回の `product` フィールドの実装にあたっては、以下のような Context を与えるようにしました。

一旦、抽象的な表現に留めていますが、例えば Prisma OR マッパーにおける `prisma.product.findUnique` のような関数に読み替えてもらっても差し支えありません。

```ts
export type Context = {
  readonly productModel: ProductModel
}

type ProductFindByResult = {
  readonly id: string
  readonly name: string
}

// (E) 実際のデータを取得するための何か. e.g. RDB と接続する OR マッパ
export class ProductModel {
  async findBy(id: string): Promise<ProductFindByResult | null> {
    throw new Error("To be implemented lator")
  }
}
```

### テストコード

Context の説明も一通り済んだところで、作成した Schema をテストしていきます。今回のテストコードの全量は以下となります。

```ts
/* schema.spec.ts */

import { execute, parse, DocumentNode } from "graphql"

import { createSchema, ProductModel } from "./schema"

describe("schema", () => {
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
```

Hello World のテストコードと大きな変化は無いのですが、上述のとおり、`execute` 時に Context オブジェクトを設定するようにしています。また、Context の中身である `ProductModel` の `findBy` メソッドをモックするようにしています。

```ts
const productModel = new ProductModel()
const findBy = jest.spyOn(productModel, "findBy")

const subject = async () =>
  await execute({
    schema: createSchema(),
    contextValue: { productModel },
    document,
    variableValues,
  })
```

### リファクタリング

ここまでの `createSchema` 関数の実装で、以下のようなクエリを解決する Resolver を動作させることができました。

```graphql
query ProductQuery($id: ID!) {
  product(id: $id) {
    name
  }
}
```

現状の `createSchema` の実装では以下のように、 `Query` Type の定義配下に `Product` Type の定義が入れ子になっており、コード分割や保守性の観点でも難がある状態です。

```ts
new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      product: {
        type: new GraphQLObjectType({
          name: "Product",
          fields: {
            id: {
              type: new GraphQLNonNull(GraphQLID),
            },
            name: {
              type: new GraphQLNonNull(GraphQLString),
            },
          },
        }),
      },
    },
  }),
})
```

まずは見通しを良くする意味もこめて、入れ子になっている `GraphQLObjectType` の定義をフラットにしてみましょう。

```ts
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
```

対応する SDL にしても、以下のように Object Type がフラットに並ぶことを考えると、Schema の実装としてどちらが良いかは一目瞭然かと思います。

```graphql
type Query {
  product(id: ID!): Product
}

type Product {
  id: ID!
  name: String!
}
```

### Field Resolver の省略とデフォルト

さて、Object Type の定義をフラットに並べてみると、 `QueryType` と `ProductType` の違いが鮮明になってきます。

ここで注目すべき最大の違いは「**`QueryType` の fields には Field Resolver があるが、`ProductType` の fields は何も Resolver が存在しない**」ことです。

先にネタバラシをしておくと、`ProductType` の fields に何も書いていないのに `Product#name` のような値が解決されていたのは、Default Field Resolver と呼ばれる機構が存在するためです。

https://graphql.org/graphql-js/type/#graphqlobjecttype に(比較的ひっそり)書いてあります。

> Note that resolver functions are provided the `source` object as the first parameter. However, if a resolver function is not provided, then the default resolver is used, which looks for a method on source of the same name as the field. If found, the method is called with `(args, context, info)`. Since it is a method on `source`, that value can always be referenced with this.

実際、 `defaultFieldResolver` 関数をインポートしてきて、`ProductType` の `id` フィールドと `name` フィールドに指定した上でテストコードを実行してみてください。結果は何も変わらないはずです。

```ts
import {
  // 略
  defaultFieldResolver, // インポート
} from "graphql"

const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: defaultFieldResolver,
    },
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: defaultFieldResolver,
    },
  },
})
```

「`resolve` 関数を省略した場合は、Default Field Resolver で補完されているだけ」 を念頭に、再度 テストコードで実行していたクエリを見てみましょう。

```graphql
query ProductQuery($id: ID!) {
  product(id: $id) {
    name
  }
}
```

このクエリには、2 個のフィールドが登場しています。

- 1 階層目の `product`:  
  `(_, args: { readonly id: string }, context: Context) => context.productModel.findBy(args.id)`
- 2 階層目の `name`:  
  `defaultFieldResolver`

なんのことはありません。 それぞれのフィールドにたいする Resolver 関数が動作していただけのことです。

入れ子にするのか、並列に並べるかの違いはあったものの、 `hello` / `goodbye` の例で見た以下と基本は一緒ということです。

> 「クエリに含まれるフィールドに対応する Field Resolver だけが動作する」という GraphQL の特性は重要です。

### Field Resolver の第一引数と第四引数

Default Field Resolver が登場してきたところで、説明を省いていた Field Resolver 関数の第一引数と第四引数を見ておきます。

というのも、以下の `defaultFieldResolver` の実装からも分かる通り、`resolver` を省略したときの挙動は第一・第四引数によって決まるからです。

https://github.com/graphql/graphql-js/blob/v16.6.0/src/execution/execute.ts#L1005-L1021

```ts
/**
 * If a resolve function is not given, then a default resolve behavior is used
 * which takes the property of the source object of the same name as the field
 * and returns it as the result, or if it's a function, returns the result
 * of calling that function while passing along args and context value.
 */
export const defaultFieldResolver: GraphQLFieldResolver<unknown, unknown> = function (
  source: any,
  args,
  contextValue,
  info,
) {
  // ensure source is a value for which property access is acceptable.
  if (isObjectLike(source) || typeof source === "function") {
    const property = source[info.fieldName]
    if (typeof property === "function") {
      return source[info.fieldName](args, contextValue, info)
    }
    return property
  }
}
```

まず、第一引数の `source` です。これは「親階層の Field Resolver が解決した値」が渡ってきます。

`createSchema` で実装してきた `ProductType` の `name` フィールドを例にすると `query { product(id: "001") { name } ` というクエリの場合、`name` から見た「親階層」は `product` フィールドに相当します。

```ts
const ProductType = new GraphQLObjectType({
  name: "Product",
  fields: {
    name: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: defaultFieldResolver,
    },
  },
})
```

`QueryType` の `product` フィールドは `context.productModel.findBy(args.id)` で値を解決しており、我々はテストコードでこのメソッドが以下の値となるようにモックを設定しました。

```ts
beforeEach(() => findBy.mockResolvedValue({ id: "001", name: "product 001" }))
```

このモックのケースであれば、`{ id: "001", name: "product 001" }` というオブジェクトが `name` Field Resolver の `source` 引数になる、ということになります。

また、「親階層」となるので、トップレベルである `QueryType` のフィールドでは `source` を考えることが無意味となります。`product` フィールドの Resolver では `(_, args: { readonly id: string }, context: Context) => /* 略 */` として第一引数を無視していましたが、この状況では「そもそもこの引数を参照する意味がない」のです。

第四引数には `GraphQLResolveInfo` 型で規定されるオブジェクトが渡されます。中身には以下のような情報が詰まっています。

- `info.fieldName`: 今注目している Field Resolver はどのような Field 名なのか
- `info.operation`: この GraphQL 全体はどのようなクエリなのか
- `info.path`: 今注目している Field は、クエリ全体のどのパスなのか
- `info.parentType`: 親となる GraphQL Type はどのような型か
- etc,,,

第一引数である `source` と比較すると、第四引数の `info` を開発者が直接意識するケースは稀と言って良いでしょう。 `source` は `info` と比較するとごく限られた情報しか提供されませんが、クエリ全体の構造に Resolver 関数が依存しないようにフィールドを実装できます。逆に `info` を活用すると強力な性能改善などが実現できる可能性はあるのですが、極端に保守性や可読性を損ねてしまうリスクがあります。

### Default Field Resolver に頼るべきか否か

_T.B.D._
