// Terrain type definitions with colors and rendering

// Seeded random number generator for consistent per-hex randomization
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Get multiple seeded random numbers from a single seed
function getRandoms(seed, count) {
    const randoms = [];
    for (let i = 0; i < count; i++) {
        randoms.push(seededRandom(seed + i * 127.1));
    }
    return randoms;
}

// Generate random point within hex bounds (flat-top)
function randomHexPoint(cx, cy, size, rand1, rand2, margin = 0.7) {
    // Use rejection sampling within hex
    const angle = rand1 * Math.PI * 2;
    const dist = rand2 * size * margin;
    return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist
    };
}

export const TerrainTypes = {
    PLAINS: {
        id: 'plains',
        name: 'Plains',
        baseColor: '#7cb342',
        accentColor: '#8bc34a',
        borderColor: '#558b2f',
        weight: 30,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 30);
            ctx.strokeStyle = '#558b2f';
            ctx.lineWidth = 1.5;

            // Scatter grass tufts across the hex
            const numTufts = 6 + Math.floor(randoms[0] * 4);
            for (let i = 0; i < numTufts; i++) {
                const ri = i * 3;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.65);
                const tuftHeight = 4 + randoms[ri + 3] * 4;

                // Left blade
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.quadraticCurveTo(pos.x - 2, pos.y - tuftHeight * 0.6, pos.x - 1, pos.y - tuftHeight);
                ctx.stroke();

                // Right blade
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.quadraticCurveTo(pos.x + 2, pos.y - tuftHeight * 0.6, pos.x + 2, pos.y - tuftHeight * 0.9);
                ctx.stroke();
            }
        }
    },

    FOREST: {
        id: 'forest',
        name: 'Forest',
        baseColor: '#2e7d32',
        accentColor: '#388e3c',
        borderColor: '#1b5e20',
        weight: 25,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 25);

            // Scatter trees across the hex
            const numTrees = 3 + Math.floor(randoms[0] * 3);
            const trees = [];

            for (let i = 0; i < numTrees; i++) {
                const ri = i * 4;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.55);
                const treeSize = 0.7 + randoms[ri + 3] * 0.5;
                trees.push({ ...pos, size: treeSize, depth: pos.y });
            }

            // Sort by y for depth ordering
            trees.sort((a, b) => a.depth - b.depth);

            trees.forEach(tree => {
                const tx = tree.x;
                const ty = tree.y;
                const ts = tree.size;

                // Trunk
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(tx - 2 * ts, ty + 2 * ts, 4 * ts, 6 * ts);

                // Foliage layers
                ctx.fillStyle = '#1b5e20';
                ctx.beginPath();
                ctx.moveTo(tx, ty - 10 * ts);
                ctx.lineTo(tx - 8 * ts, ty + 2 * ts);
                ctx.lineTo(tx + 8 * ts, ty + 2 * ts);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#2e7d32';
                ctx.beginPath();
                ctx.moveTo(tx, ty - 6 * ts);
                ctx.lineTo(tx - 6 * ts, ty + 4 * ts);
                ctx.lineTo(tx + 6 * ts, ty + 4 * ts);
                ctx.closePath();
                ctx.fill();
            });
        }
    },

    MOUNTAINS: {
        id: 'mountains',
        name: 'Mountains',
        baseColor: '#78909c',
        accentColor: '#90a4ae',
        borderColor: '#546e7a',
        weight: 15,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 15);

            // Back mountains (smaller, darker)
            const numBack = 1 + Math.floor(randoms[0] * 2);
            for (let i = 0; i < numBack; i++) {
                const ox = (randoms[i + 1] - 0.5) * size * 0.8;
                const oy = (randoms[i + 2] - 0.5) * size * 0.3;
                const mw = 10 + randoms[i + 3] * 8;
                const mh = 8 + randoms[i + 4] * 6;

                ctx.fillStyle = '#546e7a';
                ctx.beginPath();
                ctx.moveTo(cx + ox - mw, cy + oy + 8);
                ctx.lineTo(cx + ox, cy + oy - mh);
                ctx.lineTo(cx + ox + mw, cy + oy + 8);
                ctx.closePath();
                ctx.fill();
            }

            // Main mountain
            const mainOx = (randoms[6] - 0.5) * size * 0.2;
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(cx + mainOx - 15, cy + 10);
            ctx.lineTo(cx + mainOx, cy - 14);
            ctx.lineTo(cx + mainOx + 15, cy + 10);
            ctx.closePath();
            ctx.fill();

            // Snow cap
            ctx.fillStyle = '#eceff1';
            ctx.beginPath();
            ctx.moveTo(cx + mainOx, cy - 14);
            ctx.lineTo(cx + mainOx - 5, cy - 5);
            ctx.lineTo(cx + mainOx - 2, cy - 5);
            ctx.lineTo(cx + mainOx, cy - 7);
            ctx.lineTo(cx + mainOx + 2, cy - 5);
            ctx.lineTo(cx + mainOx + 5, cy - 5);
            ctx.closePath();
            ctx.fill();
        }
    },

    WATER: {
        id: 'water',
        name: 'Water',
        baseColor: '#1976d2',
        accentColor: '#2196f3',
        borderColor: '#0d47a1',
        weight: 15,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 20);
            ctx.strokeStyle = '#64b5f6';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Scatter waves across the hex
            const numWaves = 3 + Math.floor(randoms[0] * 3);
            for (let i = 0; i < numWaves; i++) {
                const ri = i * 3;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.5);
                const waveWidth = 8 + randoms[ri + 3] * 10;

                ctx.beginPath();
                ctx.moveTo(pos.x - waveWidth/2, pos.y);
                ctx.quadraticCurveTo(pos.x - waveWidth/4, pos.y - 3, pos.x, pos.y);
                ctx.quadraticCurveTo(pos.x + waveWidth/4, pos.y + 3, pos.x + waveWidth/2, pos.y);
                ctx.stroke();
            }
        }
    },

    OCEAN: {
        id: 'ocean',
        name: 'Ocean',
        baseColor: '#0d47a1',
        accentColor: '#1565c0',
        borderColor: '#0a3d91',
        weight: 0, // Only placed by generator
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 15);
            ctx.strokeStyle = '#1976d2';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';

            // Gentle ocean waves
            const numWaves = 2 + Math.floor(randoms[0] * 2);
            for (let i = 0; i < numWaves; i++) {
                const ri = i * 3;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.5);
                const waveWidth = 12 + randoms[ri + 3] * 8;

                ctx.beginPath();
                ctx.moveTo(pos.x - waveWidth/2, pos.y);
                ctx.quadraticCurveTo(pos.x, pos.y - 2, pos.x + waveWidth/2, pos.y);
                ctx.stroke();
            }
        }
    },

    CASTLE: {
        id: 'castle',
        name: 'Castle',
        baseColor: '#8d6e63',
        accentColor: '#a1887f',
        borderColor: '#6d4c41',
        weight: 2,
        render: (ctx, cx, cy, size, seed) => {
            // Castle is always centered
            ctx.fillStyle = '#5d4037';
            // Main wall
            ctx.fillRect(cx - 12, cy - 2, 24, 14);
            // Towers
            ctx.fillRect(cx - 14, cy - 8, 8, 20);
            ctx.fillRect(cx + 6, cy - 8, 8, 20);
            // Battlements
            ctx.fillStyle = '#4e342e';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(cx - 13 + i * 3, cy - 12, 2, 4);
                ctx.fillRect(cx + 7 + i * 3, cy - 12, 2, 4);
            }
            // Gate
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(cx, cy + 6, 5, Math.PI, 0, false);
            ctx.fill();
            ctx.fillRect(cx - 5, cy + 6, 10, 6);
            // Flag
            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 16);
            ctx.lineTo(cx + 8, cy - 12);
            ctx.lineTo(cx, cy - 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#6d4c41';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 16);
            ctx.lineTo(cx, cy - 2);
            ctx.stroke();
        }
    },

    VILLAGE: {
        id: 'village',
        name: 'Village',
        baseColor: '#a1887f',
        accentColor: '#bcaaa4',
        borderColor: '#8d6e63',
        weight: 8,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 20);

            // Scatter houses
            const numHouses = 2 + Math.floor(randoms[0] * 2);
            const houses = [];

            for (let i = 0; i < numHouses; i++) {
                const ri = i * 4;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.45);
                const houseW = 8 + randoms[ri + 3] * 6;
                const houseH = 6 + randoms[ri + 3] * 4;
                houses.push({ x: pos.x - houseW/2, y: pos.y, w: houseW, h: houseH });
            }

            houses.forEach(house => {
                const hx = house.x;
                const hy = house.y;
                // Wall
                ctx.fillStyle = '#d7ccc8';
                ctx.fillRect(hx, hy, house.w, house.h);
                // Roof
                ctx.fillStyle = '#6d4c41';
                ctx.beginPath();
                ctx.moveTo(hx - 2, hy);
                ctx.lineTo(hx + house.w / 2, hy - house.h * 0.6);
                ctx.lineTo(hx + house.w + 2, hy);
                ctx.closePath();
                ctx.fill();
                // Door
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(hx + house.w/2 - 2, hy + house.h - 4, 4, 4);
            });
        }
    },

    DESERT: {
        id: 'desert',
        name: 'Desert',
        baseColor: '#fdd835',
        accentColor: '#ffeb3b',
        borderColor: '#f9a825',
        weight: 10,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 20);

            // Dunes
            ctx.fillStyle = '#f9a825';
            const dunePos = randomHexPoint(cx, cy, size, randoms[1], randoms[2], 0.4);
            ctx.beginPath();
            ctx.moveTo(dunePos.x - 18, dunePos.y + 8);
            ctx.quadraticCurveTo(dunePos.x - 5, dunePos.y - 4, dunePos.x + 8, dunePos.y + 8);
            ctx.quadraticCurveTo(dunePos.x + 15, dunePos.y + 2, dunePos.x + 20, dunePos.y + 8);
            ctx.fill();

            // Scatter cacti
            const numCacti = 1 + Math.floor(randoms[0] * 2);
            for (let i = 0; i < numCacti; i++) {
                const ri = 5 + i * 3;
                const pos = randomHexPoint(cx, cy, size, randoms[ri], randoms[ri + 1], 0.5);
                const cactusSize = 0.6 + randoms[ri + 2] * 0.5;

                ctx.fillStyle = '#558b2f';
                // Main stem
                ctx.fillRect(pos.x - 2 * cactusSize, pos.y - 6 * cactusSize, 4 * cactusSize, 14 * cactusSize);
                // Arms
                ctx.fillRect(pos.x - 8 * cactusSize, pos.y - 2 * cactusSize, 6 * cactusSize, 3 * cactusSize);
                ctx.fillRect(pos.x - 8 * cactusSize, pos.y - 5 * cactusSize, 3 * cactusSize, 6 * cactusSize);
                ctx.fillRect(pos.x + 2 * cactusSize, pos.y, 6 * cactusSize, 3 * cactusSize);
                ctx.fillRect(pos.x + 5 * cactusSize, pos.y - 4 * cactusSize, 3 * cactusSize, 7 * cactusSize);
            }
        }
    },

    SWAMP: {
        id: 'swamp',
        name: 'Swamp',
        baseColor: '#5d6d3a',
        accentColor: '#6b7d44',
        borderColor: '#4a5a2e',
        weight: 8,
        render: (ctx, cx, cy, size, seed) => {
            const randoms = getRandoms(seed, 25);

            // Water puddles
            ctx.fillStyle = '#3d5229';
            const numPuddles = 1 + Math.floor(randoms[0] * 2);
            for (let i = 0; i < numPuddles; i++) {
                const ri = i * 3;
                const pos = randomHexPoint(cx, cy, size, randoms[ri + 1], randoms[ri + 2], 0.5);
                const pw = 8 + randoms[ri + 3] * 6;
                const ph = 4 + randoms[ri + 3] * 3;
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y, pw, ph, randoms[ri + 4] * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Reeds
            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = 2;
            const numReeds = 3 + Math.floor(randoms[10] * 3);
            for (let i = 0; i < numReeds; i++) {
                const ri = 11 + i * 2;
                const pos = randomHexPoint(cx, cy, size, randoms[ri], randoms[ri + 1], 0.6);

                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.quadraticCurveTo(pos.x + 2, pos.y - 8, pos.x, pos.y - 14);
                ctx.stroke();

                // Reed top
                ctx.fillStyle = '#795548';
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y - 15, 2, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
};

// Get terrain type by id
export function getTerrainById(id) {
    return Object.values(TerrainTypes).find(t => t.id === id);
}

// Get weighted random terrain for map generation
export function getRandomTerrain(excludeRare = false) {
    const terrains = Object.values(TerrainTypes);
    const filtered = excludeRare
        ? terrains.filter(t => t.id !== 'castle' && t.id !== 'ocean')
        : terrains;

    const totalWeight = filtered.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const terrain of filtered) {
        random -= terrain.weight;
        if (random <= 0) {
            return terrain;
        }
    }
    return filtered[0];
}
