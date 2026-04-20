import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("lib/utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("p-4", "m-4")).toBe("p-4 m-4");
    });

    it("handles conditional class names", () => {
      const shouldUseRed = true;
      const shouldUseBlue = false;
      expect(cn("p-4", shouldUseRed && "text-red-500", shouldUseBlue && "text-blue-500")).toBe("p-4 text-red-500");
    });

    it("merges tailwind classes intelligently", () => {
      // should override padding
      expect(cn("px-2 py-1", "p-4")).toBe("p-4");
      // should combine correctly
      expect(cn("bg-red-500", "hover:bg-red-600")).toBe("bg-red-500 hover:bg-red-600");
    });

    it("handles arrays and objects", () => {
      expect(cn(["p-4", "m-4"], { "text-red-500": true, "text-blue-500": false })).toBe("p-4 m-4 text-red-500");
    });
  });
});
