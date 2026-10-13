# AccZone Shop — বাস্তবায়ন ও ডিজাইন পরিকল্পনা

## লক্ষ্য ও ব্যবহারকারীর চাহিদা

- `https://api.acczone.xyz/` এবং `https://api.couponshops.org/api/v1`—দুটি supplier API-র digital-service catalog এক storefront-এ যুক্ত করা। CouponShops reference: [API docs](https://api.couponshops.org/docs)।
- পূর্ণাঙ্গ Bengali storefront, cart, manual-payment checkout, customer order tracking, এবং OAuth-gated secure Admin panel। Public homepage/header-এ Admin link থাকবে না; `/admin` direct route protected থাকবে।
- Admin panel-এ provider-ভিত্তিক API-key add/test/replace controls থাকবে; key browser/API response/log/repository-তে যাবে না। Protected plural admin allowlist থাকবে।
- Payment rails manual bKash/Nagad/bank transfer; admin payment verify এবং আলাদা fulfillment confirmation না দিলে supplier wallet spend হবে না।
- Checkout screenshot-এর stock warning-এর প্রকৃত কারণ fix; storefront-এ supplier-এর refreshed stock, service-এর সাথে user-uploaded image, আর user-selected retail/supplier-cost markup ratio দিয়ে auto price update।
- Checkout-এ normalized email-ভিত্তিক customer profile/account record auto-create হবে। Password/email-এ পাঠানো হবে না। Email ownership verify করার পর এবং order-এর সব supplier activation সফল হলে Resend দিয়ে প্রতিটি কেনা service-এর নাম, quantity ও activation credential/code একবার পাঠানো হবে।
- Email API key chat থেকে copy নয়; Admin-এ নতুন rotated Resend key যোগ করতে হবে। Verified sender domain/address না থাকলে email send disabled/failed state স্পষ্ট দেখাবে।
- Project auto-publish সক্রিয়; প্রতিটি canonical `main` checkpoint publication শুরু করবে—একই version-এর duplicate explicit publish নয়।

## System design

1. **Provider catalog**: একই `activation_services`/`shop_order_items` model-এ supplier namespace, service ID, supplier stock/reservations, cost currency, quantity tiers, image URL, stock-synced timestamp, price markup ratio ও price-review flag। Retail price store currency-তে থাকবে। Sync-এ missing upstream item out-of-stock/delisted হবে।
2. **Live supplier refresh**: storefront catalog query stale provider data-কে per-provider in-flight coalescing ও 60-second process cache ব্যবহার করে refresh করবে; APIs read-only, কখনো purchase নয়। Store খোলা থাকলে client 30-second catalog refresh করবে; explicit stock-refresh action প্রয়োজন হলে latest provider stock sync করে cart দেখাবে। API limit মানা হবে। Provider error-এ last-known data থাকবে, কিন্তু stale service checkout-এ যাবে না।
3. **Checkout stock-conflict (diagnosed)**: live MySQL/TiDB zero-row probe-এ Drizzle mysql2 UPDATE result `[ResultSetHeader, fields]` নিশ্চিত; code outer array-এ `.affectedRows` খুঁজছিল, ফলে successful stock reserve-ও false failure হচ্ছিল। Shared result helper array-এর header extract করবে; genuine concurrent stock race ঠেকাতে affected-row guard থাকবে। Stale/low stock conflict-এ customer explicit refresh করে latest stock অনুযায়ী basket adjust করবেন।
4. **Ratio-based supplier repricing**: product-এর admin-approved `retail price ÷ comparable supplier cost` ratio ধরে, converted supplier cost যখন current retail price-এর সমান বা বেশি হয়, retail price `max(supplier cost, supplier cost × ratio)` করে 2 decimal-এ upward update হবে; supplier cost কমলে retail কমবে না। Admin manual retail edit ratio reset করবে। Same currency-তে rate 1; INR/USDT/AccZone provider units → store currency manual FX controls থাকবে। Missing conversion-এ auto-price হবে না; “দাম যাচাই দরকার” flag, customer add-to-cart/checkout hold, Admin manual review/FX input-এ release। Currency/margin অনুমান নয়।
5. **Product images**: admin service row থেকে JPEG/PNG/WebP image select/upload/replace করবেন; browser compress করবে, server Admin/origin/type/size verify করে official storage `presign/put` API-তে durable object রাখবে এবং stable `/manus-storage/...` URL product record-এ save করবে। Public cards, cart/checkout ও Admin preview image দেখাবে; fallback logo থাকবে। Runtime API physical-delete না থাকায় replaced image orphaned হতে পারে।
6. **CouponShops client**: `https://api.couponshops.org/api/v1`-এ `X-API-Key`; `/services`, `/balance`, `/orders`, `/orders/{order_id}`; INR/USDT tier, stock, provider rate ও stable `client_order_id` ব্যবহার। 60/minute provider limit ও `Retry-After` backoff মানা হবে।
7. **AccZone client**: `GET /getServices`, `GET /getBalance`, `GET /getHistory`, paid order-এর জন্য `GET /buyCpn`; API key server-side query parameter-এ, URL/error logging নয়; দুই-second call spacing। Ambiguous activation auto-retry নয়—Admin history review আবশ্যক।
8. **Customer profile/email**: normalized email-এ unique customer profile ও order link checkout transaction-এ তৈরি হবে; password email-এ নয়। One-time verification/login token database-এ hash-only, short expiry ও single-use; email link token fragment থেকে POST-এ verify করে signed seven-day customer session দেবে। `/account` page-এ customer শুধু নিজের order history ও completed credential দেখবেন; verified account থেকে rate-limited delivery-email resend অনুরোধ করতে পারবেন। Resend API key AES-256-GCM project credential store-এ provider-specific থাকবে। Verified customer এবং সব order lines fulfilled হলে এক idempotent order email-এ সব product name, quantity, instruction ও verified supplier code যাবে; partial/unknown/unverified অবস্থায় credential email নয়। Durable email outbox/status এবং resend actions duplicate sending রোধ করবে।
9. **Orders & payment**: server পুনরায় price/stock/tier যাচাই, atomic reservation, idempotent checkout, customer/payment-account snapshots। Payment-confirmation-এর পর আলাদা admin action fulfillment চালায়। CouponShops in-flight order idempotent refresh/reconcile; ambiguous AccZone result history-confirmation ছাড়া retry নয়। Public order lookup-এ customer email verified না হলে codes দেখা যাবে না।
10. **Authorization & privacy**: Manus OAuth + protected plural admin allowlist; OAuth role provisioning ও admin procedures একই normalization/allowlist ব্যবহার করবে। Cross-site mutation reject; customer PII/provider keys private। Session seven days; Preview HTTPS cookie `HttpOnly; SameSite=None; Secure`। Email code status/log-এ secret নয়।
11. **Project structure**:
    - `client/src/pages/`: storefront, checkout, tracker, secure admin, customer account/verification.
    - `client/src/contexts`, `lib`, `index.css`: cart, types/formatting, image/stock/price UI.
    - `server/catalogSync.ts`, `pricing.ts`: provider sync, freshness, auto price; `productImages.ts`/`productImageRoute.ts`: protected durable image upload.
    - `server/resend.ts`, `customerRouter.ts`: email provider/outbox/profile verification; `server/shopRouter.ts`: catalog/checkout/admin.
    - `server/dbResults.ts`: mysql2 Drizzle result normalization; `drizzle/schema.ts`, additive `drizzle/*.sql`: stock/image/FX/email/account fields.
    - `client/public/manus-routes.json`: source-synchronized `/account/verify` route-সহ route manifest.

## Design

- **Design Movement**: contemporary digital-commerce editorial—প্রযুক্তিনির্ভর, দ্রুত, নির্ভরযোগ্য storefront; admin-এ শান্ত, কাজ-কেন্দ্রিক hierarchy।
- **Core Principles**: (1) দাম/স্টক/payment state এক নজরে; (2) purchase-এর আগে পরিষ্কার তথ্য; (3) spend/activation-এর আগে স্পষ্ট admin action; (4) বাংলা পাঠযোগ্যতা ও mobile-first layout।
- **Color Philosophy**: deep ink digital-service reliability বোঝায়; electric mint/acid-lime action ও stock-এর brand signal; warm-white surface পড়তে সহজ; amber pending payment, red কেবল failure/review।
- **Layout Paradigm**: editorial hero, horizontally scrollable category controls, product cards ও dedicated checkout; admin compact navigation rail, KPI cards ও operational tables।
- **Signature Elements**: bespoke geometric “A” brandmark; slim mint availability strip; order lifecycle stepper।
- **Interaction Philosophy**: দ্রুত feedback; unavailable/unsynced item checkout-এ আটকে যায়; payment ও supplier fulfillment আলাদা transitions।
- **Animation**: 150–220ms hover/focus/transitions, loading skeleton, reduced-motion সম্মান; distracting loops নয়।
- **Typography System**: Bengali UI-তে Hind Siliguri/Noto Sans Bengali fallback; Latin IDs/numbers-এ Inter/system sans; compact semibold headings ও tabular price figures।
- **Brand Essence**: “বাংলায় digital activation কেনাকাটা—সার্ভিস থেকে verified delivery পর্যন্ত পরিষ্কার status”; নির্ভরযোগ্য, দ্রুত, সহায়ক।
- **Brand Voice**: পরিষ্কার, ভদ্র, ছোট বাক্য। উদাহরণ: “পেমেন্ট যাচাইয়ের পরেই অ্যাক্টিভেশন হবে।” / “অর্ডারের আপডেট নিরাপদে দেখুন।”
- **Wordmark & Logo**: custom geometric A-shaped SVG mark plus “AccZone Shop” wordmark; icon project metadata-তে literal durable HTTPS URL।
- **Signature Brand Color**: vivid mint `#42E5B2`।

## Assumptions / boundaries

- দুই supplier-এর live API key admin panel-এ user যোগ করবেন; আগে supplier purchase/test করা হবে না।
- CouponShops order credentials শুধু API key, verified sender address/domain ও successful provider status পাওয়ার পর পাঠানো যাবে। Chat-এ দেওয়া Resend key exposed ধরে ব্যবহার নয়; user নতুন key rotate করে Admin-এর protected field-এ দেবেন।
- FX rates manually Admin-এ set হবে; default 0/blank মানে auto-reprice বন্ধ/price-review flag। BDT/INR/USD/USDT/AccZone provider-unit equivalence নিজে থেকে অনুমান করা হবে না।
- Shared managed database development ও production—দুই জায়গাতেই ব্যবহৃত হয়; schema change additive হবে, test হিসেবে fake customer/order/provider purchase লেখা হবে না।
- Admin payment info, provider keys, email From address, retail price, conversion rates ও listing visibility নিজে configure করেন।
