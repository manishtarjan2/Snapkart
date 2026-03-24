/**
 * grocery.model.ts
 *
 * Legacy alias — re-exports the canonical Product model.
 * Both models map to the same "Grocery" MongoDB collection.
 * Using a single Mongoose model registration avoids schema conflicts.
 */
export { default } from "./product.model";
export type { IProduct as IGrocery } from "./product.model";
