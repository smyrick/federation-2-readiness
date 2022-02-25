import { composeWithResolvedConfig, queryPlan } from './two.js';

test('query planning', async () => {
  const result = await composeWithResolvedConfig({
    subgraphs: {
      products: {
        url: 'http://locahost:4001',
        schema: `
          type Query {
            products(search: [String!]): [Product]
          }

          type Product @key(fields: "id") {
            id: ID!
            name: String
            price: Price
          }

          type Price {
            amount: Int
            currencyCode: String
          }
        `,
      },
      reviews: {
        url: 'http://localhost:4002',
        schema: `
          extend type Product @key(fields: "id") {
            id: ID! @external
            price: Price @external
            reviews: [Review]
          }

          type Review {
            id: ID!
            rating: Int
            product: Product @provides(fields: "price { amount currencyCode }")
          }

          type Price {
            amount: Int
            currencyCode: String
          }
        `,
      },
    },
  });

  expect(result.schema).toBeDefined();

  const plan = await queryPlan(
    /** @type {import("@apollo/federation-internals").Schema} */ (
      result.schema
    ),
    `#graphql
    query Search($search: [String!]) {
      products(search: $search) {
        name
        reviews {
          rating
        }
      }
    }
  `,
    'Search',
  );

  expect(plan).toMatchInlineSnapshot(`
Object {
  "kind": "QueryPlan",
  "node": Object {
    "kind": "Sequence",
    "nodes": Array [
      Object {
        "kind": "Fetch",
        "operation": "query($search:[String!]){products(search:$search){__typename id name}}",
        "operationKind": "query",
        "requires": undefined,
        "serviceName": "products",
        "variableUsages": Array [
          "search",
        ],
      },
      Object {
        "kind": "Flatten",
        "node": Object {
          "kind": "Fetch",
          "operation": "query($representations:[_Any!]!){_entities(representations:$representations){...on Product{reviews{rating}}}}",
          "operationKind": "query",
          "requires": Array [
            Object {
              "kind": "InlineFragment",
              "selections": Array [
                Object {
                  "kind": "Field",
                  "name": "__typename",
                  "selections": undefined,
                },
                Object {
                  "kind": "Field",
                  "name": "id",
                  "selections": undefined,
                },
              ],
              "typeCondition": "Product",
            },
          ],
          "serviceName": "reviews",
          "variableUsages": Array [],
        },
        "path": Array [
          "products",
          "@",
        ],
      },
    ],
  },
}
`);
});
