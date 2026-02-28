export type GachaTier = "common" | "rare" | "epic" | "legendary";
export type TileType = "start" | "selector" | GachaTier;

export interface GachaProductLite {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    tier: GachaTier;
}

export interface Tile {
    row: number;
    col: number;
    type: TileType;
    side?: "left" | "right";
    label?: string;
    product?: GachaProductLite;
}

export const GRID_DEFINITION: TileType[][] = [
    ["start"],
    ["selector", "selector"],
    ["selector", "common", "selector"],
    ["selector", "common", "common", "selector"],
    ["selector", "common", "rare", "common", "selector"],
    ["common", "rare", "rare", "common"],
    ["rare", "epic", "rare"],
    ["epic", "epic"],
    ["legendary"],
];

export const SELECTOR_PATHS: Record<string, [number, number][]> = {
    R4: [
        [5, 3],
        [6, 2],
        [7, 1],
        [8, 0],
    ],
    R3: [
        [4, 3],
        [5, 2],
        [6, 1],
        [7, 0],
    ],
    R2: [
        [3, 2],
        [4, 2],
        [5, 1],
        [6, 0],
    ],
    R1: [
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 0],
    ],
    L4: [
        [5, 0],
        [6, 0],
        [7, 0],
        [8, 0],
    ],
    L3: [
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
    ],
    L2: [
        [3, 1],
        [4, 2],
        [5, 2],
        [6, 2],
    ],
    L1: [
        [2, 1],
        [3, 2],
        [4, 3],
        [5, 3],
    ],
};

function getSelectorSide(_row: number, col: number, rowSize: number): "left" | "right" {
    return col < rowSize / 2 ? "left" : "right";
}

export function findTileIndex(tiles: Tile[], row: number, col: number): number {
    return tiles.findIndex((t) => t.row === row && t.col === col);
}

export function buildGrid(products: GachaProductLite[]): Tile[] {
    const tiles: Tile[] = [];
    const byTier: Record<GachaTier, GachaProductLite[]> = {
        common: products.filter((p) => p.tier === "common"),
        rare: products.filter((p) => p.tier === "rare"),
        epic: products.filter((p) => p.tier === "epic"),
        legendary: products.filter((p) => p.tier === "legendary"),
    };

    // No fallback: each tier only fills tiles of its own type.
    // If a tier has no rewards, those tiles remain empty (no product).
    const fillPool = (tier: GachaTier): GachaProductLite[] => byTier[tier];

    const tierIndex: Record<GachaTier, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };

    let leftCount = 0;
    let rightCount = 0;

    for (let row = 0; row < GRID_DEFINITION.length; row++) {
        const rowDef = GRID_DEFINITION[row];
        for (let col = 0; col < rowDef.length; col++) {
            const type = rowDef[col];
            const tile: Tile = { row, col, type };

            if (type === "selector") {
                tile.side = getSelectorSide(row, col, rowDef.length);
                if (tile.side === "left") {
                    leftCount++;
                    tile.label = `L${leftCount}`;
                } else {
                    rightCount++;
                    tile.label = `R${rightCount}`;
                }
            }

            if (type === "common" || type === "rare" || type === "epic" || type === "legendary") {
                const pool = fillPool(type);
                if (pool.length > 0) {
                    // Cycle through pool using modulo so every tile gets a product
                    tile.product = pool[tierIndex[type] % pool.length];
                    tierIndex[type]++;
                }
            }

            tiles.push(tile);
        }
    }

    return tiles;
}

export function getValidSelectors(tiles: Tile[]): string[] {
    const selectorTiles = tiles.filter((t) => t.type === "selector" && t.label);

    return selectorTiles
        .map((t) => t.label!)
        .filter((label) => {
            const path = SELECTOR_PATHS[label] || [];
            return path.some(([r, c]) => {
                const idx = findTileIndex(tiles, r, c);
                return idx >= 0 && !!tiles[idx].product;
            });
        });
}

export function getPathItemProductIds(tiles: Tile[], selectorLabel: string): string[] {
    const path = SELECTOR_PATHS[selectorLabel] || [];
    const ids: string[] = [];

    for (const [r, c] of path) {
        const idx = findTileIndex(tiles, r, c);
        if (idx >= 0 && tiles[idx].product?.id) {
            ids.push(tiles[idx].product!.id);
        }
    }

    return ids;
}

// --- Two-diagonal intersection mechanic ---

/**
 * Pre-computed intersection tile for every (L, R) pair.
 * L path goes top-left → bottom-right; R path goes top-right → bottom-left.
 * The cell listed here is the one tile shared by both paths.
 */
export const INTERSECTION_MAP: Record<string, Record<string, [number, number]>> = {
    L1: { R1: [2, 1], R2: [3, 2], R3: [4, 3], R4: [5, 3] },
    L2: { R1: [3, 1], R2: [4, 2], R3: [5, 2], R4: [6, 2] },
    L3: { R1: [4, 1], R2: [5, 1], R3: [6, 1], R4: [7, 1] },
    L4: { R1: [5, 0], R2: [6, 0], R3: [7, 0], R4: [8, 0] },
};

/** Returns the tile at the intersection of the chosen L and R diagonal paths. */
export function getIntersectionTile(tiles: Tile[], lLabel: string, rLabel: string): Tile | null {
    const pos = INTERSECTION_MAP[lLabel]?.[rLabel];
    if (!pos) return null;
    const idx = findTileIndex(tiles, pos[0], pos[1]);
    return idx >= 0 ? tiles[idx] : null;
}

/** L selectors that have at least one R partner whose intersection tile has a product. */
export function getValidLSelectors(tiles: Tile[]): string[] {
    return ["L1", "L2", "L3", "L4"].filter((lLabel) =>
        ["R1", "R2", "R3", "R4"].some((rLabel) => {
            const pos = INTERSECTION_MAP[lLabel]?.[rLabel];
            if (!pos) return false;
            const idx = findTileIndex(tiles, pos[0], pos[1]);
            return idx >= 0 && !!tiles[idx].product;
        })
    );
}

/** R selectors whose intersection with the given L tile has a product. */
export function getValidRSelectorsFor(tiles: Tile[], lLabel: string): string[] {
    return ["R1", "R2", "R3", "R4"].filter((rLabel) => {
        const pos = INTERSECTION_MAP[lLabel]?.[rLabel];
        if (!pos) return false;
        const idx = findTileIndex(tiles, pos[0], pos[1]);
        return idx >= 0 && !!tiles[idx].product;
    });
}
