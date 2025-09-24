ASSUMPTIONS

Scope and Alignment
- This API mirrors the zehngoh-ui flows (storefront). Admin/Seller features are excluded here and belong to seller-api.
- Single database is shared across projects. Prisma schema is copied from apps/seller-api to keep models consistent.

Authentication
- Login is by phone + OTP (5 digits). In development, OTP is always 12345. In production, OTP must be delivered via Telegram bot or SMS; the transport is not implemented here.
- On verify, a JWT is issued and stored as a UserSession row for revocation/auditing. JWT payload contains: id, phone, role=user.
- RBAC: Only user role is required for current UI endpoints. Admin/Seller roles are not enforced by this service.

Products and Catalog
- Products are listed with basic filters: search, categoryId, brandId, and sorting by price or createdAt.
- Product detail includes images, basic fields and variants. Stock exposure and advanced attributes are out of scope for UI v1.

Wishlist
- Each user has a single wishlist. Adding the same product is idempotent.

Cart
- A single active cart per user. Items are merged by (productId, variantId). Totals are recomputed on read.
- No stock reservation is performed at add-to-cart time.

Orders
- Order creation computes subtotal from current product prices. Delivery fee is 0 for now to match UI labeling (Tekin).
- Promo codes: basic handling (fixed or percent) if present. No complex constraints or per-user limits enforced here.
- Order status flow: pending → (future) confirmed/cancelled. Cancel endpoint not exposed in UI v1; can be added later.

Addresses and Geography
- UI collects a free-form address (street/city/district) with coordinates. No geocoding; coordinates are stored only in request flow (not persisted as model fields).
- Region and City lookup endpoints expose master data from DB when available.

Error Handling & Feedback
- Validation errors return 400 with class-validator messages.
- Auth failures return 401; forbidden actions return 403; not found returns 404.

Security
- JWT secret comes from env JWT_SECRET. Token expiry 30 days.
- CORS and rate limiting are expected to be configured at gateway/reverse proxy or later in this service.

Performance
- Basic pagination with page/pageSize. No cursor pagination required by current UI.

Future Work
- Telegram Bot transport for OTP, phone→chat mapping.
- Stock validation and delivery pricing.
- Swagger/OpenAPI docs.

