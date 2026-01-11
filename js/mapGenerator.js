// Procedural map generation with coherent biomes

import { TerrainTypes, getRandomTerrain } from './terrain.js';

export class MapGenerator {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;
    }

    // Simple noise function for terrain clustering
    noise2D(x, y, seed = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
    }

    // Smoothed noise for more natural terrain
    smoothNoise(x, y, scale, seed) {
        const sx = x / scale;
        const sy = y / scale;

        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;

        // Smooth interpolation
        const sfx = fx * fx * (3 - 2 * fx);
        const sfy = fy * fy * (3 - 2 * fy);

        const n00 = this.noise2D(x0, y0, seed);
        const n10 = this.noise2D(x1, y0, seed);
        const n01 = this.noise2D(x0, y1, seed);
        const n11 = this.noise2D(x1, y1, seed);

        const n0 = n00 * (1 - sfx) + n10 * sfx;
        const n1 = n01 * (1 - sfx) + n11 * sfx;

        return n0 * (1 - sfy) + n1 * sfy;
    }

    // Generate a complete map
    generate(cols, rows) {
        const map = [];
        const seed = Math.random() * 10000;

        // First pass: generate base terrain using noise
        for (let row = 0; row < rows; row++) {
            map[row] = [];
            for (let col = 0; col < cols; col++) {
                // Use multiple noise octaves for varied terrain
                const elevation = this.smoothNoise(col, row, 8, seed) * 0.5 +
                                  this.smoothNoise(col, row, 4, seed + 100) * 0.3 +
                                  this.smoothNoise(col, row, 2, seed + 200) * 0.2;

                const moisture = this.smoothNoise(col, row, 6, seed + 300) * 0.5 +
                                 this.smoothNoise(col, row, 3, seed + 400) * 0.5;

                const temperature = this.smoothNoise(col, row, 10, seed + 500);

                // Determine terrain based on elevation, moisture, temperature
                let terrain;

                if (elevation < 0.3) {
                    // Low elevation - water or swamp
                    terrain = moisture > 0.5 ? TerrainTypes.SWAMP : TerrainTypes.WATER;
                } else if (elevation > 0.75) {
                    // High elevation - mountains
                    terrain = TerrainTypes.MOUNTAINS;
                } else if (temperature > 0.7 && moisture < 0.3) {
                    // Hot and dry - desert
                    terrain = TerrainTypes.DESERT;
                } else if (moisture > 0.6) {
                    // Wet - forest or swamp
                    terrain = elevation < 0.4 ? TerrainTypes.SWAMP : TerrainTypes.FOREST;
                } else if (moisture > 0.35) {
                    // Moderate moisture - forest or plains
                    terrain = Math.random() > 0.4 ? TerrainTypes.FOREST : TerrainTypes.PLAINS;
                } else {
                    // Dry - plains or desert
                    terrain = temperature > 0.5 ? TerrainTypes.DESERT : TerrainTypes.PLAINS;
                }

                map[row][col] = terrain;
            }
        }

        // Second pass: place settlements
        this.placeSettlements(map, cols, rows, seed);

        return map;
    }

    // Place castles and villages in suitable locations
    placeSettlements(map, cols, rows, seed) {
        const settlements = [];

        // Place 1-3 castles in suitable locations
        const numCastles = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numCastles; i++) {
            const castle = this.findSettlementLocation(map, cols, rows, settlements, true);
            if (castle) {
                map[castle.row][castle.col] = TerrainTypes.CASTLE;
                settlements.push(castle);
            }
        }

        // Place villages (more common, near water or plains)
        const numVillages = Math.floor(cols * rows * 0.03) + 2; // ~3% of map + 2
        for (let i = 0; i < numVillages; i++) {
            const village = this.findSettlementLocation(map, cols, rows, settlements, false);
            if (village) {
                map[village.row][village.col] = TerrainTypes.VILLAGE;
                settlements.push(village);
            }
        }
    }

    // Find a good location for a settlement
    findSettlementLocation(map, cols, rows, existing, isCastle) {
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const col = Math.floor(Math.random() * (cols - 2)) + 1;
            const row = Math.floor(Math.random() * (rows - 2)) + 1;

            // Check if terrain is suitable (plains or forest)
            const currentTerrain = map[row][col];
            if (currentTerrain.id !== 'plains' && currentTerrain.id !== 'forest') {
                continue;
            }

            // Check distance from other settlements
            const minDistance = isCastle ? 6 : 3;
            let tooClose = false;
            for (const s of existing) {
                const dist = Math.sqrt((s.col - col) ** 2 + (s.row - row) ** 2);
                if (dist < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            // Castles prefer central locations with good visibility
            if (isCastle) {
                const centerDist = Math.sqrt(
                    ((col - cols/2) / cols) ** 2 +
                    ((row - rows/2) / rows) ** 2
                );
                if (centerDist > 0.35 && Math.random() > 0.3) continue;
            }

            // Villages prefer to be near water
            if (!isCastle) {
                const neighbors = this.hexGrid.getNeighbors(col, row);
                const nearWater = neighbors.some(n =>
                    n.row >= 0 && n.row < rows &&
                    n.col >= 0 && n.col < cols &&
                    map[n.row][n.col]?.id === 'water'
                );
                if (!nearWater && Math.random() > 0.4) continue;
            }

            return { col, row };
        }

        return null;
    }
}
