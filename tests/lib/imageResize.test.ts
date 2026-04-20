import { describe, it, expect, vi, beforeEach } from "vitest";

describe("lib/imageResize", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.URL, "createObjectURL").mockReturnValue("blob:test-url");
    vi.spyOn(globalThis.URL, "revokeObjectURL").mockImplementation(() => {});
  });

  it("exports resizeToSquare and resizeFileToSquare functions", async () => {
    const { resizeToSquare, resizeFileToSquare } = await import("@/lib/imageResize");
    expect(typeof resizeToSquare).toBe("function");
    expect(typeof resizeFileToSquare).toBe("function");
  });

  // Note: Testing Canvas API in jsdom is notoriously difficult/limited. 
  // We'll create basic tests to ensure the module loads and the structure is sound.
  
  it("rejects if canvas is not supported", async () => {
    const { resizeToSquare } = await import("@/lib/imageResize");
    
    // Mock document.createElement to return a canvas without getContext
    const origCreateElement = document.createElement;
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        return { getContext: () => null } as unknown as HTMLCanvasElement;
      }
      return origCreateElement.call(document, tagName);
    });

    const file = new File(["fake-image-data"], "test.png", { type: "image/png" });
    
    // We need to trigger the Image onload manually since we're in jsdom
    const origImage = globalThis.Image;
    globalThis.Image = class {
      onload?: () => void;
      onerror?: () => void;
      src = "";
      naturalWidth = 1000;
      naturalHeight = 800;
      
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    } as any;

    await expect(resizeToSquare(file)).rejects.toThrow("Canvas not supported");
    
    // Restore mocks
    vi.restoreAllMocks();
    globalThis.Image = origImage;
  });
});
