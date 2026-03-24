/**
 * lib/self-checkout-guard.ts
 *
 * Fraud-detection rules for self-checkout (scan-and-go) orders.
 * Each check returns { passed: boolean, reason?: string }.
 *
 * Run ALL checks; collect failures; abort if any critical rule fails.
 */

export interface SelfCheckoutItem {
    groceryId: string;
    name: string;
    price: number;
    quantity: number;
}

export interface SelfCheckoutContext {
    userId: string;
    items: SelfCheckoutItem[];
    totalAmount: number;
    /** Client-reported total — must match server-computed total */
    clientTotal: number;
    /** Store lat/lng that the client says they're in */
    clientLatitude?: number;
    clientLongitude?: number;
    /** Store's actual lat/lng (from DB) */
    storeLatitude?: number;
    storeLongitude?: number;
    /** IP address of the request (for velocity checks) */
    ipAddress?: string;
    /** How many self-checkout orders this user placed in the last hour */
    recentOrderCount: number;
}

export interface FraudCheckResult {
    passed: boolean;
    /** Human-readable reason if check failed */
    reason?: string;
    /** "block" = reject the order; "flag" = allow but notify admin */
    severity: "block" | "flag" | "ok";
}

// ─── Individual checks ────────────────────────────────────────────────────────

/** Rule 1 — Client total must match server-computed total within ±1 rupee */
export function checkTotalTamper(ctx: SelfCheckoutContext): FraudCheckResult {
    const serverTotal = ctx.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const diff = Math.abs(serverTotal - ctx.clientTotal);

    if (diff > 1) {
        return {
            passed: false,
            reason: `Price mismatch: client reported ₹${ctx.clientTotal}, server computed ₹${serverTotal.toFixed(2)}`,
            severity: "block",
        };
    }
    return { passed: true, severity: "ok" };
}

/** Rule 2 — Single item quantity must not exceed 20 (bulk-buy fraud) */
export function checkBulkBuy(ctx: SelfCheckoutContext): FraudCheckResult {
    const suspicious = ctx.items.filter((i) => i.quantity > 20);
    if (suspicious.length > 0) {
        return {
            passed: false,
            reason: `Suspicious bulk quantity: ${suspicious.map((i) => `${i.name}×${i.quantity}`).join(", ")}`,
            severity: "flag",
        };
    }
    return { passed: true, severity: "ok" };
}

/** Rule 3 — Max 5 self-checkout orders per user per hour */
export function checkVelocity(ctx: SelfCheckoutContext): FraudCheckResult {
    if (ctx.recentOrderCount >= 5) {
        return {
            passed: false,
            reason: `Velocity limit: ${ctx.recentOrderCount} self-checkout orders in the last hour`,
            severity: "block",
        };
    }
    return { passed: true, severity: "ok" };
}

/** Rule 4 — Customer must be physically near the store (within 500 m) */
export function checkGeofence(ctx: SelfCheckoutContext): FraudCheckResult {
    if (
        ctx.clientLatitude == null || ctx.clientLongitude == null ||
        ctx.storeLatitude == null || ctx.storeLongitude == null
    ) {
        // Can't verify — flag but don't block
        return {
            passed: true,
            reason: "Location data unavailable — geofence check skipped",
            severity: "flag",
        };
    }

    const distKm = haversineKm(
        ctx.clientLatitude, ctx.clientLongitude,
        ctx.storeLatitude, ctx.storeLongitude
    );

    if (distKm > 0.5) { // 500 m radius
        return {
            passed: false,
            reason: `Customer is ${(distKm * 1000).toFixed(0)} m from the store — geofence violated`,
            severity: "block",
        };
    }
    return { passed: true, severity: "ok" };
}

/** Rule 5 — Total order amount above ₹20,000 triggers a flag */
export function checkHighValue(ctx: SelfCheckoutContext): FraudCheckResult {
    if (ctx.totalAmount > 20000) {
        return {
            passed: true,          // Allowed, but flagged for review
            reason: `High-value self-checkout: ₹${ctx.totalAmount}`,
            severity: "flag",
        };
    }
    return { passed: true, severity: "ok" };
}

// ─── Aggregated runner ────────────────────────────────────────────────────────

export interface FraudReport {
    /** true = order should be rejected */
    shouldBlock: boolean;
    /** true = order should be flagged for admin review */
    shouldFlag: boolean;
    failures: FraudCheckResult[];
}

/**
 * Run every fraud check and return a combined FraudReport.
 */
export function runFraudChecks(ctx: SelfCheckoutContext): FraudReport {
    const results = [
        checkTotalTamper(ctx),
        checkBulkBuy(ctx),
        checkVelocity(ctx),
        checkGeofence(ctx),
        checkHighValue(ctx),
    ];

    const failures = results.filter((r) => !r.passed || r.severity === "flag");

    return {
        shouldBlock: failures.some((f) => f.severity === "block"),
        shouldFlag: failures.some((f) => f.severity === "flag"),
        failures,
    };
}

// ─── Utility — Haversine distance ────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}
