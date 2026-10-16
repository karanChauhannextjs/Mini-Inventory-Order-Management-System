# Mini Inventory & Order Management — Backend

REST API for managing products, customers, orders, and a simple dashboard summary. Built with Node.js, Express, and MongoDB (Mongoose).

## Tech stack

- Node.js, Express.js
- MongoDB with Mongoose
- dotenv, cors
- Jest + Supertest for API tests
- mongodb-memory-server (replica set) for isolated tests with transactions

## Folder structure

```text
backend/
├── config/db.js
├── controllers/
├── models/
├── routes/
├── middleware/
├── utils/
├── tests/
├── app.js
├── server.js
└── package.json
```

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your MongoDB URI and optional `CLIENT_URL` for CORS.

## Environment variables

| Variable      | Description                          |
|---------------|--------------------------------------|
| `PORT`        | Server port (default `5000`)         |
| `MONGODB_URI` | MongoDB connection string            |
| `CLIENT_URL`  | Allowed CORS origin                  |
| `NODE_ENV`    | `development`, `test`, or `production` |

## MongoDB replica set (transactions)

Order confirmation and cancellation of confirmed orders use **multi-document transactions** (stock updates + status change).

MongoDB transactions require a replica set. For local development:

```bash
# Example: single-node replica set on default port
mongod --replSet rs0 --port 27017 --dbpath /path/to/data

# In mongosh once:
rs.initiate()
```

Use a URI such as:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db?replicaSet=rs0
```

Tests use `mongodb-memory-server` with a one-node replica set automatically.

## Run the server

```bash
npm run dev   # nodemon
# or
npm start
```

Health check: `GET /api/health`

## Run tests

```bash
npm test
```

Tests use an in-memory replica set; they do not touch your development database.

## API endpoints

### Products — `/api/products`

| Method | Path   | Description        |
|--------|--------|--------------------|
| POST   | `/`    | Create product     |
| GET    | `/`    | List (search, filters, pagination, sort) |
| GET    | `/:id` | Get one            |
| PUT    | `/:id` | Update (whitelisted fields) |
| DELETE | `/:id` | Delete if not in any order |

**Create example:**

```json
{
  "name": "Wireless Mouse",
  "sku": "WM-001",
  "price": 29.99,
  "stock": 50,
  "category": "Electronics",
  "status": "Active"
}
```

Query params: `search`, `category`, `status`, `page`, `limit`, `sortBy`, `order` (`asc`/`desc`).

### Customers — `/api/customers`

| Method | Path   | Description   |
|--------|--------|---------------|
| POST   | `/`    | Create        |
| GET    | `/`    | List + search |
| GET    | `/:id` | Get one       |
| PUT    | `/:id` | Update        |

### Orders — `/api/orders`

| Method | Path              | Description              |
|--------|-------------------|--------------------------|
| POST   | `/`               | Create (Pending)         |
| GET    | `/`               | List + filters           |
| GET    | `/:id`            | Details                  |
| PATCH  | `/:id/status`     | Confirm or cancel        |
| PUT    | `/:id`            | Edit Pending order only  |

**Create example:**

```json
{
  "customer": "CUSTOMER_OBJECT_ID",
  "items": [
    { "product": "PRODUCT_OBJECT_ID", "quantity": 2 }
  ]
}
```

Prices, line totals, and `totalAmount` are always calculated on the server.

**Confirm / cancel:**

```json
{ "status": "Confirmed" }
```

or

```json
{ "status": "Cancelled" }
```

### Dashboard — `/api/dashboard`

`GET /` returns `totalProducts`, `totalOrders`, `totalStock`, `totalSales` (Confirmed orders only), and `recentOrders` (latest 5).

## Data relationships

- **Customer** → referenced by **Order**
- **Product** → referenced in order line items; **name, SKU, and unit price are snapshotted** on the order so history stays accurate if products change
- **Order** → `items[]` with embedded snapshots + `product` reference

## Order status transitions

| From      | To         | Stock behavior                          |
|-----------|------------|-----------------------------------------|
| Pending   | Confirmed  | Deduct stock (transaction, conditional) |
| Pending   | Cancelled  | No stock change                         |
| Confirmed | *          | Rejected — completed orders cannot change |
| Cancelled | *          | Rejected (409)                          |
| Confirmed | Confirmed  | Rejected (409)                          |

Pending orders do not affect stock until confirmation.

## Stock concurrency

On confirm, each line uses a conditional update:

```javascript
Product.updateOne(
  { _id: productId, stock: { $gte: quantity } },
  { $inc: { stock: -quantity } },
  { session }
);
```

If `modifiedCount !== 1`, the transaction aborts with **409 Insufficient stock**. Concurrent confirms for the last unit cannot both succeed.

## Product prices and safe deletion

- New and edited Pending orders use **current** product prices.
- Confirmed orders keep saved `unitPrice` / `totalAmount` forever.
- Products referenced by **any** order cannot be deleted (409). Set `status: "Inactive"` via PUT instead.
- Inactive products cannot be added to new or edited Pending orders.

## Example error responses

```json
{
  "success": false,
  "message": "A product with this SKU already exists"
}
```

```json
{
  "success": false,
  "message": "Insufficient stock for one or more products"
}
```

```json
{
  "success": false,
  "message": "Confirmed orders cannot be edited because stock has already been deducted"
}
```
