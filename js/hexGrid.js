// Hex grid mathematics and rendering

export class HexGrid {
    constructor(hexSize = 40) {
        this.hexSize = hexSize;
        // For flat-top hexes: width = 2*size, height = sqrt(3)*size
        this.hexWidth = hexSize * 2;
        this.hexHeight = Math.sqrt(3) * hexSize;
    }

    // Get pixel position of hex center (flat-top orientation, odd-q offset)
    hexToPixel(col, row) {
        const x = this.hexSize * 3/2 * col;
        const y = this.hexHeight * (row + 0.5 * (col & 1));
        return { x, y };
    }

    // Get hex coordinates from pixel position
    pixelToHex(x, y) {
        // Convert to axial coordinates first
        const q = (2/3 * x) / this.hexSize;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;

        // Round to nearest hex (cube coordinates)
        let rx = Math.round(q);
        let rz = Math.round(r);
        let ry = Math.round(-q - r);

        const xDiff = Math.abs(rx - q);
        const yDiff = Math.abs(ry - (-q - r));
        const zDiff = Math.abs(rz - r);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        // Convert axial to odd-q offset
        const col = rx;
        const row = rz + (rx - (rx & 1)) / 2;

        return { col, row };
    }

    // Get corners of a hex for drawing (flat-top orientation)
    getHexCorners(cx, cy) {
        const corners = [];
        for (let i = 0; i < 6; i++) {
            // Flat-top: angles at 0°, 60°, 120°, 180°, 240°, 300°
            const angle = (Math.PI / 180) * (60 * i);
            corners.push({
                x: cx + this.hexSize * Math.cos(angle),
                y: cy + this.hexSize * Math.sin(angle)
            });
        }
        return corners;
    }

    // Get the pixel position of a specific edge midpoint (0-5, starting from right going clockwise)
    getEdgeMidpoint(col, row, edgeIndex) {
        const { x: cx, y: cy } = this.hexToPixel(col, row);
        const corners = this.getHexCorners(cx, cy);
        const nextIndex = (edgeIndex + 1) % 6;
        return {
            x: (corners[edgeIndex].x + corners[nextIndex].x) / 2,
            y: (corners[edgeIndex].y + corners[nextIndex].y) / 2
        };
    }

    // Draw a single hex tile
    drawHex(ctx, col, row, terrain, highlight = false) {
        const { x: cx, y: cy } = this.hexToPixel(col, row);
        const corners = this.getHexCorners(cx, cy);

        // Create gradient for hex
        const gradient = ctx.createRadialGradient(
            cx, cy - this.hexSize * 0.3, 0,
            cx, cy, this.hexSize * 1.2
        );
        gradient.addColorStop(0, terrain.accentColor);
        gradient.addColorStop(1, terrain.baseColor);

        // Draw hex shape
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        // Fill
        ctx.fillStyle = gradient;
        ctx.fill();

        // Border
        ctx.strokeStyle = terrain.borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight if hovered
        if (highlight) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Render terrain details with seeded random based on position
        ctx.save();
        const seed = col * 1000 + row; // Deterministic seed per hex
        terrain.render(ctx, cx, cy, this.hexSize, seed);
        ctx.restore();
    }

    // Get map dimensions in pixels
    getMapDimensions(cols, rows) {
        const lastCol = cols - 1;
        const lastRow = rows - 1;
        const { x: maxX, y: maxY } = this.hexToPixel(lastCol, lastRow);

        return {
            width: maxX + this.hexSize * 1.5,
            height: maxY + this.hexHeight * 0.6
        };
    }

    // Get neighbors of a hex (flat-top, odd-q offset)
    getNeighbors(col, row) {
        const isOdd = col & 1;
        // For flat-top odd-q: directions are [E, SE, SW, W, NW, NE]
        const directions = isOdd
            ? [
                [1, 0], [1, 1], [0, 1],
                [-1, 1], [-1, 0], [0, -1]
              ]
            : [
                [1, -1], [1, 0], [0, 1],
                [-1, 0], [-1, -1], [0, -1]
              ];

        return directions.map(([dc, dr]) => ({
            col: col + dc,
            row: row + dr
        }));
    }

    // Get the edge index that connects to a neighbor
    // Returns 0-5 for the edge facing that neighbor, or -1 if not adjacent
    getEdgeToNeighbor(fromCol, fromRow, toCol, toRow) {
        const neighbors = this.getNeighbors(fromCol, fromRow);
        for (let i = 0; i < neighbors.length; i++) {
            if (neighbors[i].col === toCol && neighbors[i].row === toRow) {
                return i;
            }
        }
        return -1;
    }
}
