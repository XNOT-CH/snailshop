import { describe, it, expect, vi } from "vitest";
import {
  apiSuccess,
  apiError,
  API_ERRORS,
  handleApiError,
  parseRequestBody,
  validateRequestBody,
} from "@/lib/apiSecurity";

// Helper
function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockBadRequest(): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    body: "not json",
  });
}

describe("apiSecurity - response helpers", () => {
  describe("apiSuccess", () => {
    it("returns 200 with success: true", async () => {
      const res = apiSuccess({ id: 1 });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(1);
      expect(body.timestamp).toBeDefined();
    });

    it("includes optional message", async () => {
      const res = apiSuccess(null, "Created");
      const body = await res.json();
      expect(body.message).toBe("Created");
    });

    it("uses custom status code", () => {
      const res = apiSuccess(null, "Done", 201);
      expect(res.status).toBe(201);
    });
  });

  describe("apiError", () => {
    it("returns 400 with success: false", async () => {
      const res = apiError("Bad request");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.errorCode).toBe("ERR_400");
    });

    it("uses custom error code", async () => {
      const res = apiError("Not found", 404, "NOT_FOUND");
      const body = await res.json();
      expect(body.errorCode).toBe("NOT_FOUND");
    });
  });

  describe("API_ERRORS presets", () => {
    it("UNAUTHORIZED returns 401", () => {
      expect(API_ERRORS.UNAUTHORIZED().status).toBe(401);
    });

    it("FORBIDDEN returns 403", () => {
      expect(API_ERRORS.FORBIDDEN().status).toBe(403);
    });

    it("NOT_FOUND returns 404", async () => {
      const res = API_ERRORS.NOT_FOUND("สินค้า");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toContain("สินค้า");
    });

    it("NOT_FOUND with default resource", async () => {
      const body = await API_ERRORS.NOT_FOUND().json();
      expect(body.message).toContain("ข้อมูล");
    });

    it("BAD_REQUEST returns 400", () => {
      expect(API_ERRORS.BAD_REQUEST().status).toBe(400);
    });

    it("BAD_REQUEST with custom message", async () => {
      const body = await API_ERRORS.BAD_REQUEST("Invalid input").json();
      expect(body.message).toBe("Invalid input");
    });

    it("RATE_LIMITED returns 429", () => {
      expect(API_ERRORS.RATE_LIMITED().status).toBe(429);
    });

    it("RATE_LIMITED sets Retry-After header", () => {
      const res = API_ERRORS.RATE_LIMITED(5000);
      expect(res.headers.get("Retry-After")).toBe("5");
    });

    it("INTERNAL_ERROR returns 500", () => {
      expect(API_ERRORS.INTERNAL_ERROR().status).toBe(500);
    });

    it("VALIDATION_ERROR returns 422", async () => {
      const res = API_ERRORS.VALIDATION_ERROR("email", "Invalid format");
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("email");
    });

    it("CSRF_ERROR returns 403", () => {
      expect(API_ERRORS.CSRF_ERROR().status).toBe(403);
    });
  });

  describe("handleApiError", () => {
    it("returns 500 response", () => {
      const res = handleApiError(new Error("test"));
      expect(res.status).toBe(500);
    });

    it("logs the error to console", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      handleApiError(new Error("oops"), "TestContext");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe("apiSecurity - parseRequestBody", () => {
  it("parses valid JSON body", async () => {
    const result = await parseRequestBody(mockRequest({ name: "test" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("test");
    }
  });

  it("returns error for invalid JSON", async () => {
    const result = await parseRequestBody(mockBadRequest());
    expect(result.success).toBe(false);
  });
});

describe("apiSecurity - validateRequestBody", () => {
  it("validates required fields present", async () => {
    const result = await validateRequestBody(mockRequest({ name: "test", email: "a@b.com" }), ["name", "email"]);
    expect(result.success).toBe(true);
  });

  it("returns error for missing required fields", async () => {
    const result = await validateRequestBody(mockRequest({ name: "test" }), ["name", "email"]);
    expect(result.success).toBe(false);
  });

  it("returns error for invalid JSON", async () => {
    const result = await validateRequestBody(mockBadRequest(), ["name"]);
    expect(result.success).toBe(false);
  });
});

