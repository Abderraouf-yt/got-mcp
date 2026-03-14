/**
 * Shared Context Store (CA-MCP pattern, arXiv 2601.11595)
 * Key-value store for intermediate reasoning state.
 * Tracks provenance (source) for trust scoring.
 *
 * @module context/ContextStore
 */

export interface ContextEntry {
    value: unknown;
    source: string;
    updatedAt: string;
}

/**
 * In-memory shared context store.
 * Enables cross-tool knowledge sharing within a session,
 * reducing redundant LLM calls (CA-MCP, 2026).
 */
export class ContextStore {
    private store = new Map<string, ContextEntry>();

    /**
     * Set a key-value pair with source provenance.
     */
    set(key: string, value: unknown, source: string): void {
        this.store.set(key, {
            value,
            source,
            updatedAt: new Date().toISOString(),
        });
    }

    /**
     * Get a value by key. Returns undefined if not found.
     */
    get(key: string): unknown | undefined {
        return this.store.get(key)?.value;
    }

    /**
     * Get value with full provenance metadata.
     */
    getWithProvenance(key: string): ContextEntry | undefined {
        return this.store.get(key);
    }

    /**
     * Check if a key exists.
     */
    has(key: string): boolean {
        return this.store.has(key);
    }

    /**
     * Delete a key.
     */
    delete(key: string): boolean {
        return this.store.delete(key);
    }

    /**
     * List all keys with their sources (no values — lightweight).
     */
    list(): Array<{ key: string; source: string; updatedAt: string }> {
        return Array.from(this.store.entries()).map(([key, entry]) => ({
            key,
            source: entry.source,
            updatedAt: entry.updatedAt,
        }));
    }

    /**
     * Get full store as a serializable object.
     */
    getAll(): Record<string, ContextEntry> {
        const result: Record<string, ContextEntry> = {};
        for (const [key, entry] of this.store) {
            result[key] = entry;
        }
        return result;
    }

    /**
     * Clear all context.
     */
    clear(): void {
        this.store.clear();
    }

    /**
     * Number of entries in the store.
     */
    get size(): number {
        return this.store.size;
    }
}

// Session registry for isolated context stores
const sessionRegistry = new Map<string, ContextStore>();

/**
 * Get a ContextStore instance scoped to a session.
 * Creates a new instance if one doesn't exist for this session.
 * @param sessionId - Unique session identifier (defaults to "default")
 */
export function getContextInstance(sessionId: string = "default"): ContextStore {
    if (!sessionRegistry.has(sessionId)) {
        sessionRegistry.set(sessionId, new ContextStore());
    }
    return sessionRegistry.get(sessionId)!;
}

/**
 * Get all active session IDs.
 */
export function getSessionIds(): string[] {
    return Array.from(sessionRegistry.keys());
}

/**
 * Destroy a session's context instance and free resources.
 */
export function destroySession(sessionId: string): boolean {
    const store = sessionRegistry.get(sessionId);
    if (store) {
        store.clear();
        sessionRegistry.delete(sessionId);
        return true;
    }
    return false;
}

/**
 * Reset all session instances (useful for testing).
 */
export function resetContextInstance(): void {
    sessionRegistry.clear();
}
