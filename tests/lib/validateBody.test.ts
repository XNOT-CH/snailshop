import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody } from "@/lib/validations/validate";

// Helper to create a mock Request with JSON body
function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper to create a mock Request with invalid JSON
function mockBadRequest(): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json{{{",
  });
}

const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(0, "Age must be >= 0"),
});

describe("validateBody", () => {
  it("returns data on valid input", async () => {
    const result = await validateBody(mockRequest({ name: "Alice", age: 25 }), testSchema);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(25);
    }
  });

  it("returns error for invalid JSON", async () => {
    const result = await validateBody(mockBadRequest(), testSchema);
    expect("error" in result).toBe(true);
  });

  it("returns error for schema validation failure", async () => {
    const result = await validateBody(mockRequest({ name: "", age: -1 }), testSchema);
    expect("error" in result).toBe(true);
  });

  it("returns error for missing fields", async () => {
    const result = await validateBody(mockRequest({}), testSchema);
    expect("error" in result).toBe(true);
  });

  it("returns error with first issue message", async () => {
    const result = await validateBody(mockRequest({ name: 123 }), testSchema);
    expect("error" in result).toBe(true);
  });
});
