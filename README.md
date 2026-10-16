# Mini Inventory & Order Management

Small admin app for keeping products in sync with customer orders. React on the front, Express + MongoDB on the back. You can manage categories and products, place multi-line orders, and move orders through Pending → Confirmed/Cancelled while stock stays consistent.

## What's in the repo

| Path | Purpose |
|------|---------|
| `backend/` | REST API, Mongoose models, Jest tests |
| `frontend/` | Vite + React admin UI |
| `docs/screenshots/` | UI captures for the README |

---

## Setup

You need **Node 18+** and **MongoDB**. Order confirm/cancel uses transactions, so MongoDB must run as a **replica set** (even a single-node `rs.initiate()` setup is fine). See [backend/README.md](./backend/README.md) for a local `mongod --replSet` example.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` — set `MONGODB_URI`, `CLIENT_URL`, and **`JWT_SECRET`** (long random string). Optional `JWT_EXPIRES_IN` (default `7d`).

```bash
npm run dev
```

API base: `http://localhost:5000` (health: `GET /api/health`).

Interactive API documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs). Register or log in in Swagger, copy `data.token`, and use **Authorize** to test protected endpoints. The OpenAPI document is available at `GET /api-docs.json`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. **Sign up** or **sign in** first — the admin routes are protected. In dev, Vite can proxy `/api` to the backend; or set `VITE_API_URL` to `http://localhost:5000/api` as in the example file.

### Tests (backend only)

```bash
cd backend && npm test
```

Uses `mongodb-memory-server` with a replica set — does not touch your dev database.

---

## Environment variables

**`backend/.env.example`**

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db?replicaSet=rs0
CLIENT_URL=http://localhost:5173
NODE_ENV=development
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
```

**`frontend/.env.example`**

```env
VITE_API_URL=http://localhost:5000/api
```

| Variable | Where | Notes |
|----------|--------|--------|
| `MONGODB_URI` | backend | Must support transactions (replica set) |
| `CLIENT_URL` | backend | CORS origin for the React app |
| `JWT_SECRET` | backend | Required for sign-in tokens |
| `JWT_EXPIRES_IN` | backend | Optional token lifetime (e.g. `7d`) |
| `VITE_API_URL` | frontend | Full API prefix; omit in dev if using Vite proxy |

---

## Backend layout

```text
backend/
├── server.js              # Starts HTTP server, connects DB
├── app.js                 # Express app, routes, CORS, error handler
├── config/db.js           # Mongoose connection
├── routes/                # Route mounts → controllers
├── controllers/           # Request handlers (products, orders, …)
├── models/                # Category, Product, Customer, Order
├── middleware/            # AppError, global errorHandler
├── utils/                 # Validators, order helpers, SKU generator
└── tests/                 # Jest + Supertest (stock, orders, products, …)
```

**Libraries:** Express, Mongoose, cors, dotenv. **Tests:** Jest, Supertest, mongodb-memory-server.

---

## Frontend layout

```text
frontend/
├── src/
│   ├── api/               # fetch wrapper + endpoint helpers
│   ├── pages/             # Dashboard, Products, Categories, Orders, …
│   ├── components/        # Layout, tables, forms, shadcn-style UI
│   ├── lib/               # validation, query keys, toasts
│   └── hooks/             # e.g. debounced search
├── vite.config.js
└── tailwind.config.js
```

**Libraries:**

- **React 18**, **React Router** — UI and routing  
- **Vite** — dev server and build  
- **TanStack Query** — server state / caching  
- **TanStack Table** — data tables  
- **Tailwind CSS** — styling  
- **Radix UI** + **shadcn-style** components (`components/ui/`) — dialogs, selects, sidebar  
- **lucide-react** — icons  
- **sonner** — toast notifications  

---

## API overview

All JSON responses use `{ success, message, data?, pagination? }`. Errors return `{ success: false, message }` with an HTTP status.

**Authentication** — Register and login are public. Everything else under `/api` (except health) requires `Authorization: Bearer <token>`.

| Auth | Method | Path | Body |
|------|--------|------|------|
| Sign up | `POST` | `/api/auth/register` | `{ name, email, password }` |
| Sign in | `POST` | `/api/auth/login` | `{ email, password }` |
| Current user | `GET` | `/api/auth/me` | Bearer token |
| Sign out | `POST` | `/api/auth/logout` | Bearer token |

Each account only sees its own categories, products, customers, and orders (`owner` on every document). IDs belonging to another user return 404.

| Resource | Base path | Main actions |
|----------|-----------|--------------|
| Health | `GET /api/health` | Uptime check |
| Products | `/api/products` | CRUD, search, filter by category/status, pagination |
| Categories | `/api/categories` | CRUD (delete blocked if products use category) |
| Customers | `/api/customers` | Create, list, get, update |
| Orders | `/api/orders` | Create, list, get, `PATCH /:id/status`, edit while Pending |
| Dashboard | `GET /api/dashboard` | Counts, total stock, sales, recent orders |

**Create product** (SKU is generated on the server — do not send `sku`):

```json
POST /api/products
{
  "name": "Wireless Mouse",
  "price": 29.99,
  "stock": 50,
  "categoryId": "<category ObjectId>",
  "status": "Active"
}
```

**Create order:**

```json
POST /api/orders
{
  "customer": "<customer ObjectId>",
  "items": [
    { "product": "<product ObjectId>", "quantity": 2 }
  ]
}
```

Duplicate product lines in the body are merged and quantities summed before stock checks. Line prices and totals are always computed on the server.

**Order status** — `PATCH /api/orders/:id/status`

```json
{ "status": "Confirmed" }
```

or `{ "status": "Cancelled" }`.

More detail (query params, status rules): [backend/README.md](./backend/README.md).

---

## Database / models

**User** — `name`, `email`, hashed `password`, `role` (`user`).

**Category** — `owner` (User), `name`, optional `description` (unique per owner).

**Product** — `owner`, `name`, unique `sku` per owner, `price`, `stock`, `category` (ref), `status` (`Active` / `Inactive`). SKU is auto-generated from the name with numeric suffixes when names collide.

**Customer** — `owner`, `name`, `email`, optional `phone`.

**Order** — `owner`, `customer` (ref), `items[]`, `totalAmount`, `status` (`Pending` | `Confirmed` | `Cancelled`).

Each order line stores a snapshot: `productName`, `sku`, `quantity`, `unitPrice`, `lineTotal`, plus `product` ref. Historical orders stay correct if catalog prices or names change later.

Relationships:

- Order → Customer (many-to-one)  
- Order line → Product (reference + snapshot fields)  
- Product → Category (many-to-one)  

---

## Screenshots

Admin UI (replace or add more under `docs/screenshots/` for your submission):

![Dashboard](./docs/screenshots/dashboard.png)

Suggested extra captures: Products list, New order form, Order detail view — save as `products.png`, `orders.png`, `order-detail.png` in the same folder.

---

## Tricky logic (how we handled it)

**Same product twice in one order**  
The API merges duplicate `product` ids in the request and validates stock on the combined quantity. The UI keeps one row per product and merges if you pick the same item again.

**Two people, last unit**  
Pending orders reserve stock: available = on-hand minus quantities already on other **Pending** orders. A second pending order for the last unit gets 409. On **Confirm**, stock is deducted with `updateOne` only when `stock >= quantity` inside a transaction, so two simultaneous confirms cannot both succeed on one unit.

**Product deleted after it appeared on an order**  
Delete is refused with 409 if any order references that product. Use `Inactive` status instead; inactive products cannot be added to new pending orders.

**SKU collisions**  
SKUs are derived from the product name (`Nike T-Shirt` → `NIK-TSH`, then `NIK-TSH-002`, …). Create retries on Mongo duplicate-key errors for races.

**Cancel after confirm**  
Cancelling a confirmed order restores stock (transaction). Cancelling pending does not touch stock. Cancelled orders cannot change status again.

**Prices**  
Confirmed orders keep snapshotted `unitPrice`; editing the product catalog does not rewrite old orders.

---

## License

ISC (see package.json files).
