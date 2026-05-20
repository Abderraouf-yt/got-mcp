import test from "node:test";
import assert from "node:assert";
import { generateHeuristicPerspectives } from "../src/server/tools/perspectives.js";

test("Perspective Generation Heuristics", async (t) => {
    await t.test("should categorize technical query", () => {
        const perspectives = generateHeuristicPerspectives("software architecture", 1);
        assert.strictEqual(perspectives.length, 1);
        assert.strictEqual(perspectives[0].lens, "Scalability");
    });

    await t.test("should categorize compliance query", () => {
        const perspectives = generateHeuristicPerspectives("AWS security compliance", 1);
        assert.strictEqual(perspectives[0].lens, "Security Controls");
    });

    await t.test("should use fallback for unknown domain", () => {
        const perspectives = generateHeuristicPerspectives("something unknown", 1);
        // Default is technical
        assert.strictEqual(perspectives[0].lens, "Scalability");
    });

    await t.test("should respect count parameter", () => {
        const perspectives = generateHeuristicPerspectives("software", 3);
        assert.strictEqual(perspectives.length, 3);
        assert.strictEqual(perspectives[0].lens, "Scalability");
        assert.strictEqual(perspectives[1].lens, "Security");
        assert.strictEqual(perspectives[2].lens, "Performance");
    });

    await t.test("should cap at taxonomy limit + fallback", () => {
        const perspectives = generateHeuristicPerspectives("software", 5);
        assert.strictEqual(perspectives.length, 5);
        // 4 from technical + 1 risk fallback
        assert.strictEqual(perspectives[4].lens, "Risk");
    });
});
