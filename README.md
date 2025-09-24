Zehngoh User API

NestJS API for the user-facing storefront, aligned with the zehngoh-ui flows.

- Stack: NestJS, Prisma, PostgreSQL, JWT
- Location: apps/user-api
- DB schema: sourced from `../shared-db/prisma/schema.prisma` to keep services on the same schema.

Run
- Configure .env from .env.example
- pnpm --filter user-api run prisma:generate
- pnpm --filter user-api start:dev

API Overview
- POST /api/auth/send-code → send OTP (dev code 12345)
- POST /api/auth/verify → verify and login (JWT)
- GET /api/auth/me → current profile
- GET /api/products → list with pagination/filter
- GET /api/products/:id → product detail
- GET /api/wishlist / POST /api/wishlist/:productId / DELETE /api/wishlist/:productId
- GET /api/cart / POST /api/cart/items / PATCH /api/cart/items/:itemId / DELETE /api/cart/items/:itemId / DELETE /api/cart
- POST /api/orders → create order; GET /api/orders; GET /api/orders/:id
- GET /api/lookups/categories|brands|regions|cities

Notes
- OTP via Telegram is mocked; see ASSUMPTIONS.md
- Delivery fee and promotions simplified for MVP
