// Procedural map generation with coherent biomes, oceans, and rivers

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
        const seed = Math.random() * 10000;

        // Generate elevation map first (we'll use this for terrain AND rivers)
        const elevation = this.generateElevationMap(cols, rows, seed);
        const moisture = this.generateMoistureMap(cols, rows, seed);
        const temperature = this.generateTemperatureMap(cols, rows, seed);

        // Create terrain map
        const map = this.generateTerrainFromMaps(cols, rows, elevation, moisture, temperature);

        // Add ocean around edges
        this.addOceans(map, cols, rows, elevation);

        // Generate rivers (flowing from high to low elevation)
        const rivers = this.generateRivers(map, cols, rows, elevation);

        // Place settlements
        const settlements = this.placeSettlements(map, cols, rows, seed);

        // Generate roads between settlements
        const roads = this.generateRoads(map, cols, rows, settlements, elevation);

        return { map, rivers, roads, elevation };
    }

    generateElevationMap(cols, rows, seed) {
        const elevation = [];
        for (let row = 0; row < rows; row++) {
            elevation[row] = [];
            for (let col = 0; col < cols; col++) {
                // Distance from center affects base elevation (island-like)
                const dx = (col - cols/2) / (cols/2);
                const dy = (row - rows/2) / (rows/2);
                const distFromCenter = Math.sqrt(dx*dx + dy*dy);
                const edgeFalloff = Math.max(0, 1 - distFromCenter * 0.8);

                const noise = this.smoothNoise(col, row, 8, seed) * 0.5 +
                              this.smoothNoise(col, row, 4, seed + 100) * 0.3 +
                              this.smoothNoise(col, row, 2, seed + 200) * 0.2;

                elevation[row][col] = noise * edgeFalloff;
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

                if (e < 0.2) {
                    terrain = TerrainTypes.WATER;
                } else if (e < 0.28) {
                    terrain = m > 0.5 ? TerrainTypes.SWAMP : TerrainTypes.WATER;
                } else if (e > 0.7) {
                    terrain = TerrainTypes.MOUNTAINS;
                } else if (t > 0.7 && m < 0.3) {
                    terrain = TerrainTypes.DESERT;
                } else if (m > 0.6) {
                    terrain = e < 0.35 ? TerrainTypes.SWAMP : TerrainTypes.FOREST;
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

    addOceans(map, cols, rows, elevation) {
        // Convert water tiles near edges to ocean
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isEdge = col === 0 || col === cols - 1 || row === 0 || row === rows - 1;
                const nearEdge = col <= 2 || col >= cols - 3 || row <= 2 || row >= rows - 3;

                if (isEdge || (nearEdge && elevation[row][col] < 0.25)) {
                    map[row][col] = TerrainTypes.OCEAN;
                } else if (map[row][col].id === 'water') {
                    // Check if connected to edge water (flood fill would be better but this is simpler)
                    const neighbors = this.hexGrid.getNeighbors(col, row);
                    const hasOceanNeighbor = neighbors.some(n =>
                        n.row >= 0 && n.row < rows &&
                        n.col >= 0 && n.col < cols &&
                        map[n.row]?.[n.col]?.id === 'ocean'
                    );
                    if (hasOceanNeighbor && elevation[row][col] < 0.22) {
                        map[row][col] = TerrainTypes.OCEAN;
                    }
                }
            }
        }

        // Second pass to expand ocean
        for (let pass = 0; pass < 2; pass++) {
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (map[row][col].id === 'water' && elevation[row][col] < 0.23) {
                        const neighbors = this.hexGrid.getNeighbors(col, row);
                        const oceanNeighbors = neighbors.filter(n =>
                            n.row >= 0 && n.row < rows &&
                            n.col >= 0 && n.col < cols &&
                            map[n.row]?.[n.col]?.id === 'ocean'
                        ).length;
                        if (oceanNeighbors >= 2) {
                            map[row][col] = TerrainTypes.OCEAN;
                        }
                    }
                }
            }
        }
    }

    generateRivers(map, cols, rows, elevation) {
        const rivers = []; // Array of river paths, each path is array of {col, row, entryEdge, exitEdge}

        // Find good river sources (high elevation, not too close to edges)
        const sources = [];
        for (let row = 3; row < rows - 3; row++) {
            for (let col = 3; col < cols - 3; col++) {
                if (elevation[row][col] > 0.55 && elevation[row][col] < 0.75) {
                    // Check it's on or near mountains
                    if (map[row][col].id === 'mountains' ||
                        this.hexGrid.getNeighbors(col, row).some(n =>
                            n.row >= 0 && n.row < rows &&
                            n.col >= 0 && n.col < cols &&
                            map[n.row]?.[n.col]?.id === 'mountains'
                        )) {
                        sources.push({ col, row, elevation: elevation[row][col] });
                    }
                }
            }
        }

        // Sort by elevation and pick top few
        sources.sort((a, b) => b.elevation - a.elevation);
        const numRivers = Math.min(3, Math.max(1, Math.floor(sources.length / 3)));

        for (let i = 0; i < numRivers; i++) {
            if (sources[i]) {
                const river = this.traceRiver(map, cols, rows, elevation, sources[i].col, sources[i].row);
                if (river.length > 3) {
                    rivers.push(river);
                }
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

        for (let step = 0; step < 50; step++) {
            const key = `${col},${row}`;
            if (visited.has(key)) break;
            visited.add(key);

            const terrain = map[row]?.[col];
            if (!terrain) break;

            // Stop at ocean or water
            if (terrain.id === 'ocean' || terrain.id === 'water') {
                // Add final segment entering water
                if (river.length > 0) {
                    const entryEdge = this.hexGrid.getEdgeToNeighbor(col, row, prevCol, prevRow);
                    river.push({ col, row, entryEdge, exitEdge: -1 });
                }
                break;
            }

            // Find lowest neighbor
            const neighbors = this.hexGrid.getNeighbors(col, row);
            let lowestNeighbor = null;
            let lowestElevation = elevation[row][col];

            neighbors.forEach((n, idx) => {
                if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols) {
                    // Don't go back
                    if (n.col === prevCol && n.row === prevRow) return;

                    const nElev = elevation[n.row][n.col];
                    // Prefer lower elevation, or water/ocean
                    const nTerrain = map[n.row][n.col];
                    const effectiveElev = (nTerrain.id === 'water' || nTerrain.id === 'ocean')
                        ? -1
                        : nElev;

                    if (effectiveElev < lowestElevation) {
                        lowestElevation = effectiveElev;
                        lowestNeighbor = { ...n, edgeIdx: idx };
                    }
                }
            });

            if (!lowestNeighbor) break;

            // Record this river segment
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

    generateRoads(map, cols, rows, settlements, elevation) {
        const roads = [];

        if (settlements.length < 2) return roads;

        // Connect each settlement to its nearest neighbor(s)
        const connected = new Set();

        for (const settlement of settlements) {
            // Find nearest unconnected settlement
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

                if (dist < nearestDist && dist < 15) {
                    nearestDist = dist;
                    nearest = { settlement: other, pairKey };
                }
            }

            if (nearest) {
                const road = this.findPath(map, cols, rows, elevation,
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

    findPath(map, cols, rows, elevation, startCol, startRow, endCol, endRow) {
        // Simple A* pathfinding
        const openSet = [{ col: startCol, row: startRow, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        const gScores = {};
        gScores[`${startCol},${startRow}`] = 0;

        const heuristic = (col, row) => {
            return Math.sqrt((col - endCol) ** 2 + (row - endRow) ** 2);
        };

        const getMoveCost = (col, row) => {
            const terrain = map[row]?.[col];
            if (!terrain) return Infinity;
            if (terrain.id === 'water' || terrain.id === 'ocean') return Infinity;
            if (terrain.id === 'mountains') return 5;
            if (terrain.id === 'forest') return 2;
            if (terrain.id === 'swamp') return 3;
            return 1;
        };

        while (openSet.length > 0) {
            // Find lowest f score
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (current.col === endCol && current.row === endRow) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node.parent) {
                    const entryEdge = this.hexGrid.getEdgeToNeighbor(
                        node.col, node.row, node.parent.col, node.parent.row
                    );
                    const exitEdge = node.next
                        ? this.hexGrid.getEdgeToNeighbor(node.col, node.row, node.next.col, node.next.row)
                        : -1;
                    path.unshift({ col: node.col, row: node.row, entryEdge, exitEdge });
                    node = node.parent;
                }
                // Fix exit edges
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

        return []; // No path found
    }

    placeSettlements(map, cols, rows, seed) {
        const settlements = [];

        // Place 1-3 castles
        const numCastles = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numCastles; i++) {
            const castle = this.findSettlementLocation(map, cols, rows, settlements, true);
            if (castle) {
                map[castle.row][castle.col] = TerrainTypes.CASTLE;
                settlements.push({ ...castle, type: 'castle' });
            }
        }

        // Place villages
        const numVillages = Math.floor(cols * rows * 0.025) + 2;
        for (let i = 0; i < numVillages; i++) {
            const village = this.findSettlementLocation(map, cols, rows, settlements, false);
            if (village) {
                map[village.row][village.col] = TerrainTypes.VILLAGE;
                settlements.push({ ...village, type: 'village' });
            }
        }

        return settlements;
    }

    findSettlementLocation(map, cols, rows, existing, isCastle) {
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const col = Math.floor(Math.random() * (cols - 4)) + 2;
            const row = Math.floor(Math.random() * (rows - 4)) + 2;

            const currentTerrain = map[row][col];
            if (currentTerrain.id !== 'plains' && currentTerrain.id !== 'forest') {
                continue;
            }

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

            if (isCastle) {
                const centerDist = Math.sqrt(
                    ((col - cols/2) / cols) ** 2 +
                    ((row - rows/2) / rows) ** 2
                );
                if (centerDist > 0.35 && Math.random() > 0.3) continue;
            }

            if (!isCastle) {
                const neighbors = this.hexGrid.getNeighbors(col, row);
                const nearWater = neighbors.some(n =>
                    n.row >= 0 && n.row < rows &&
                    n.col >= 0 && n.col < cols &&
                    (map[n.row][n.col]?.id === 'water' || map[n.row][n.col]?.id === 'ocean')
                );
                if (!nearWater && Math.random() > 0.5) continue;
            }

            return { col, row };
        }

        return null;
    }
}
