# AccZone Shop Redesign: Voucher Wall (ভাউচার ওয়াল)

Implementation according to `/Users/brownspy1/Downloads/design.md`.

## 1. What Changed

### Concept & Design Tokens
- **Voucher Wall Aesthetic**: Every product card is a ticket/voucher with circular side notches (`--notch: 14px`), dashed perforation line, and Jade Mist price stub footer (`--jade-mist: #E4F4EA`).
- **Torn Ticket Edge**: Hero section transitions into the catalog via an authentic zigzag perforated ticket edge.
- **Color Tokens**: Padma Green (`#0B7A4B`), Bottle Green (`#0F3D2E`), Jade Mist (`#E4F4EA`), Paper (`#F5F8F6`), Marigold (`#FFC93C`), Line (`#D5E3DA`), bKash Pink (`#E2136E`), Nagad Orange (`#F6921E`), and Coral (`#E5484D`).
- **Typography**: Bengali fonts loaded via Google Fonts: `Anek Bangla` (display headlines & prices) and `Hind Siliguri` (body & UI) with `<html lang="bn">`. Letter-spacing is relaxed, never negative. Money formatted as `৳৫০` without `.00`, with monthly cost `মাসে ≈ ৳৪`.

### Components
1. **Live Order Ticket (`client/src/components/LiveOrderTicket.tsx`)**:
   - Memorable hero moment: simulated receipt sliding out of a printer slot with 3 animated checkmarks (১. অর্ডার পেয়েছি, ২. পেমেন্ট যাচাই সম্পন্ন, ৩. কোড পাঠানো হয়েছে). Rotated ticket stack behind on desktop, responsive compact version on mobile.
2. **Voucher Card (`client/src/components/VoucherCard.tsx`)**:
   - 56px flat squircle brand icon (`Gemini`, `Adobe Express`, `Duolingo`, `Pocket FM`).
   - Honest warranty chips (`৫ দিন ওয়ারেন্টি` vs `ওয়ারেন্টি নেই`).
   - Stock progress bar rendered **only** when stock is under 50 (Marigold < 50, Coral < 20).
   - In-card variant selector for merged products (e.g. Adobe Express: নিজের অ্যাকাউন্টে vs রেডিমেড আইডি).
   - Price stub with `৳৫০`, `মাসে ≈ ৳৪`, primary `এখনই কিনুন` button (opens single-sheet checkout directly), and secondary `🛒` cart button. Card click opens Product Drawer.
3. **Product Drawer (`client/src/components/ProductDrawer.tsx`)**:
   - Slide-out right drawer on desktop / bottom sheet on mobile.
   - Clean parsed bullets ("কী কী পাবেন" with check icons, no raw supplier text or emoji dumps).
   - "কীভাবে চালু হবে" step-by-step activation guide.
   - "ওয়ারেন্টি ও শর্ত" section.
   - Product-specific Q&A.
   - Sticky footer with price and instant buy/cart buttons.
4. **Single-Sheet 3-Step Checkout (`client/src/components/CheckoutSheet.tsx` & `client/src/pages/Checkout.tsx`)**:
   - Step 1: তথ্য (Email, optional WhatsApp/phone, name).
   - Step 2: পেমেন্ট (bKash & Nagad tabs with brand colors, 1-tap account number and exact amount copy buttons, auto-uppercase TrxID input).
   - Step 3: নিশ্চিত (Order summary, one-click confirmation, redirect to status page).
5. **Scratch-To-Reveal Status Card (`client/src/components/ScratchCard.tsx` & `client/src/pages/TrackOrder.tsx`)**:
   - HTML5 canvas in Marigold (`#FFC93C`) allowing users to scratch off the gold layer with finger/mouse to reveal their delivered activation code.
   - Accessible `কোড দেখান` fallback button for reduced-motion and screen readers.
   - Post-reveal feedback: "সব ঠিক আছে?" with review link or prefilled WhatsApp support redirect.
   - Expiry reminder subscription: "মেয়াদ শেষের আগে মনে করিয়ে দিন".
6. **Navigation & Mobile Sticky Bar (`client/src/components/StoreHeader.tsx`)**:
   - Clean Bangla navigation (`সার্ভিস`, `অর্ডার ট্র্যাক`, `আমার অ্যাকাউন্ট`, `সাপোর্ট`).
   - Mobile sticky floating bar when cart has items (`[🛒 ১ আইটেম ৳৫০]` and `পেমেন্ট করুন` button).

---

## 2. Assumptions Made
1. **Fallback Catalog Data**: When running in local development mode without a live PostgreSQL database connection, a fallback catalog containing the 6 known active products (Gemini 18M Pro, Gemini Pro 18M NEW, Adobe Express 12M Own Account, Adobe Express 12M ReadyMade ID, Duolingo Super 12M, and PocketFM 3M) is served so the UI can be developed, previewed, and tested locally. In production on Render, the live database is automatically queried.
2. **Support Contact**: WhatsApp support button currently links to `https://wa.me/8801700000000` with the prefilled Order ID parameter; the owner can configure this in the admin panel settings or environment variables.
3. **Payment Verification**: Manual payment verification flow is preserved as required by existing backend tRPC contracts.
