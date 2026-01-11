// Hex grid mathematics and rendering

export class HexGrid {
    constructor(hexSize = 40) {
        this.hexSize = hexSize;
        this.hexWidth = hexSize * 2;
        this.hexHeight = Math.sqrt(3) * hexSize;
    }

    // Get pixel position of hex center (pointy-top orientation)
    hexToPixel(col, row) {
        const x = this.hexSize * (3/2 * col);
        const y = this.hexHeight * (row + 0.5 * (col & 1));
        return { x, y };
    }

    // Get hex coordinates from pixel position
    pixelToHex(x, y) {
        const col = (2/3 * x) / this.hexSize;
        const row = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;

        // Convert to offset coordinates (odd-q)
        const cubeX = col;
        const cubeZ = row;
        const cubeY = -cubeX - cubeZ;

        let rx = Math.round(cubeX);
        let ry = Math.round(cubeY);
        let rz = Math.round(cubeZ);

        const xDiff = Math.abs(rx - cubeX);
        const yDiff = Math.abs(ry - cubeY);
        const zDiff = Math.abs(rz - cubeZ);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        const offsetCol = rx;
        const offsetRow = rz + (rx - (rx & 1)) / 2;

        return { col: offsetCol, row: offsetRow };
    }

    // Get corners of a hex for drawing
    getHexCorners(cx, cy) {
        const corners = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            corners.push({
                x: cx + this.hexSize * Math.cos(angle),
                y: cy + this.hexSize * Math.sin(angle)
            });
        }
        return corners;
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
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight if hovered
        if (highlight) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Render terrain details
        ctx.save();
        terrain.render(ctx, cx, cy, this.hexSize);
        ctx.restore();
    }

    // Get map dimensions in pixels
    getMapDimensions(cols, rows) {
        const lastCol = cols - 1;
        const lastRow = rows - 1;
        const { x: maxX, y: maxY } = this.hexToPixel(lastCol, lastRow);

        return {
            width: maxX + this.hexSize * 1.5,
            height: maxY + this.hexHeight * 0.75
        };
    }

    // Get neighbors of a hex
    getNeighbors(col, row) {
        const isOdd = col & 1;
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
}
