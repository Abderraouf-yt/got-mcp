import { ZodSchema } from "zod";

/**
 * Utility to validate tool output against its outputSchema.
 * Ensures Antigravity 2026 compliance.
 */
export function validateOutput(schema: ZodSchema, payload: any) {
    try {
        schema.parse(payload);
        return { valid: true };
    } catch (err: any) {
        return {
            valid: false,
            errors: err.errors,
            message: err.message
        };
    }
}
