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

// Generate well-distributed points within hex using jittered grid
function getDistributedPoints(cx, cy, size, seed, count, margin = 0.65) {
    const randoms = getRandoms(seed, count * 3);
    const points = [];
    const radius = size * margin;

    // Use golden angle for even distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
        // Sunflower seed pattern for even distribution
        const r = radius * Math.sqrt((i + 0.5) / count);
        const theta = i * goldenAngle + randoms[i] * 0.5;

        // Add some jitter
        const jitterR = r * (0.85 + randoms[i + count] * 0.3);
        const jitterTheta = theta + (randoms[i + count * 2] - 0.5) * 0.4;

        points.push({
            x: cx + jitterR * Math.cos(jitterTheta),
            y: cy + jitterR * Math.sin(jitterTheta)
        });
    }

    return points;
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
            const points = getDistributedPoints(cx, cy, size, seed, 8, 0.7);
            const randoms = getRandoms(seed + 500, 16);

            ctx.strokeStyle = '#558b2f';
            ctx.lineWidth = 1.5;

            points.forEach((pos, i) => {
                const tuftHeight = 4 + randoms[i] * 4;

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
            });
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
            // Get evenly distributed tree positions
            const treePoints = getDistributedPoints(cx, cy, size, seed, 5, 0.6);
            const randoms = getRandoms(seed + 500, 15);

            // Sort by y for depth ordering
            const trees = treePoints.map((pos, i) => ({
                ...pos,
                size: 0.7 + randoms[i] * 0.4,
                depth: pos.y
            }));
            trees.sort((a, b) => a.depth - b.depth);

            trees.forEach((tree, i) => {
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

            // Back mountain
            const backOx = (randoms[0] - 0.5) * size * 0.4;
            ctx.fillStyle = '#546e7a';
            ctx.beginPath();
            ctx.moveTo(cx + backOx + 5, cy + 10);
            ctx.lineTo(cx + backOx + 12, cy - 6);
            ctx.lineTo(cx + backOx + 22, cy + 10);
            ctx.closePath();
            ctx.fill();

            // Main mountain (centered)
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy + 10);
            ctx.lineTo(cx, cy - 14);
            ctx.lineTo(cx + 15, cy + 10);
            ctx.closePath();
            ctx.fill();

            // Snow cap
            ctx.fillStyle = '#eceff1';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 14);
            ctx.lineTo(cx - 5, cy - 5);
            ctx.lineTo(cx - 2, cy - 5);
            ctx.lineTo(cx, cy - 7);
            ctx.lineTo(cx + 2, cy - 5);
            ctx.lineTo(cx + 5, cy - 5);
            ctx.closePath();
            ctx.fill();
        }
    },

    OCEAN: {
        id: 'ocean',
        name: 'Ocean',
        baseColor: '#1565c0',
        accentColor: '#1976d2',
        borderColor: '#0d47a1',
        weight: 0, // Only placed by generator
        render: (ctx, cx, cy, size, seed) => {
            const points = getDistributedPoints(cx, cy, size, seed, 3, 0.5);
            const randoms = getRandoms(seed + 500, 10);

            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';

            points.forEach((pos, i) => {
                const waveWidth = 10 + randoms[i] * 8;
                ctx.beginPath();
                ctx.moveTo(pos.x - waveWidth/2, pos.y);
                ctx.quadraticCurveTo(pos.x, pos.y - 2, pos.x + waveWidth/2, pos.y);
                ctx.stroke();
            });
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
            // Castle stays centered
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

            // Houses in a small cluster near center
            const houses = [
                { x: cx - 8, y: cy - 2, w: 10, h: 8 },
                { x: cx + 2, y: cy + 2, w: 12, h: 10 },
                { x: cx - 4, y: cy - 10, w: 8, h: 6 }
            ];

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

            // Dune (centered)
            ctx.fillStyle = '#f9a825';
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy + 8);
            ctx.quadraticCurveTo(cx - 5, cy - 4, cx + 8, cy + 8);
            ctx.quadraticCurveTo(cx + 15, cy + 2, cx + 20, cy + 8);
            ctx.fill();

            // Distributed cacti
            const cactusPoints = getDistributedPoints(cx, cy, size, seed + 100, 2, 0.5);

            cactusPoints.forEach((pos, i) => {
                const cactusSize = 0.6 + randoms[i] * 0.4;
                ctx.fillStyle = '#558b2f';
                // Main stem
                ctx.fillRect(pos.x - 2 * cactusSize, pos.y - 6 * cactusSize, 4 * cactusSize, 14 * cactusSize);
                // Arms
                if (randoms[i + 5] > 0.3) {
                    ctx.fillRect(pos.x - 8 * cactusSize, pos.y - 2 * cactusSize, 6 * cactusSize, 3 * cactusSize);
                    ctx.fillRect(pos.x - 8 * cactusSize, pos.y - 5 * cactusSize, 3 * cactusSize, 6 * cactusSize);
                }
                if (randoms[i + 6] > 0.3) {
                    ctx.fillRect(pos.x + 2 * cactusSize, pos.y, 6 * cactusSize, 3 * cactusSize);
                    ctx.fillRect(pos.x + 5 * cactusSize, pos.y - 4 * cactusSize, 3 * cactusSize, 7 * cactusSize);
                }
            });
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
            ctx.beginPath();
            ctx.ellipse(cx - 4, cy + 2, 10, 5, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 8, cy - 4, 7, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Distributed reeds
            const reedPoints = getDistributedPoints(cx, cy, size, seed + 100, 5, 0.6);

            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = 2;

            reedPoints.forEach((pos, i) => {
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.quadraticCurveTo(pos.x + 2, pos.y - 8, pos.x, pos.y - 14);
                ctx.stroke();

                // Reed top
                ctx.fillStyle = '#795548';
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y - 15, 2, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            });
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
