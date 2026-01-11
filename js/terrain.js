// Terrain type definitions with colors and rendering

export const TerrainTypes = {
    PLAINS: {
        id: 'plains',
        name: 'Plains',
        baseColor: '#7cb342',
        accentColor: '#8bc34a',
        borderColor: '#558b2f',
        weight: 30, // Higher = more common
        render: (ctx, cx, cy, size) => {
            // Draw grass tufts
            ctx.strokeStyle = '#558b2f';
            ctx.lineWidth = 1.5;
            const tufts = [[0, -5], [-8, 3], [6, 4], [-3, -8], [8, -3]];
            tufts.forEach(([ox, oy]) => {
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy + 3);
                ctx.quadraticCurveTo(cx + ox - 2, cy + oy - 2, cx + ox, cy + oy - 4);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy + 3);
                ctx.quadraticCurveTo(cx + ox + 2, cy + oy - 2, cx + ox + 2, cy + oy - 5);
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
        render: (ctx, cx, cy, size) => {
            // Draw pine trees
            const trees = [[0, 0], [-10, 6], [10, 6]];
            trees.forEach(([ox, oy]) => {
                const tx = cx + ox;
                const ty = cy + oy;
                // Trunk
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(tx - 2, ty + 2, 4, 6);
                // Foliage layers
                ctx.fillStyle = '#1b5e20';
                ctx.beginPath();
                ctx.moveTo(tx, ty - 10);
                ctx.lineTo(tx - 8, ty + 2);
                ctx.lineTo(tx + 8, ty + 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath();
                ctx.moveTo(tx, ty - 6);
                ctx.lineTo(tx - 6, ty + 4);
                ctx.lineTo(tx + 6, ty + 4);
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
        render: (ctx, cx, cy, size) => {
            // Draw mountain peaks
            // Back mountain
            ctx.fillStyle = '#546e7a';
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy + 10);
            ctx.lineTo(cx + 18, cy - 6);
            ctx.lineTo(cx + 28, cy + 10);
            ctx.closePath();
            ctx.fill();

            // Main mountain
            ctx.fillStyle = '#78909c';
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy + 10);
            ctx.lineTo(cx, cy - 12);
            ctx.lineTo(cx + 15, cy + 10);
            ctx.closePath();
            ctx.fill();

            // Snow cap
            ctx.fillStyle = '#eceff1';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 12);
            ctx.lineTo(cx - 5, cy - 4);
            ctx.lineTo(cx - 2, cy - 4);
            ctx.lineTo(cx, cy - 6);
            ctx.lineTo(cx + 2, cy - 4);
            ctx.lineTo(cx + 5, cy - 4);
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
        render: (ctx, cx, cy, size) => {
            // Draw waves
            ctx.strokeStyle = '#64b5f6';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            const waves = [
                { y: -6, width: 14 },
                { y: 0, width: 18 },
                { y: 6, width: 14 }
            ];

            waves.forEach(wave => {
                ctx.beginPath();
                ctx.moveTo(cx - wave.width/2, cy + wave.y);
                ctx.quadraticCurveTo(cx - wave.width/4, cy + wave.y - 4, cx, cy + wave.y);
                ctx.quadraticCurveTo(cx + wave.width/4, cy + wave.y + 4, cx + wave.width/2, cy + wave.y);
                ctx.stroke();
            });
        }
    },

    CASTLE: {
        id: 'castle',
        name: 'Castle',
        baseColor: '#5d4037',
        accentColor: '#6d4c41',
        borderColor: '#3e2723',
        weight: 2,
        render: (ctx, cx, cy, size) => {
            // Draw castle
            ctx.fillStyle = '#4e342e';
            // Main wall
            ctx.fillRect(cx - 12, cy - 2, 24, 14);
            // Towers
            ctx.fillRect(cx - 14, cy - 8, 8, 20);
            ctx.fillRect(cx + 6, cy - 8, 8, 20);
            // Battlements
            ctx.fillStyle = '#3e2723';
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
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 1;
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
        render: (ctx, cx, cy, size) => {
            // Draw houses
            const houses = [
                { x: -10, y: 0, w: 10, h: 8 },
                { x: 4, y: 2, w: 12, h: 10 },
                { x: -4, y: -8, w: 8, h: 6 }
            ];

            houses.forEach(house => {
                const hx = cx + house.x;
                const hy = cy + house.y;
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
                ctx.fillRect(hx + house.w/2 - 2, hy + house.h - 5, 4, 5);
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
        render: (ctx, cx, cy, size) => {
            // Draw dunes and cacti
            ctx.fillStyle = '#f9a825';
            // Dune
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy + 8);
            ctx.quadraticCurveTo(cx - 5, cy - 4, cx + 8, cy + 8);
            ctx.quadraticCurveTo(cx + 15, cy + 2, cx + 20, cy + 8);
            ctx.fill();

            // Cactus
            ctx.fillStyle = '#558b2f';
            ctx.fillRect(cx - 2, cy - 6, 4, 14);
            ctx.fillRect(cx - 8, cy - 2, 6, 3);
            ctx.fillRect(cx - 8, cy - 5, 3, 6);
            ctx.fillRect(cx + 2, cy, 6, 3);
            ctx.fillRect(cx + 5, cy - 4, 3, 7);
        }
    },

    SWAMP: {
        id: 'swamp',
        name: 'Swamp',
        baseColor: '#5d6d3a',
        accentColor: '#6b7d44',
        borderColor: '#4a5a2e',
        weight: 8,
        render: (ctx, cx, cy, size) => {
            // Draw murky water and reeds
            // Water puddles
            ctx.fillStyle = '#3d5229';
            ctx.beginPath();
            ctx.ellipse(cx - 6, cy + 4, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 8, cy - 2, 8, 4, 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Reeds
            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = 2;
            const reeds = [[-12, 6], [-4, -4], [6, 8], [14, -2]];
            reeds.forEach(([ox, oy]) => {
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy);
                ctx.quadraticCurveTo(cx + ox + 2, cy + oy - 8, cx + ox, cy + oy - 14);
                ctx.stroke();
                // Reed top
                ctx.fillStyle = '#795548';
                ctx.beginPath();
                ctx.ellipse(cx + ox, cy + oy - 15, 2, 4, 0, 0, Math.PI * 2);
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
        ? terrains.filter(t => t.id !== 'castle')
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
