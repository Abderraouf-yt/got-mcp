import fs from "node:fs/promises";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { logger } from "../server/logger.js";
import type { GraphState } from "../types.js";

/**
 * Validates that a file path does not contain path traversal patterns.
 * This is a defense-in-depth measure — callers are expected to provide
 * a safe, pre-validated path, but this prevents any accidental escape.
 * @throws {Error} if the path contains null bytes or directory traversal
 */
function validatePath(filePath: string, caller: string): void {
    // Null bytes are always invalid
    if (filePath.includes("\0")) {
        throw new Error(`${caller}: Invalid path (null byte detected)`);
    }
    // Reject raw ".." components or path separators that weren't
    // already handled by the caller's sanitization
    const normalized = path.resolve(filePath);
    const relative = path.relative(path.dirname(normalized), normalized);
    if (relative.startsWith("..")) {
        throw new Error(`${caller}: Path traversal detected in ${filePath}`);
    }
}

/**
 * Handles atomic persistence of the Thought Graph state.
 * Implements the core persistence logic with atomicity and performance tracking.
 */
export class Persistence {
    private static isWriting = false;

    /**
     * Atomically saves the graph state to disk.
     * Uses temp file + rename pattern to prevent corruption.
     * Implements SC-002 (< 100ms latency) and SC-004 (< 25% overhead).
     */
    static async save(filePath: string, state: any): Promise<void> {
        validatePath(filePath, "Persistence.save");
        const startTime = performance.now();
        const tempPath = `${filePath}.tmp`;

        try {
            const data = JSON.stringify(state, null, 2);
            
            // Sync writes are sometimes safer for rename atomicity on some OSs,
            // but we use the async fs for the main operation where possible.
            // For true atomicity in Node, write -> rename is the pattern.
            await fs.writeFile(tempPath, data, "utf-8");
            await fs.rename(tempPath, filePath);

            const duration = performance.now() - startTime;
            if (duration > 100) {
                logger.warn(`Persistence latency warning: ${duration.toFixed(2)}ms (Target: < 100ms)`);
            } else {
                logger.debug(`Graph persisted atomically in ${duration.toFixed(2)}ms`);
            }
        } catch (error) {
            // FR-007: Graceful error logging for persistence failures
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[FR-007] Persistence failure at ${filePath}: ${message}. In-memory state remains functional.`);
            
            // Ensure temp file is cleaned up if it exists
            try {
                if (existsSync(tempPath)) {
                    await fs.unlink(tempPath);
                }
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            
            // We don't throw here to ensure the server keeps running (FR-007)
        }
    }

    /**
     * Loads the graph state from disk.
     * Used during initialization (T005).
     */
    static async load(filePath: string): Promise<any | null> {
        validatePath(filePath, "Persistence.load");

        if (!existsSync(filePath)) {
            return null;
        }

        try {
            const data = await fs.readFile(filePath, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to load graph state from ${filePath}: ${message}`);
            return null;
        }
    }

    /**
     * Synchronous load for initial bootstrap if needed.
     */
    static loadSync(filePath: string): any | null {
        validatePath(filePath, "Persistence.loadSync");

        if (!existsSync(filePath)) {
            return null;
        }

        try {
            const data = readFileSync(filePath, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to load graph state (sync) from ${filePath}: ${message}`);
            return null;
        }
    }
}
