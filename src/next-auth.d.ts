import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface User {
        id: string;
        name: string;
        email: string;
        /**
         * Full role set:
         * superAdmin | storeAdmin | productAdmin | deliveryAdmin | deliveryBoy | user
         */
        role: string;
        /** Store the user belongs to (storeAdmin, deliveryBoy, storeAdmin-staff) */
        store_id?: string | null;
        isBlocked?: boolean;
    }

    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            store_id?: string | null;
            isBlocked?: boolean;
            image?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        store_id?: string | null;
        isBlocked?: boolean;
    }
}

export { };