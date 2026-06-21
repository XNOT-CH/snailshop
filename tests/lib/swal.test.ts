import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSwal = vi.hoisted(() => ({
  mixin: vi.fn().mockReturnThis(),
  fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  showLoading: vi.fn(),
  close: vi.fn(),
  stopTimer: vi.fn(),
  resumeTimer: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: mockSwal
}));

describe("lib/swal", () => {
  let swalModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSwal.fire.mockResolvedValue({ isConfirmed: true });
    swalModule = await import("@/lib/swal");
  });

  it("exports various alert functions", () => {
    expect(typeof swalModule.showSuccess).toBe("function");
    expect(typeof swalModule.showError).toBe("function");
    expect(typeof swalModule.showWarning).toBe("function");
    expect(typeof swalModule.showInfo).toBe("function");
    expect(typeof swalModule.showConfirm).toBe("function");
    expect(typeof swalModule.showDeleteConfirm).toBe("function");
    expect(typeof swalModule.showPurchaseConfirm).toBe("function");
    expect(typeof swalModule.showLoading).toBe("function");
    expect(typeof swalModule.hideLoading).toBe("function");
  });

  describe("toast functions", () => {
    it("showSuccess calls fire with success icon", async () => {
      swalModule.showSuccess("Success message");
      await vi.waitFor(() => expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: "success",
        title: "Success message"
      })));
    });

    it("showError calls fire with error icon", async () => {
      swalModule.showError("Error message");
      await vi.waitFor(() => expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: "error",
        title: "Error message"
      })));
    });
    
    it("showWarning calls fire with warning icon", async () => {
      swalModule.showWarning("Warning message");
      await vi.waitFor(() => expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: "warning",
        title: "Warning message"
      })));
    });
    
    it("showInfo calls fire with info icon", async () => {
      swalModule.showInfo("Info message");
      await vi.waitFor(() => expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: "info",
        title: "Info message"
      })));
    });
  });

  describe("confirm dialogs", () => {
    it("showConfirm shows warning dialog and returns boolean", async () => {
      const result = await swalModule.showConfirm("Title", "Are you sure?");
      
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: "Title",
        text: "Are you sure?",
        icon: "warning",
        showCancelButton: true
      }));
      expect(result).toBe(true);
    });

    it("showDeleteConfirm shows delete dialog with item name", async () => {
      await swalModule.showDeleteConfirm("My Item");
      
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: "ยืนยันการลบ?",
        html: expect.stringContaining("My Item"),
        confirmButtonColor: "#ef4444"
      }));
    });

    it("showDeleteConfirm escapes item names before inserting HTML", async () => {
      await swalModule.showDeleteConfirm('<img src=x onerror="alert(1)">');

      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining("&lt;img src"),
      }));
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining("<img"),
      }));
    });
  });

  describe("purchase dialogs", () => {
    it("showPurchaseConfirm displays accurate HTML", async () => {
      await swalModule.showPurchaseConfirm({
        productName: "Game",
        priceText: "99 THB",
        helperText: "ระบบจะซื้อเฉพาะสินค้านี้เท่านั้น สินค้าในตะกร้าจะยังอยู่เหมือนเดิม",
      });
      
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining("Game"),
      }));
      // Check that price is also in the html
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining("99 THB"),
      }));
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining("สินค้าในตะกร้าจะยังอยู่เหมือนเดิม"),
      }));
    });

    it("showPurchaseConfirm omits helper text when not provided", async () => {
      await swalModule.showPurchaseConfirm({
        productName: "Cart item",
        priceText: "199 THB",
      });

      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.not.stringContaining("สินค้าในตะกร้าจะยังอยู่เหมือนเดิม"),
      }));
    });

    it("showPurchaseConfirm escapes product, price, and helper text", async () => {
      await swalModule.showPurchaseConfirm({
        productName: "<strong>Game</strong>",
        priceText: "<img src=x>",
        helperText: "<script>alert(1)</script>",
      });

      const html = mockSwal.fire.mock.calls.at(-1)?.[0]?.html;
      expect(html).toContain("&lt;strong&gt;Game&lt;&#x2F;strong&gt;");
      expect(html).toContain("&lt;img src&#x3D;x&gt;");
      expect(html).toContain("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
      expect(html).not.toContain("<script>");
    });

    it("showPurchaseSuccessModal displays success view", async () => {
      await swalModule.showPurchaseSuccessModal({ productName: "Game" });
      
      expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: "success",
        html: expect.stringContaining("Game")
      }));
    });

    it("showPurchaseSuccessModal escapes product name in the default HTML", async () => {
      await swalModule.showPurchaseSuccessModal({ productName: "<b>Game</b>" });

      const html = mockSwal.fire.mock.calls.at(-1)?.[0]?.html;
      expect(html).toContain("&lt;b&gt;Game&lt;&#x2F;b&gt;");
      expect(html).not.toContain("<b>Game</b>");
    });
  });

  describe("loading indicators", () => {
    it("showLoading calls SweetAlert loading", async () => {
      swalModule.showLoading("Loading...");
      await vi.waitFor(() => expect(mockSwal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: "Loading...",
        allowOutsideClick: false
      })));
      
      // Simulate didOpen
      const fireArgs = mockSwal.fire.mock.calls[0][0];
      fireArgs.didOpen();
      
      expect(mockSwal.showLoading).toHaveBeenCalled();
    });

    it("hideLoading calls Swal close", async () => {
      swalModule.hideLoading();
      await vi.waitFor(() => expect(mockSwal.close).toHaveBeenCalled());
    });
  });
});
