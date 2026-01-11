// Procedural map generation with coherent biomes, oceans, and rivers

import { TerrainTypes } from './terrain.js';

// Map generation styles
export const MapStyles = {
    ISLAND: 'island',
    ARCHIPELAGO: 'archipelago',
    COASTAL: 'coastal',
    CONTINENT: 'continent'
};

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
    generate(cols, rows, style = null) {
        const seed = Math.random() * 10000;

        // Pick random style if not specified
        if (!style) {
            const styles = Object.values(MapStyles);
            style = styles[Math.floor(Math.random() * styles.length)];
        }

        // Generate elevation map based on style
        const elevation = this.generateElevationMap(cols, rows, seed, style);
        const moisture = this.generateMoistureMap(cols, rows, seed);
        const temperature = this.generateTemperatureMap(cols, rows, seed);

        // Create terrain map
        const map = this.generateTerrainFromMaps(cols, rows, elevation, moisture, temperature);

        // Generate rivers (before settlements so we can place near rivers)
        const rivers = this.generateRivers(map, cols, rows, elevation);

        // Place settlements (biased toward water and rivers)
        const settlements = this.placeSettlements(map, cols, rows, rivers, seed);

        // Generate roads between settlements
        const roads = this.generateRoads(map, cols, rows, settlements, rivers);

        return { map, rivers, roads, elevation, style };
    }

    generateElevationMap(cols, rows, seed, style) {
        const elevation = [];

        for (let row = 0; row < rows; row++) {
            elevation[row] = [];
            for (let col = 0; col < cols; col++) {
                const dx = (col - cols/2) / (cols/2);
                const dy = (row - rows/2) / (rows/2);
                const distFromCenter = Math.sqrt(dx*dx + dy*dy);

                // Base noise
                const noise = this.smoothNoise(col, row, 8, seed) * 0.5 +
                              this.smoothNoise(col, row, 4, seed + 100) * 0.3 +
                              this.smoothNoise(col, row, 2, seed + 200) * 0.2;

                let finalElevation;

                switch (style) {
                    case MapStyles.ISLAND:
                        // Single island in center
                        const islandFalloff = Math.max(0, 1 - distFromCenter * 1.1);
                        finalElevation = noise * islandFalloff;
                        break;

                    case MapStyles.ARCHIPELAGO:
                        // Multiple islands using additional noise layer
                        const islandNoise = this.smoothNoise(col * 2, row * 2, 5, seed + 700);
                        const archipelagoBase = noise * 0.6 + islandNoise * 0.4;
                        const edgeFalloff = Math.max(0, 1 - distFromCenter * 0.7);
                        finalElevation = archipelagoBase * edgeFalloff - 0.15;
                        break;

                    case MapStyles.COASTAL:
                        // Land on one side, ocean on other
                        const coastLine = dx + this.smoothNoise(col, row, 6, seed + 800) * 0.4;
                        finalElevation = noise * Math.max(0, Math.min(1, 0.7 - coastLine));
                        break;

                    case MapStyles.CONTINENT:
                        // Large landmass with some coastal ocean
                        const gentleFalloff = Math.max(0, 1 - distFromCenter * 0.5);
                        finalElevation = noise * gentleFalloff + 0.1;
                        break;

                    default:
                        finalElevation = noise;
                }

                elevation[row][col] = Math.max(0, Math.min(1, finalElevation));
            }
        }
        return elevation;
    }

    generateMoistureMap(cols, rows, seed) {
        const moisture = [];
        for (let row = 0; row < rows; row++) {
            moisture[row] = [];
            for (let col = 0; col < cols; col++) {
                moisture[row][col] = this.smoothNoise(col, row, 6, seed + 300) * 0.5 +
                                     this.smoothNoise(col, row, 3, seed + 400) * 0.5;
            }
        }
        return moisture;
    }

    generateTemperatureMap(cols, rows, seed) {
        const temperature = [];
        for (let row = 0; row < rows; row++) {
            temperature[row] = [];
            for (let col = 0; col < cols; col++) {
                temperature[row][col] = this.smoothNoise(col, row, 10, seed + 500);
            }
        }
        return temperature;
    }

    generateTerrainFromMaps(cols, rows, elevation, moisture, temperature) {
        const map = [];
        for (let row = 0; row < rows; row++) {
            map[row] = [];
            for (let col = 0; col < cols; col++) {
                const e = elevation[row][col];
                const m = moisture[row][col];
                const t = temperature[row][col];

                let terrain;

                // All water is now Ocean (no separate Water type)
                if (e < 0.25) {
                    terrain = TerrainTypes.OCEAN;
                } else if (e > 0.65) {
                    terrain = TerrainTypes.MOUNTAINS;
                } else if (t > 0.7 && m < 0.3) {
                    terrain = TerrainTypes.DESERT;
                } else if (e < 0.32 && m > 0.5) {
                    terrain = TerrainTypes.SWAMP;
                } else if (m > 0.55) {
                    terrain = TerrainTypes.FOREST;
                } else if (m > 0.35) {
                    terrain = Math.random() > 0.4 ? TerrainTypes.FOREST : TerrainTypes.PLAINS;
                } else {
                    terrain = t > 0.5 ? TerrainTypes.DESERT : TerrainTypes.PLAINS;
                }

                map[row][col] = terrain;
            }
        }
        return map;
    }

    generateRivers(map, cols, rows, elevation) {
        const rivers = [];

        // Find ALL potential river sources (high elevation land tiles)
        const sources = [];
        for (let row = 2; row < rows - 2; row++) {
            for (let col = 2; col < cols - 2; col++) {
                const e = elevation[row][col];
                const terrain = map[row][col];

                // Rivers can start from any high land (mountains or high ground)
                if (terrain.id !== 'ocean' && e > 0.45) {
                    sources.push({ col, row, elevation: e });
                }
            }
        }

        if (sources.length === 0) return rivers;

        // Sort by elevation (highest first) and pick several
        sources.sort((a, b) => b.elevation - a.elevation);
        const numRivers = Math.min(5, Math.max(2, Math.floor(sources.length / 8)));

        // Space out river sources
        const usedSources = new Set();
        const selectedSources = [];

        for (const source of sources) {
            if (selectedSources.length >= numRivers) break;

            // Check distance from other selected sources
            let tooClose = false;
            for (const selected of selectedSources) {
                const dist = Math.sqrt(
                    (source.col - selected.col) ** 2 +
                    (source.row - selected.row) ** 2
                );
                if (dist < 5) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                selectedSources.push(source);
            }
        }

        for (const source of selectedSources) {
            const river = this.traceRiver(map, cols, rows, elevation, source.col, source.row);
            if (river.length >= 3) {
                rivers.push(river);
            }
        }

        return rivers;
    }

    traceRiver(map, cols, rows, elevation, startCol, startRow) {
        const river = [];
        const visited = new Set();
        let col = startCol;
        let row = startRow;
        let prevCol = -1;
        let prevRow = -1;

        for (let step = 0; step < 100; step++) {
            const key = `${col},${row}`;
            if (visited.has(key)) break;
            visited.add(key);

            const terrain = map[row]?.[col];
            if (!terrain) break;

            // Stop at ocean
            if (terrain.id === 'ocean') {
                if (river.length > 0) {
                    const entryEdge = this.hexGrid.getEdgeToNeighbor(col, row, prevCol, prevRow);
                    river.push({ col, row, entryEdge, exitEdge: -1 });
                }
                break;
            }

            // Find lowest neighbor
            const neighbors = this.hexGrid.getNeighbors(col, row);
            let lowestNeighbor = null;
            let lowestElevation = elevation[row][col] + 0.01; // Slight bias to continue

            neighbors.forEach((n, idx) => {
                if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols) {
                    if (n.col === prevCol && n.row === prevRow) return;

                    const nElev = elevation[n.row][n.col];
                    const nTerrain = map[n.row][n.col];

                    // Strong preference for ocean
                    const effectiveElev = nTerrain.id === 'ocean' ? -1 : nElev;

                    if (effectiveElev < lowestElevation) {
                        lowestElevation = effectiveElev;
                        lowestNeighbor = { ...n, edgeIdx: idx };
                    }
                }
            });

            if (!lowestNeighbor) break;

            const entryEdge = prevCol >= 0
                ? this.hexGrid.getEdgeToNeighbor(col, row, prevCol, prevRow)
                : -1;
            const exitEdge = lowestNeighbor.edgeIdx;

            river.push({ col, row, entryEdge, exitEdge });

            prevCol = col;
            prevRow = row;
            col = lowestNeighbor.col;
            row = lowestNeighbor.row;
        }

        return river;
    }

    generateRoads(map, cols, rows, settlements, rivers) {
        const roads = [];
        if (settlements.length < 2) return roads;

        // Create river lookup for pathfinding cost
        const riverTiles = new Set();
        rivers.forEach(river => {
            river.forEach(segment => {
                riverTiles.add(`${segment.col},${segment.row}`);
            });
        });

        const connected = new Set();

        for (const settlement of settlements) {
            let nearest = null;
            let nearestDist = Infinity;

            for (const other of settlements) {
                if (other === settlement) continue;
                const pairKey = [settlement, other].sort((a, b) =>
                    a.col * 1000 + a.row - (b.col * 1000 + b.row)
                ).map(s => `${s.col},${s.row}`).join('-');

                if (connected.has(pairKey)) continue;

                const dist = Math.sqrt(
                    (settlement.col - other.col) ** 2 +
                    (settlement.row - other.row) ** 2
                );

                if (dist < nearestDist && dist < 20) {
                    nearestDist = dist;
                    nearest = { settlement: other, pairKey };
                }
            }

            if (nearest) {
                const road = this.findPath(map, cols, rows, riverTiles,
                    settlement.col, settlement.row,
                    nearest.settlement.col, nearest.settlement.row);
                if (road.length > 0) {
                    roads.push(road);
                    connected.add(nearest.pairKey);
                }
            }
        }

        return roads;
    }

    findPath(map, cols, rows, riverTiles, startCol, startRow, endCol, endRow) {
        const openSet = [{ col: startCol, row: startRow, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        const gScores = {};
        gScores[`${startCol},${startRow}`] = 0;

        const heuristic = (col, row) => Math.sqrt((col - endCol) ** 2 + (row - endRow) ** 2);

        const getMoveCost = (col, row) => {
            const terrain = map[row]?.[col];
            if (!terrain) return Infinity;
            if (terrain.id === 'ocean') return Infinity;
            if (terrain.id === 'mountains') return 5;
            if (terrain.id === 'forest') return 2;
            if (terrain.id === 'swamp') return 3;
            // Roads crossing rivers have extra cost (need bridge)
            if (riverTiles.has(`${col},${row}`)) return 2;
            return 1;
        };

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (current.col === endCol && current.row === endRow) {
                const path = [];
                let node = current;
                while (node.parent) {
                    const entryEdge = this.hexGrid.getEdgeToNeighbor(
                        node.col, node.row, node.parent.col, node.parent.row
                    );
                    path.unshift({ col: node.col, row: node.row, entryEdge, exitEdge: -1 });
                    node = node.parent;
                }
                for (let i = 0; i < path.length - 1; i++) {
                    path[i].exitEdge = this.hexGrid.getEdgeToNeighbor(
                        path[i].col, path[i].row, path[i+1].col, path[i+1].row
                    );
                }
                return path;
            }

            closedSet.add(`${current.col},${current.row}`);

            const neighbors = this.hexGrid.getNeighbors(current.col, current.row);
            for (const neighbor of neighbors) {
                const key = `${neighbor.col},${neighbor.row}`;
                if (closedSet.has(key)) continue;
                if (neighbor.row < 0 || neighbor.row >= rows ||
                    neighbor.col < 0 || neighbor.col >= cols) continue;

                const moveCost = getMoveCost(neighbor.col, neighbor.row);
                if (moveCost === Infinity) continue;

                const tentativeG = current.g + moveCost;

                if (gScores[key] === undefined || tentativeG < gScores[key]) {
                    gScores[key] = tentativeG;
                    const h = heuristic(neighbor.col, neighbor.row);
                    const newNode = {
                        col: neighbor.col,
                        row: neighbor.row,
                        g: tentativeG,
                        h: h,
                        f: tentativeG + h,
                        parent: current
                    };

                    const existing = openSet.findIndex(n => n.col === neighbor.col && n.row === neighbor.row);
                    if (existing >= 0) {
                        openSet[existing] = newNode;
                    } else {
                        openSet.push(newNode);
                    }
                }
            }
        }

        return [];
    }

    placeSettlements(map, cols, rows, rivers, seed) {
        const settlements = [];

        // Create sets for quick lookup
        const coastalTiles = new Set();
        const riverTiles = new Set();

        // Find coastal tiles (land adjacent to ocean)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (map[row][col].id !== 'ocean') {
                    const neighbors = this.hexGrid.getNeighbors(col, row);
                    const nearOcean = neighbors.some(n =>
                        n.row >= 0 && n.row < rows &&
                        n.col >= 0 && n.col < cols &&
                        map[n.row][n.col]?.id === 'ocean'
                    );
                    if (nearOcean) {
                        coastalTiles.add(`${col},${row}`);
                    }
                }
            }
        }

        // Mark river tiles
        rivers.forEach(river => {
            river.forEach(segment => {
                riverTiles.add(`${segment.col},${segment.row}`);
                // Also mark neighbors as "near river"
                const neighbors = this.hexGrid.getNeighbors(segment.col, segment.row);
                neighbors.forEach(n => {
                    if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols) {
                        if (map[n.row][n.col]?.id !== 'ocean') {
                            riverTiles.add(`${n.col},${n.row}`);
                        }
                    }
                });
            });
        });

        // Place castles (prefer central, near water)
        const numCastles = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numCastles; i++) {
            const castle = this.findSettlementLocation(map, cols, rows, settlements, true, coastalTiles, riverTiles);
            if (castle) {
                map[castle.row][castle.col] = TerrainTypes.CASTLE;
                settlements.push({ ...castle, type: 'castle' });
            }
        }

        // Place villages (strongly prefer water)
        const numVillages = Math.floor(cols * rows * 0.02) + 3;
        for (let i = 0; i < numVillages; i++) {
            const village = this.findSettlementLocation(map, cols, rows, settlements, false, coastalTiles, riverTiles);
            if (village) {
                map[village.row][village.col] = TerrainTypes.VILLAGE;
                settlements.push({ ...village, type: 'village' });
            }
        }

        return settlements;
    }

    findSettlementLocation(map, cols, rows, existing, isCastle, coastalTiles, riverTiles) {
        const maxAttempts = 100;

        // Collect all valid candidates
        const candidates = [];

        for (let row = 2; row < rows - 2; row++) {
            for (let col = 2; col < cols - 2; col++) {
                const terrain = map[row][col];
                if (terrain.id !== 'plains' && terrain.id !== 'forest') continue;

                // Check distance from existing settlements
                const minDistance = isCastle ? 8 : 4;
                let tooClose = false;
                for (const s of existing) {
                    const dist = Math.sqrt((s.col - col) ** 2 + (s.row - row) ** 2);
                    if (dist < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;

                // Calculate desirability score
                let score = 1;
                const key = `${col},${row}`;

                // Strong preference for coastal locations
                if (coastalTiles.has(key)) {
                    score += 5;
                }

                // Strong preference for river locations
                if (riverTiles.has(key)) {
                    score += 4;
                }

                // Castles prefer somewhat central locations
                if (isCastle) {
                    const centerDist = Math.sqrt(
                        ((col - cols/2) / cols) ** 2 +
                        ((row - rows/2) / rows) ** 2
                    );
                    score += Math.max(0, 2 - centerDist * 4);
                }

                candidates.push({ col, row, score });
            }
        }

        if (candidates.length === 0) return null;

        // Weighted random selection based on score
        const totalScore = candidates.reduce((sum, c) => sum + c.score, 0);
        let random = Math.random() * totalScore;

        for (const candidate of candidates) {
            random -= candidate.score;
            if (random <= 0) {
                return { col: candidate.col, row: candidate.row };
            }
        }

        return candidates[0];
    }
}
