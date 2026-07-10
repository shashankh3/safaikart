# SafaiKart — Complete Detailed Workflow

## Service Categories
The app has 4 main service sections on the Home screen:

| # | Category | Status | Flow Type |
|---|---|---|---|
| 1 | Dry Cleaning | ✅ Ready (126 services) | Full flow with starch add-on |
| 2 | Steam Press | ✅ Ready (85 services) | Full flow, no starch |
| 3 | Shoes Cleaning | ⏳ Awaiting prices | Placeholder, inactive |
| 4 | Sofa/Household Cleaning | ✅ Ready (under Dry Cleaning household) | Full flow with per-unit pricing |

---

## FLOW 1: Dry Cleaning (with Starch Add-On)

### Step 1: Browse
- Customer opens app → lands on `HomeScreen`
- Home screen shows: search bar at top, category chips (Dry Cleaning, Steam Press, Shoes, Sofa), gender filter (All/Men/Women/Household), wear type filter (All/Top Wear/Bottom Wear/Dress/Household)
- Customer taps "Dry Cleaning" category chip
- Service list loads from Firestore `services/` collection where `categoryId == "dry_cleaning"` and `isActive == true`, ordered by `sortOrder`
- Customer scrolls through services (Shirt, T-shirt, Jacket, Sherwani, Saree, Lehenga, etc.)

### Step 2: Select Service
- Customer taps a service card → navigates to `ServiceDetailsScreen`
- `ServiceDetailsScreen` displays:
  - Service name (e.g., "Shirt")
  - Category badge ("Dry Cleaning")
  - Price: "Rs 90" (fixed price) or "Rs 350 - 600" (variable price)
  - Unit label: "per piece" or "per sqft" or "per seat"
  - Service description
  - T&C text (dry cleaning liability terms)
  - Quantity selector: minus button, number display, plus button (min 1)
  - Estimated duration: "Estimated delivery in 2 days"

### Step 3: Starch Add-On (Shirts and Kurtas ONLY)
- If the selected service has an `addons` field (only Shirt and Kurta variants):
  - A toggle chip appears: "Add Starch (+Rs 40/piece)"
  - Customer can toggle starch ON or OFF
  - When ON: price calculation updates in real-time
    - Example: Shirt Rs 90 + Starch Rs 40 = Rs 130/piece
    - 2 shirts with starch = Rs 260
  - When OFF: normal price (Rs 90 × 2 = Rs 180)
- If the service has no `addons` field (T-shirt, Jacket, Saree, etc.): no starch option shown

### Step 4: Add to Cart OR Buy Now
**Option A: Add to Cart**
- Customer taps "Add to Cart" button
- Item is added to cart with: `serviceId`, `quantity`, selected `addons` (if any)
- Cart saves to Firestore `carts/{userId}` and updates local state
- `StickyCart` appears at bottom showing item count + total
- Customer can continue browsing and add more items
- When ready: customer taps `StickyCart` → navigates to Cart screen → proceeds to Checkout

**Option B: Buy Now**
- Customer taps "Buy Now" button (appears alongside Add to Cart)
- Buy Now skips the cart entirely
- App navigates directly to `CheckoutScreen` with a single `directItem` in navigation params
- `directItem` contains: `serviceId`, `quantity`, `addons`
- Cart is NOT modified — if customer goes back, cart remains as it was
- `CheckoutScreen` detects `directItem` param and uses it instead of reading from cart

### Step 5: Select Address
- `CheckoutScreen` shows a "Delivery Address" section
- If customer has saved addresses: list is shown, customer selects one
- If no saved addresses: "Add Address" button → opens `AddressFormScreen`
- `AddressFormScreen` fields:
  - Label: chips [Home] [Work] [Other]
  - Full Name, Phone Number (+91 format)
  - Address Line 1 (House/Flat, Building)
  - Address Line 2 (Street, Area, Landmark)
  - City (default: Raipur), State (default: Chhattisgarh)
  - Pincode (6 digits)
  - "Set as Default" toggle
- On save: address stored in Firestore `addresses/{addressId}`, returns to Checkout
- Selected address displayed as a card with name, phone, full address, label badge

### Step 6: Select Pickup Slot
- `CheckoutScreen` shows a "Pickup Slot" section
- Customer taps "Select Pickup Slot" → opens `PickupSlotScreen`
- `PickupSlotScreen` displays:
  - Horizontal date selector: Today, Tomorrow, +5 more days (7 days total)
  - Each date chip: day name (Sat) + date (12 Jul)
  - For selected date: 4 time slots shown vertically:
    - 08:00 - 10:00 AM
    - 10:00 AM - 12:00 PM
    - 02:00 - 04:00 PM
    - 04:00 - 06:00 PM
  - Each slot shows spots left: "16 spots left" (green), "3 spots left" (orange), "Fully Booked" (greyed out)
- Customer selects one slot → taps "Confirm Slot" → returns to Checkout
- Selected slot displayed: "Sat, 12 Jul · 10:00 AM - 12:00 PM"

### Step 7: Review Order Summary
- `CheckoutScreen` shows order summary section:
  - List of items: name, category badge, quantity, addons (if any), line total
    - Example: "Shirt — Dry Cleaning — 2 pieces — Starch added — Rs 260"
    - Example: "Saree (Silk Heavy) — Dry Cleaning — 1 piece — Rs 550"
    - For variable-price items: "Curtains 11x5 to 15x6 (Light) — Rs 350-600 × 2 = Rs 700-1,200 (est.)"
  - Subtotal: sum of all line totals (or min-max range if variable items exist)
  - Delivery Fee: "Rs 40"
  - Discount: "- Rs 0" (or coupon discount if applied)
  - Tax: "Rs 0"
  - Estimated Total: bold, prominent
    - All fixed: "Rs 300"
    - Has variable items: "Rs 700 - 1,200 (est.)" with note "Final price confirmed after pickup"

### Step 8: Apply Coupon (Optional)
- Coupon input field with "Apply" button
- Customer enters code → calls `validateCoupon` Cloud Function
- If valid: discount applied, shows "Coupon FIRST50 applied — -Rs 50" with "Remove" link
- If invalid: red error text "Invalid or expired coupon"

### Step 9: Accept T&C
- Collapsible T&C section shown
- Customer must check: "I agree to the Terms & Conditions"
- Dry Cleaning T&C:
  - "Please check your garments for any damage before placing the order."
  - "While SafaiKart handles every item with care, SafaiKart is not liable for normal wear and tear that may occur during the process."
  - "Stain removal is not guaranteed. SafaiKart uses the best available cleaning agents to treat stains; however, if a stain persists after cleaning, SafaiKart shall not be liable."
  - "Colour fading or loss may occur during the cleaning process, as different fabrics and dye agents may not respond uniformly to cleaning. SafaiKart shall not be liable for any such colour fading or loss."
- If cart also contains Steam Press items: Steam Press exclusions T&C also shown

### Step 10: Place Order
- "Place Order" button at bottom (disabled until: address selected, slot selected, T&C checked)
- On press:
  - Loading overlay: "Creating your order..."
  - App calls `createOrderDraft` Cloud Function with: `{ addressId, pickupSlotId, couponCode? }`
  - Cloud Function backend logic:
    - Verify user authentication
    - Fetch cart items (or directItem) from Firestore
    - For each item: fetch service from Firestore, verify `isActive == true`
    - Recalculate ALL prices from Firestore — ignore any client-sent prices
    - Verify addon prices from Firestore (starch = 4000 paise)
    - Calculate line totals: `(unitPriceMinor + sum(addonPriceMinor)) × quantity`
    - Fetch address, verify `address.userId == uid`
    - Fetch pickup slot, verify `bookedCount < capacity`
    - Validate coupon if provided
    - Calculate: subtotal, deliveryFee (Rs 40), discount, tax, finalAmountMinor (all in paise)
    - Determine `priceConfirmed`: false if any variable-price items, true if all fixed
    - Calculate `estimatedDeliveryDate`: pickupDate + max(estimatedDurationHours across all items) + 4 hour buffer
    - Calculate `editableUntil`: createdAt + 3 minutes
    - Create order document in `orders/{orderId}`:
      - `status: PAYMENT_PENDING`
      - `paymentStatus: NOT_STARTED`
      - `priceConfirmed`: true/false
      - `editableUntil`: timestamp
      - `estimatedDeliveryDate`: date string
      - `items`: array with snapshots (name, price, addons, lineTotal)
      - `addressSnapshot`, `pickupSlotSnapshot`
      - all pricing fields
    - Reserve pickup slot: increment `bookedCount` in Firestore transaction
    - Clear cart (if cart-based checkout, not direct buy)
    - Return `{ orderId, finalAmountMinor, priceConfirmed }`
- App navigates to `PaymentScreen` with `orderId`

### Step 11: Payment (UPI Only)
- `PaymentScreen` displays:
  - SafaiKart logo
  - Amount: "Rs 300" (large, bold)
  - Order ID: "Order #SK-XXXX"
  - "Pay via UPI" button (prominent, full width, UPI icon)
  - "Secured by Razorpay" text
- On "Pay via UPI" press:
  - App calls `createPaymentOrder` Cloud Function
  - Backend loads Razorpay secret key from Google Secret Manager
  - Backend creates Razorpay order (amount in paise, currency INR, auto-capture)
  - Backend stores razorpayOrderId in `payments/{paymentId}`
  - Returns `razorpayOrderId` + public key to app
- App opens Razorpay checkout with:
  ```json
  method: { "upi": true, "card": false, "netbanking": false, "wallet": false, "emi": false }
  ```
- Customer pays via any UPI app (GPay, PhonePe, BHIM, Paytm)
- Razorpay checkout closes → app navigates to `PaymentPendingScreen`
- App treats checkout callback as UNTRUSTED — only marks `CLIENT_CALLBACK_RECEIVED`

### Step 12: Payment Verification
- `PaymentPendingScreen` shows:
  - Animated spinner: "Verifying your payment..."
  - "This usually takes a few seconds. Please don't close the app."
  - Progress steps:
    - [✓] Payment initiated
    - [✓] UPI payment completed
    - [●] Verifying with bank... (animated)
    - [ ] Order confirmed
- Backend webhook receives Razorpay callback:
  - Verify HMAC-SHA256 webhook signature using secret from Secret Manager
  - Verify: `payment.amount === order.finalAmountMinor`
  - Verify: `payment.currency === "INR"`
  - Verify: `payment.order_id === paymentRecord.razorpayOrderId`
  - Verify: `payment.method === "upi"`
  - Firestore transaction (atomic, idempotent):
    - `payments/{id}.status = VERIFIED`
    - `orders/{id}.status = CONFIRMED`
  - Send FCM push notification to customer
- App listens to `orders/{orderId}` via Firestore `onSnapshot`
- When `status === "CONFIRMED"` → navigate to `PaymentResultScreen` (success)
- If payment fails → navigate to `PaymentResultScreen` (failure, retry option)
- If webhook delayed > 60 seconds: app calls `verifyPaymentStatus` CF as fallback

### Step 13: Payment Result
- `PaymentResultScreen` (Success):
  - Green checkmark (animated scale-in)
  - "Payment Successful!" (bold, green)
  - "Your order is confirmed"
  - Order summary mini-card: Order ID, amount, pickup slot, estimated delivery date
  - "Track Order" button → navigates to `OrderTrackingScreen`
  - "Back to Home" button → navigates to `HomeScreen`

### Step 14: 3-Minute Edit Window
- Immediately after order confirmation, a 3-minute timer starts
- `OrderTrackingScreen` shows (if `now < editableUntil`):
  - Countdown timer: "2:47 remaining to edit your order" (mm:ss format)
  - Timer turns red when < 60 seconds: "0:47 remaining"
  - "Edit Order" button → opens `EditOrderScreen`
  - "Cancel Order" button (red outline)
- `EditOrderScreen`:
  - List of order items with quantity + / - buttons
  - Remove item (swipe or trash icon)
  - "Add More Items" button → navigates to `HomeScreen` (customer picks more services)
  - Total updates in real-time as items change
  - "Save Changes" → calls `editOrderItems` Cloud Function:
    - Verify `now < editableUntil` → throw if expired
    - Verify `order.status === "PAYMENT_PENDING"` or `"CONFIRMED"` → allow editing
    - Apply changes (add/remove/update items)
    - Recalculate ALL prices from Firestore
    - Recalculate `finalAmountMinor`
    - Recalculate `estimatedDeliveryDate` if items changed
    - If `finalAmountMinor` increased: customer pays difference via Razorpay
    - If `finalAmountMinor` decreased: initiate partial refund via Razorpay
    - Update order document
    - Return updated order
- Cancel Order (within 3 minutes):
  - If payment NOT yet verified: cancel immediately, no refund needed
  - If payment VERIFIED: initiate Razorpay full refund, set status to `REFUND_PENDING`
  - Order status → `CANCELLED` after refund processed
- When timer hits 0:00:
  - "Edit Order" and "Cancel Order" buttons disappear
  - Text changes to: "Order locked — no further edits possible"
  - Customer can still view order details but cannot modify

### Step 15: Live Order Tracking (Zomato-Style Timeline)
- `OrderTrackingScreen` shows enhanced tracking UI:
  - Animated progress bar at top (fills as status progresses)
    - CONFIRMED: 0%
    - PICKUP_SCHEDULED: 15%
    - PICKED_UP: 30%
    - CLEANING_IN_PROGRESS: 50%
    - READY_FOR_DELIVERY: 75%
    - OUT_FOR_DELIVERY: 90%
    - DELIVERED: 100%
  - Estimated delivery date prominently displayed: "Expected delivery: Mon, 13 Jul"
  - Status timeline (vertical):
    - [✓] Order Confirmed — 12 Jul, 10:30 AM (green, checkmark, timestamp)
    - [✓] Pickup Scheduled — 12 Jul, 10:35 AM (green, checkmark, timestamp)
    - [✓] Picked Up — 13 Jul, 10:15 AM (green, checkmark, timestamp)
    - [●] Cleaning in Progress — 13 Jul, 11:00 AM (animated pulse, blue, current step)
    - [ ] Ready for Delivery — (grey, hollow, no timestamp)
    - [ ] Out for Delivery — (grey, hollow, no timestamp)
    - [ ] Delivered — (grey, hollow, no timestamp)
  - Each step: icon (from ORDER_STATUS_ICONS), label, timestamp
  - Current step: animated pulsing dot using `Animated.loop` with scale 1 → 1.3 → 1
  - Completed steps: green filled dot + checkmark
  - Future steps: grey hollow dot, no timestamp
  - Real-time updates via Firestore `onSnapshot(orders/{orderId})`
- When admin/Cloud Function updates order status → screen updates instantly
- FCM push notification received on each status change:
  - CONFIRMED: "Your order is confirmed! Pickup scheduled for Sat, 12 Jul, 10-12 AM."
  - PICKED_UP: "Your clothes have been picked up. Cleaning in progress soon."
  - CLEANING_IN_PROGRESS: "Your items are being cleaned. We'll notify you when ready."
  - READY_FOR_DELIVERY: "Your clothes are ready! Out for delivery soon."
  - OUT_FOR_DELIVERY: "Your order is out for delivery. Expected soon."
  - DELIVERED: "Your order has been delivered. Thank you for choosing SafaiKart!"

### Step 16: Delivery
- Order status moves to `DELIVERED`
- Delivery date and time shown on tracking screen
- Customer can view completed order in Orders screen
- "Reorder" button appears on delivered orders → adds same items to cart

---

## FLOW 2: Steam Press (Laundry)
Same as Dry Cleaning flow with these differences:
- **No starch add-on**: Steam Press services do not have addons field, so the starch toggle never appears
- **T&C includes exclusions**: Steam Press T&C explicitly states this service does NOT include: sofa covers, curtains, shoes, carpets/rug, doormats, ties, undergarments, bike/car covers, shawls, party wear, dohar/blanket/comforter/quilts, mattress covers, bathrobe, waterproof baby sheet, pillows/cushions
- **Shorter estimated duration**: Steam Press services have `estimatedDurationHours: 24` (vs 48 for Dry Cleaning)
- **Lower prices**: Steam Press prices are significantly lower (Shirt Rs 18 vs Rs 90 for Dry Cleaning)
- All other steps (address, slot, checkout, payment, tracking, edit window) are identical

---

## FLOW 3: Shoes Cleaning
*Status: Awaiting Price List from Client*
- Category created in Firestore with `isActive: false` (hidden from app UI)
- When client provides prices:
  - Create service documents (e.g., "Sports Shoes", "Formal Shoes", "Sneakers", "Boots")
  - Set `isActive: true` on category
  - App UI automatically picks up the new category — no code changes needed
- Flow will be:
  - Customer selects "Shoes Cleaning" section
  - Orders for a pair of shoe cleaning (quantity = number of pairs)
  - Selects address
  - Goes to checkout
  - Pays via UPI
  - Live tracking with delivery date

---

## FLOW 4: Sofa/Household Cleaning
*Already in catalog under Dry Cleaning → Household*
- Services include: Sofa (per seat), Curtains (various sizes), Carpet/Rug (per sqft), Cushion (per piece), Blinds, Dining Table Chair, Dohar, Blanket/Comforter, Mattress Cover, Doormats
- Flow:
  - Customer selects "Sofa Cleaning" or browses Household section
  - Orders for number of seats/pieces/sqft (per-unit pricing)
  - Selects address and pickup slot (date + time)
  - Goes to checkout
  - Pays via UPI
  - Live tracking with delivery date (estimated 72 hours for household items)
- Per-unit pricing display:
  - "Sofa (Normal Cloth) — Rs 250/seat × 3 seats = Rs 750"
  - "Carpet/Rug — Rs 35/sqft × 10 sqft = Rs 350"
  - "Curtains 11x5 to 15x6 (Light) — Rs 350-600 × 2 = Rs 700-1,200 (est.)"
- Variable-price items: admin sets final price after physical inspection during pickup
- Order has `priceConfirmed: false` until admin confirms
- Customer sees estimated range, pays after admin confirms exact price

---

## ORDER LIFECYCLE SUMMARY
```text
[Customer Browses]
       ↓
[Selects Service] → [Starch Add-On if Shirt/Kurta]
       ↓
[Add to Cart OR Buy Now]
       ↓
[Select Address] → [Select Pickup Slot] → [Review Summary] → [Apply Coupon] → [Accept T&C]
       ↓
[Place Order → createOrderDraft CF]
       ↓
[Order Created: status=PAYMENT_PENDING, editableUntil=+3min, estimatedDeliveryDate=calculated]
       ↓
[Payment Screen → UPI Only → Razorpay Checkout]
       ↓
[Payment Pending → Backend Webhook Verification]
       ↓                    ↓
[Success]              [Failure]
    ↓                      ↓
[Order Confirmed]     [Retry Payment]
    ↓
[3-Minute Edit Window Active]
       ↓
  ┌── Has variable-price items?
  │     YES → Admin inspects at pickup → sets actual price → customer pays difference
  │     NO  → Proceed normally
  ↓
[PICKUP_SCHEDULED] → FCM notification
       ↓
[PICKED_UP] → FCM notification
       ↓
[CLEANING_IN_PROGRESS] → FCM notification
       ↓
[READY_FOR_DELIVERY] → FCM notification
       ↓
[OUT_FOR_DELIVERY] → FCM notification
       ↓
[DELIVERED] → FCM notification → "Reorder" option available
```

---

## DELIVERY DATE CALCULATION LOGIC
```text
For each order:
  1. Find max estimatedDurationHours across all items in the order
  2. pickupDateTime = pickupSlot.date + pickupSlot.startTime
  3. estimatedDeliveryDate = pickupDateTime + maxDuration + 4 hour buffer

Examples:
  - Dry Cleaning (48h): Pickup Sat 12 Jul 10:00 AM → Delivery Mon 14 Jul (after 2:00 PM)
  - Steam Press (24h): Pickup Sat 12 Jul 10:00 AM → Delivery Sun 13 Jul (after 2:00 PM)
  - Household (72h): Pickup Sat 12 Jul 10:00 AM → Delivery Tue 15 Jul (after 2:00 PM)
  - Mixed order (48h + 72h): Uses 72h (max) → Delivery Tue 15 Jul
```

---

## PAYMENT EDGE CASES
| Scenario | What Happens |
|---|---|
| Order has fixed-price items only | Customer pays exact amount immediately |
| Order has variable-price items | Order created with `priceConfirmed: false`, customer pays after admin confirms actual price |
| Customer edits order within 3 min (increases items) | If paid: pay difference via new Razorpay order. If unpaid: update `finalAmountMinor`, proceed to payment |
| Customer edits order within 3 min (decreases items) | If paid: partial refund via Razorpay. If unpaid: update `finalAmountMinor` |
| Customer cancels within 3 min (not yet paid) | Cancel immediately, no refund needed |
| Customer cancels within 3 min (already paid) | Full refund via Razorpay, status → `REFUND_PENDING` → `REFUNDED` |
| Webhook delayed > 60 seconds | App calls `verifyPaymentStatus` CF, which polls Razorpay API directly |
| UPI app not installed | Razorpay shows QR code or VPA input as fallback |
| Duplicate webhook received | Idempotency check in Firestore transaction — skips if already `VERIFIED` |
| Amount mismatch in webhook | Backend rejects, logs alert, updates payment status to `FAILED` |
