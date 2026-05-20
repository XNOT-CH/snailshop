import { describe, it, expect } from "vitest";
import {
  apiSuccess,
  apiError,
  createApiErrorPayload,
  createApiSuccessPayload,
  parseBody,
} from "@/lib/api";
import { z } from "zod";

describe("lib/api", () => {
  describe("apiSuccess", () => {
    it("returns NextResponse with data", async () => {
      const data = { id: 1 };
      const res = apiSuccess(data);
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body).not.toHaveProperty("timestamp");
    });

    it("includes custom message and status", async () => {
      const res = apiSuccess({}, "Created", 201);
      expect(res.status).toBe(201);
      
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe("Created");
    });
  });

  describe("apiError", () => {
    it("returns NextResponse with error message", async () => {
      const res = apiError("Error message");
      expect(res.status).toBe(400);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Error message");
      expect(body).not.toHaveProperty("errorCode");
      expect(body).not.toHaveProperty("timestamp");
    });

    it("includes errors object and status", async () => {
      const errors = { field: ["invalid"] };
      const res = apiError("Validation failed", 422, errors);
      expect(res.status).toBe(422);
      
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errors).toEqual(errors);
    });
  });

  describe("parseBody", () => {
    const schema = z.object({ name: z.string(), age: z.number().optional() });

    it("parses valid body correctly", async () => {
      const mockReq = {
        json: async () => ({ name: "Test", age: 25 })
      } as unknown as Request;

      const result = await parseBody(mockReq, schema);
      expect("data" in result).toBe(true);
      expect((result as any).data).toEqual({ name: "Test", age: 25 });
    });

    it("returns error for invalid json", async () => {
      const mockReq = {
        json: async () => { throw new Error("Invalid JSON"); }
      } as unknown as Request;

      const result = await parseBody(mockReq, schema);
      expect("error" in result).toBe(true);
      
      const errRes = (result as any).error;
      expect(errRes.status).toBe(400);
      
      const body = await errRes.json();
      expect(body.message).toBe("Invalid JSON body");
    });

    it("returns error for schema validation failure", async () => {
      const mockReq = {
        json: async () => ({ age: "not-a-number" })
      } as unknown as Request;

      const result = await parseBody(mockReq, schema);
      expect("error" in result).toBe(true);
      
      const errRes = (result as any).error;
      expect(errRes.status).toBe(422);
      
      const body = await errRes.json();
      expect(body.message).toBe("ข้อมูลไม่ถูกต้อง");
      expect(body.errors.name).toBeDefined(); // Missing required
      expect(body.errors.age).toBeDefined(); // Wrong type
    });
  });

  describe("payload builders", () => {
    it("can add timestamp without changing apiSuccess default response contract", () => {
      const payload = createApiSuccessPayload({ ok: true }, { timestamp: "2026-05-08T00:00:00.000Z" });

      expect(payload).toEqual({
        success: true,
        data: { ok: true },
        timestamp: "2026-05-08T00:00:00.000Z",
      });
    });

    it("can add errorCode and timestamp for wrappers that need the apiSecurity contract", () => {
      const payload = createApiErrorPayload("Bad request", {
        errorCode: "BAD_REQUEST",
        timestamp: "2026-05-08T00:00:00.000Z",
      });

      expect(payload).toEqual({
        success: false,
        message: "Bad request",
        errorCode: "BAD_REQUEST",
        timestamp: "2026-05-08T00:00:00.000Z",
      });
    });
  });
});
