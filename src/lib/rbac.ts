/**
 * lib/rbac.ts  — Role-Based Access Control
 *
 * Usage in any API route:
 *
 *   const check = rbac(session, ["superAdmin", "storeAdmin"]);
 *   if (!check.ok) return check.response;
 *   // proceed — check.session is typed
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";

export type UserRole =
    | "superAdmin"
    | "storeAdmin"
    | "productAdmin"
    | "deliveryAdmin"
    | "deliveryBoy"
    | "posAdmin"
    | "employee"
    | "user"
    | "admin";       // legacy

/**
 * Role hierarchy weights — used to check "at least X level" if needed.
 * Higher = more privileged.
 */
export const ROLE_WEIGHT: Record<UserRole, number> = {
    superAdmin: 100,
    storeAdmin: 60,
    productAdmin: 60,
    deliveryAdmin: 60,
    admin: 60,   // legacy alias for storeAdmin
    posAdmin: 30,
    employee: 15,
    deliveryBoy: 20,
    user: 10,
};

/**
 * Defines what each role can do — module-level permission map.
 * Every new permission check should be expressed as an entry here
 * (prefer explicit allow-lists over "deny everything else").
 */
export const PERMISSIONS: Record<string, UserRole[]> = {
    // ── Global management ────────────────────────────────────────────────────
    "super:all": ["superAdmin"],
    "store:create": ["superAdmin"],
    "store:delete": ["superAdmin"],
    "admin:create": ["superAdmin"],
    "commission:update": ["superAdmin"],
    "pricing:globalRule": ["superAdmin"],
    "analytics:global": ["superAdmin"],

    // ── Store-level ops ──────────────────────────────────────────────────────
    "inventory:read": ["superAdmin", "storeAdmin"],
    "inventory:write": ["superAdmin", "storeAdmin"],
    "store:orders:read": ["superAdmin", "storeAdmin"],
    "store:staff:manage": ["superAdmin", "storeAdmin"],
    "store:checkout:logs": ["superAdmin", "storeAdmin"],
    "store:sales:read": ["superAdmin", "storeAdmin"],

    // ── Product catalogue ops ────────────────────────────────────────────────
    "product:read": ["superAdmin", "productAdmin", "storeAdmin"],
    "product:write": ["superAdmin", "productAdmin"],
    "product:delete": ["superAdmin", "productAdmin"],
    "category:manage": ["superAdmin", "productAdmin"],
    "discount:set": ["superAdmin", "productAdmin"],

    // ── Delivery ops ─────────────────────────────────────────────────────────
    "delivery:assign": ["superAdmin", "deliveryAdmin"],
    "delivery:boys:manage": ["superAdmin", "deliveryAdmin"],
    "delivery:track:all": ["superAdmin", "deliveryAdmin"],
    "delivery:zones": ["superAdmin", "deliveryAdmin"],
    "delivery:performance": ["superAdmin", "deliveryAdmin"],

    // ── Delivery-boy ops ─────────────────────────────────────────────────────
    "delivery:self": ["deliveryBoy"],
    "delivery:status": ["deliveryBoy", "deliveryAdmin", "superAdmin"],
    "location:update": ["deliveryBoy"],

    // ── Customer ops ─────────────────────────────────────────────────────────
    "order:place": ["user"],
    "order:track": ["user", "superAdmin", "storeAdmin", "deliveryAdmin"],
    "refund:request": ["user"],
};

// ─── Result types ─────────────────────────────────────────────────────────────

type RbacOk = { ok: true; session: Session };
type RbacFail = { ok: false; response: NextResponse };
type RbacResult = RbacOk | RbacFail;

// ─── Main guard ───────────────────────────────────────────────────────────────

/**
 * Check whether the session user has one of the **allowedRoles**.
 *
 * @param session   - Result of `await auth()`. May be null.
 * @param allowedRoles - Roles that may access this resource.
 * @param options.blockCheck - If true (default), also returns 403 when the
 *   user account has `isBlocked = true` (when the flag is in the JWT).
 */
export function rbac(
    session: Session | null,
    allowedRoles: UserRole[],
    options: { blockCheck?: boolean } = {}
): RbacResult {
    const { blockCheck = true } = options;

    // 1. Must be authenticated
    if (!session?.user?.id) {
        return {
            ok: false,
            response: NextResponse.json({ message: "Unauthorized — please login" }, { status: 401 }),
        };
    }

    const role = session.user.role as UserRole;

    // 2. Role must be in allow-list
    if (!allowedRoles.includes(role)) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    message: `Forbidden — requires one of: ${allowedRoles.join(", ")}`,
                    yourRole: role,
                },
                { status: 403 }
            ),
        };
    }

    // 3. Blocked-account check (flag stored in extended JWT by auth.ts)
    if (blockCheck && (session.user as unknown as { isBlocked?: boolean }).isBlocked) {
        return {
            ok: false,
            response: NextResponse.json(
                { message: "Your account has been blocked. Contact support." },
                { status: 403 }
            ),
        };
    }

    return { ok: true, session };
}

/**
 * Check if `role` has a given named permission.
 * Useful for fine-grained capability checks inside a route.
 */
export function can(role: UserRole, permission: string): boolean {
    return PERMISSIONS[permission]?.includes(role) ?? false;
}

/**
 * Ensure a storeAdmin is only accessing data that belongs to THEIR store.
 * superAdmin can access any store.
 *
 * Returns the effective storeId to use in DB queries.
 * Throws a NextResponse (403) if access is denied.
 */
export function resolveStoreAccess(
    session: Session,
    requestedStoreId: string | null | undefined
): { storeId: string | null; response?: NextResponse } {
    const role = session.user.role as UserRole;
    const ownStore = (session.user as unknown as { store_id?: string }).store_id ?? null;

    if (role === "superAdmin") {
        return { storeId: requestedStoreId ?? null };
    }

    if (role === "storeAdmin") {
        // storeAdmin can only see their own store
        if (requestedStoreId && requestedStoreId !== ownStore) {
            return {
                storeId: null,
                response: NextResponse.json(
                    { message: "Access denied — you can only manage your own store" },
                    { status: 403 }
                ),
            };
        }
        return { storeId: ownStore };
    }

    // Other roles requesting store-scoped data use the requested ID
    return { storeId: requestedStoreId ?? null };
}
