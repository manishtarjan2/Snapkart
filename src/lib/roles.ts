/**
 * Centralized role permission helper for Snapkart API routes.
 * 
 * Since the app initially used legacy role "admin" and has been extended
 * with specific roles (storeAdmin, productAdmin, deliveryAdmin, etc.), 
 * all admin operations must accept both old and new role names.
 */

/** Roles that have full admin access to store / billing / orders */
export const STORE_ADMIN_ROLES = ["admin", "storeAdmin", "superAdmin"] as const;

/** Roles that can manage products / catalogue */
export const PRODUCT_ADMIN_ROLES = ["admin", "productAdmin", "superAdmin"] as const;

/** Roles that can manage delivery operations */
export const DELIVERY_ADMIN_ROLES = ["admin", "deliveryAdmin", "superAdmin"] as const;

/** Super admin only */
export const SUPER_ADMIN_ROLES = ["superAdmin"] as const;

/** Any kind of admin */
export const ANY_ADMIN_ROLES = [
    "admin", "superAdmin", "storeAdmin", "productAdmin", "deliveryAdmin",
] as const;

/**
 * Returns true if the given role is in the allowed set.
 * Handles null/undefined gracefully.
 */
export function hasRole(
    role: string | null | undefined,
    allowed: readonly string[]
): boolean {
    if (!role) return false;
    return allowed.includes(role);
}
