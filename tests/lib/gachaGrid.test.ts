import { describe, it, expect } from "vitest";
import {
  buildGrid,
  findTileIndex,
  GRID_DEFINITION,
  SELECTOR_PATHS,
  INTERSECTION_MAP,
  type GachaProductLite,
} from "@/lib/gachaGrid";

describe("gachaGrid utilities", () => {
  describe("GRID_DEFINITION", () => {
    it("has 9 rows", () => {
      expect(GRID_DEFINITION.length).toBe(9);
    });

    it("first row is [start]", () => {
      expect(GRID_DEFINITION[0]).toEqual(["start"]);
    });

    it("last row is [legendary]", () => {
      expect(GRID_DEFINITION[8]).toEqual(["legendary"]);
    });
  });

  describe("SELECTOR_PATHS", () => {
    it("has L1-L4 and R1-R4 paths", () => {
      for (const key of ["L1", "L2", "L3", "L4", "R1", "R2", "R3", "R4"]) {
        expect(SELECTOR_PATHS).toHaveProperty(key);
        expect(Array.isArray(SELECTOR_PATHS[key])).toBe(true);
        expect(SELECTOR_PATHS[key].length).toBe(4);
      }
    });
  });

  describe("INTERSECTION_MAP", () => {
    it("maps L/R selector pairs to intersecting tiles", () => {
      expect(INTERSECTION_MAP).toBeDefined();
      expect(typeof INTERSECTION_MAP).toBe("object");
    });
  });

  describe("buildGrid", () => {
    const mockProducts: GachaProductLite[] = [
      { id: "1", name: "Common 1", price: 100, imageUrl: null, tier: "common" },
      { id: "2", name: "Common 2", price: 100, imageUrl: null, tier: "common" },
      { id: "3", name: "Rare 1", price: 500, imageUrl: null, tier: "rare" },
      { id: "4", name: "Epic 1", price: 1000, imageUrl: null, tier: "epic" },
      { id: "5", name: "Legendary 1", price: 5000, imageUrl: null, tier: "legendary" },
    ];

    it("returns an array of tiles", () => {
      const tiles = buildGrid(mockProducts);
      expect(Array.isArray(tiles)).toBe(true);
      expect(tiles.length).toBeGreaterThan(0);
    });

    it("first tile is start type", () => {
      const tiles = buildGrid(mockProducts);
      expect(tiles[0].type).toBe("start");
    });

    it("assigns products to item tiles", () => {
      const tiles = buildGrid(mockProducts);
      const itemTiles = tiles.filter(
        (t) => t.type !== "start" && t.type !== "selector"
      );
      const withProducts = itemTiles.filter((t) => t.product);
      expect(withProducts.length).toBeGreaterThan(0);
    });

    it("tiles have row and col", () => {
      const tiles = buildGrid(mockProducts);
      for (const tile of tiles) {
        expect(typeof tile.row).toBe("number");
        expect(typeof tile.col).toBe("number");
      }
    });

    it("handles empty products array", () => {
      const tiles = buildGrid([]);
      expect(Array.isArray(tiles)).toBe(true);
      const itemTiles = tiles.filter(
        (t) => t.type !== "start" && t.type !== "selector"
      );
      for (const t of itemTiles) {
        expect(t.product).toBeUndefined();
      }
    });
  });

  describe("findTileIndex", () => {
    const mockProducts: GachaProductLite[] = [
      { id: "1", name: "Common 1", price: 100, imageUrl: null, tier: "common" },
    ];

    it("finds tile by row and col", () => {
      const tiles = buildGrid(mockProducts);
      const idx = findTileIndex(tiles, 0, 0);
      expect(idx).toBe(0);
    });

    it("returns -1 for non-existent tile", () => {
      const tiles = buildGrid(mockProducts);
      const idx = findTileIndex(tiles, 99, 99);
      expect(idx).toBe(-1);
    });
  });
});
