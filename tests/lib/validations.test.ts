import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { createProductSchema, updateProductSchema } from "@/lib/validations/product";
import { navItemSchema, newsItemSchema, popupSchema, footerLinkSchema, helpItemSchema, roleSchema } from "@/lib/validations/content";
import { gachaMachineSchema, gachaRewardSchema, gachaSettingsSchema } from "@/lib/validations/gacha";
import { updateProfileSchema } from "@/lib/validations/profile";
import { createTopupSchema, reviewTopupSchema } from "@/lib/validations/topup";
import { promoCodeSchema } from "@/lib/validations/promoCode";
import { updateUserRoleSchema, adjustBalanceSchema } from "@/lib/validations/user";
import { siteSettingsSchema } from "@/lib/validations/settings";

describe("auth validations", () => {
  describe("loginSchema", () => {
    it("accepts valid login data", () => {
      expect(loginSchema.safeParse({ username: "user1", password: "pass123" }).success).toBe(true);
    });
    it("rejects empty username", () => {
      expect(loginSchema.safeParse({ username: "", password: "pass123" }).success).toBe(false);
    });
    it("rejects empty password", () => {
      expect(loginSchema.safeParse({ username: "user1", password: "" }).success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("accepts valid registration", () => {
      const result = registerSchema.safeParse({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(result.success).toBe(true);
    });
    it("rejects short username", () => {
      expect(registerSchema.safeParse({ username: "ab", email: "", password: "password123", confirmPassword: "password123" }).success).toBe(false);
    });
    it("rejects mismatched passwords", () => {
      expect(registerSchema.safeParse({ username: "testuser", email: "", password: "pass123", confirmPassword: "pass456" }).success).toBe(false);
    });
    it("rejects short password", () => {
      expect(registerSchema.safeParse({ username: "testuser", email: "", password: "short", confirmPassword: "short" }).success).toBe(false);
    });
    it("allows empty email", () => {
      const result = registerSchema.safeParse({ username: "testuser", email: "", password: "password123", confirmPassword: "password123" });
      expect(result.success).toBe(true);
    });
  });
});

describe("product validations", () => {
  describe("createProductSchema", () => {
    it("accepts valid product data", () => {
      const result = createProductSchema.safeParse({ name: "Product 1", category: "Games", price: 100 });
      expect(result.success).toBe(true);
    });
    it("rejects empty name", () => {
      expect(createProductSchema.safeParse({ name: "", category: "Games", price: 100 }).success).toBe(false);
    });
    it("rejects negative price", () => {
      expect(createProductSchema.safeParse({ name: "Test", category: "Games", price: -1 }).success).toBe(false);
    });
    it("accepts optional fields", () => {
      const result = createProductSchema.safeParse({ name: "Test", category: "Games", price: 50, description: "desc", isFeatured: true });
      expect(result.success).toBe(true);
    });
  });

  describe("updateProductSchema", () => {
    it("accepts partial data", () => {
      expect(updateProductSchema.safeParse({ name: "Updated" }).success).toBe(true);
    });
    it("accepts empty object", () => {
      expect(updateProductSchema.safeParse({}).success).toBe(true);
    });
  });
});

describe("content validations", () => {
  describe("navItemSchema", () => {
    it("accepts valid nav item", () => {
      expect(navItemSchema.safeParse({ label: "Home", href: "/" }).success).toBe(true);
    });
    it("rejects empty label", () => {
      expect(navItemSchema.safeParse({ label: "", href: "/" }).success).toBe(false);
    });
  });

  describe("newsItemSchema", () => {
    it("accepts valid news item", () => {
      expect(newsItemSchema.safeParse({ title: "News", description: "Content here" }).success).toBe(true);
    });
    it("rejects empty title", () => {
      expect(newsItemSchema.safeParse({ title: "", description: "Content" }).success).toBe(false);
    });
  });

  describe("popupSchema", () => {
    it("accepts valid popup", () => {
      expect(popupSchema.safeParse({ imageUrl: "https://example.com/img.png" }).success).toBe(true);
    });
    it("rejects invalid imageUrl", () => {
      expect(popupSchema.safeParse({ imageUrl: "not-a-url" }).success).toBe(false);
    });
  });

  describe("footerLinkSchema", () => {
    it("accepts valid footer link", () => {
      expect(footerLinkSchema.safeParse({ label: "About", href: "/about" }).success).toBe(true);
    });
    it("rejects empty label", () => {
      expect(footerLinkSchema.safeParse({ label: "", href: "/about" }).success).toBe(false);
    });
  });

  describe("helpItemSchema", () => {
    it("accepts valid help item", () => {
      expect(helpItemSchema.safeParse({ title: "FAQ", content: "Answer here" }).success).toBe(true);
    });
  });

  describe("roleSchema", () => {
    it("accepts valid role", () => {
      expect(roleSchema.safeParse({ name: "Editor" }).success).toBe(true);
    });
    it("rejects empty role name", () => {
      expect(roleSchema.safeParse({ name: "" }).success).toBe(false);
    });
  });
});

describe("gacha validations", () => {
  describe("gachaMachineSchema", () => {
    it("accepts valid gacha machine", () => {
      expect(gachaMachineSchema.safeParse({ name: "Lucky Box" }).success).toBe(true);
    });
    it("rejects empty name", () => {
      expect(gachaMachineSchema.safeParse({ name: "" }).success).toBe(false);
    });
    it("accepts costType enum", () => {
      const result = gachaMachineSchema.safeParse({ name: "Box", costType: "CREDIT", costAmount: 100 });
      expect(result.success).toBe(true);
    });
  });

  describe("gachaRewardSchema", () => {
    it("accepts valid reward", () => {
      expect(gachaRewardSchema.safeParse({ rewardType: "CREDIT", tier: "common", probability: 50 }).success).toBe(true);
    });
    it("rejects probability over 100", () => {
      expect(gachaRewardSchema.safeParse({ rewardType: "CREDIT", probability: 150 }).success).toBe(false);
    });
  });

  describe("gachaSettingsSchema", () => {
    it("accepts valid settings", () => {
      expect(gachaSettingsSchema.safeParse({ isEnabled: true, costType: "FREE" }).success).toBe(true);
    });
  });
});

describe("profile validations", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid profile update", () => {
      const result = updateProfileSchema.safeParse({ name: "John", email: "john@test.com" });
      expect(result.success).toBe(true);
    });
    it("rejects empty name", () => {
      expect(updateProfileSchema.safeParse({ name: "", email: "a@b.com" }).success).toBe(false);
    });
    it("rejects mismatched passwords", () => {
      const result = updateProfileSchema.safeParse({ name: "John", email: "a@b.com", password: "newpass", confirmPassword: "different" });
      expect(result.success).toBe(false);
    });
    it("allows empty password (keep existing)", () => {
      const result = updateProfileSchema.safeParse({ name: "John", email: "a@b.com", password: "" });
      expect(result.success).toBe(true);
    });
  });
});

describe("topup validations", () => {
  describe("createTopupSchema", () => {
    it("accepts valid topup", () => {
      expect(createTopupSchema.safeParse({ amount: 100 }).success).toBe(true);
    });
    it("rejects zero amount", () => {
      expect(createTopupSchema.safeParse({ amount: 0 }).success).toBe(false);
    });
    it("rejects excessive amount", () => {
      expect(createTopupSchema.safeParse({ amount: 2_000_000 }).success).toBe(false);
    });
  });

  describe("reviewTopupSchema", () => {
    it("accepts APPROVED without reason", () => {
      expect(reviewTopupSchema.safeParse({ status: "APPROVED" }).success).toBe(true);
    });
    it("rejects REJECTED without reason", () => {
      expect(reviewTopupSchema.safeParse({ status: "REJECTED" }).success).toBe(false);
    });
    it("accepts REJECTED with reason", () => {
      expect(reviewTopupSchema.safeParse({ status: "REJECTED", rejectReason: "Duplicate slip" }).success).toBe(true);
    });
  });
});

describe("promoCode validations", () => {
  describe("promoCodeSchema", () => {
    it("accepts valid promo code", () => {
      const result = promoCodeSchema.safeParse({ code: "SAVE10", discountType: "PERCENTAGE", discountValue: 10 });
      expect(result.success).toBe(true);
    });
    it("rejects short code", () => {
      expect(promoCodeSchema.safeParse({ code: "AB", discountType: "FIXED", discountValue: 50 }).success).toBe(false);
    });
    it("rejects lowercase code", () => {
      expect(promoCodeSchema.safeParse({ code: "save10", discountType: "FIXED", discountValue: 50 }).success).toBe(false);
    });
    it("rejects percentage over 100", () => {
      expect(promoCodeSchema.safeParse({ code: "CRAZY", discountType: "PERCENTAGE", discountValue: 150 }).success).toBe(false);
    });
    it("allows 100% percentage", () => {
      expect(promoCodeSchema.safeParse({ code: "FREE100", discountType: "PERCENTAGE", discountValue: 100 }).success).toBe(true);
    });
  });
});

describe("user validations", () => {
  describe("updateUserRoleSchema", () => {
    it("accepts valid roles", () => {
      expect(updateUserRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
      expect(updateUserRoleSchema.safeParse({ role: "USER" }).success).toBe(true);
      expect(updateUserRoleSchema.safeParse({ role: "MODERATOR" }).success).toBe(true);
    });
    it("rejects invalid role", () => {
      expect(updateUserRoleSchema.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
    });
  });

  describe("adjustBalanceSchema", () => {
    it("accepts valid credit adjustment", () => {
      expect(adjustBalanceSchema.safeParse({ type: "credit", amount: 100 }).success).toBe(true);
    });
    it("accepts negative amount (deduction)", () => {
      expect(adjustBalanceSchema.safeParse({ type: "point", amount: -50 }).success).toBe(true);
    });
    it("rejects excessive amount", () => {
      expect(adjustBalanceSchema.safeParse({ type: "credit", amount: 2_000_000 }).success).toBe(false);
    });
  });
});

describe("settings validations", () => {
  describe("siteSettingsSchema", () => {
    it("accepts valid settings", () => {
      const result = siteSettingsSchema.safeParse({ siteName: "My Store", maintenanceMode: false });
      expect(result.success).toBe(true);
    });
    it("accepts empty optional fields", () => {
      expect(siteSettingsSchema.safeParse({}).success).toBe(true);
    });
    it("accepts local image paths", () => {
      const result = siteSettingsSchema.safeParse({ logoUrl: "/uploads/logo.png" });
      expect(result.success).toBe(true);
    });
    it("accepts https image URLs", () => {
      const result = siteSettingsSchema.safeParse({ logoUrl: "https://example.com/logo.png" });
      expect(result.success).toBe(true);
    });
    it("rejects invalid image URL", () => {
      const result = siteSettingsSchema.safeParse({ logoUrl: "not-a-url" });
      expect(result.success).toBe(false);
    });
  });
});
