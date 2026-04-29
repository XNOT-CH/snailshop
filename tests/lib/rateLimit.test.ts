import { describe, it, expect, beforeEach } from "vitest";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
  checkApiRateLimit,
  checkRegisterRateLimit,
  checkPasswordResetRequestRateLimit,
  checkPasswordResetAttemptRateLimit,
  checkChatMessageRateLimit,
  getClientIp,
  getProgressiveDelay,
  sleep,
} from "@/lib/rateLimit";

describe("rateLimit utilities", () => {
  // Use unique identifiers per test to avoid state leaking
  let testId: string;

  beforeEach(() => {
    testId = `test-${Date.now()}-${Math.random()}`;
  });

  describe("checkLoginRateLimit", () => {
    it("allows first attempt", () => {
      const result = checkLoginRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
    });

    it("tracks failed attempts", () => {
      recordFailedLogin(testId);
      recordFailedLogin(testId);
      const result = checkLoginRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingAttempts).toBe(3);
    });

    it("blocks after 5 failed attempts", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(testId);
      }
      const result = checkLoginRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.message).toBeDefined();
    });
  });

  describe("recordFailedLogin", () => {
    it("creates entry on first failure", () => {
      recordFailedLogin(testId);
      const result = checkLoginRateLimit(testId);
      expect(result.remainingAttempts).toBe(4);
    });

    it("increments count", () => {
      recordFailedLogin(testId);
      recordFailedLogin(testId);
      recordFailedLogin(testId);
      const result = checkLoginRateLimit(testId);
      expect(result.remainingAttempts).toBe(2);
    });
  });

  describe("clearLoginAttempts", () => {
    it("resets attempts after clear", () => {
      recordFailedLogin(testId);
      recordFailedLogin(testId);
      clearLoginAttempts(testId);
      const result = checkLoginRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
    });
  });

  describe("checkApiRateLimit", () => {
    it("allows first request", () => {
      const result = checkApiRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingRequests).toBeGreaterThan(0);
    });

    it("blocks after exceeding max requests", () => {
      for (let i = 0; i < 101; i++) {
        checkApiRateLimit(testId);
      }
      const result = checkApiRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.remainingRequests).toBe(0);
    });
  });

  describe("checkRegisterRateLimit", () => {
    it("allows first registration", () => {
      const result = checkRegisterRateLimit(testId);
      expect(result.blocked).toBe(false);
    });

    it("blocks after 3 registrations", () => {
      checkRegisterRateLimit(testId);
      checkRegisterRateLimit(testId);
      checkRegisterRateLimit(testId);
      const result = checkRegisterRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe("checkPasswordResetRequestRateLimit", () => {
    it("allows the first reset request", () => {
      const result = checkPasswordResetRequestRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingAttempts).toBe(2);
    });

    it("blocks after exceeding the reset request limit", () => {
      for (let i = 0; i < 3; i++) {
        checkPasswordResetRequestRateLimit(testId);
      }

      const result = checkPasswordResetRequestRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.message).toBeDefined();
    });
  });

  describe("checkPasswordResetAttemptRateLimit", () => {
    it("allows the first reset submission", () => {
      const result = checkPasswordResetAttemptRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingAttempts).toBe(4);
    });

    it("blocks after exceeding the reset submission limit", () => {
      for (let i = 0; i < 5; i++) {
        checkPasswordResetAttemptRateLimit(testId);
      }

      const result = checkPasswordResetAttemptRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.message).toBeDefined();
    });
  });

  describe("checkChatMessageRateLimit", () => {
    it("allows the first chat message", () => {
      const result = checkChatMessageRateLimit(testId);
      expect(result.blocked).toBe(false);
      expect(result.remainingMessages).toBe(11);
    });

    it("blocks after exceeding the chat message limit", () => {
      for (let i = 0; i < 12; i++) {
        checkChatMessageRateLimit(testId);
      }

      const result = checkChatMessageRateLimit(testId);
      expect(result.blocked).toBe(true);
      expect(result.remainingMessages).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe("getClientIp", () => {
    it("reads x-forwarded-for header", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("reads x-real-ip header", () => {
      const req = new Request("http://localhost", {
        headers: { "x-real-ip": "10.0.0.1" },
      });
      expect(getClientIp(req)).toBe("10.0.0.1");
    });

    it("prefers x-forwarded-for over x-real-ip", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" },
      });
      expect(getClientIp(req)).toBe("1.1.1.1");
    });

    it("returns unknown when no headers", () => {
      const req = new Request("http://localhost");
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("getProgressiveDelay", () => {
    it("returns 0 for no attempts", () => {
      expect(getProgressiveDelay(testId)).toBe(0);
    });

    it("returns increasing delay", () => {
      recordFailedLogin(testId);
      const d1 = getProgressiveDelay(testId);
      recordFailedLogin(testId);
      const d2 = getProgressiveDelay(testId);
      expect(d2).toBeGreaterThan(d1);
    });
  });

  describe("sleep", () => {
    it("resolves after delay", async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });
});
