// Main application entry point

import { HexGrid } from './hexGrid.js';
import { MapGenerator } from './mapGenerator.js';
import { CameraControls } from './controls.js';
import { TerrainTypes } from './terrain.js';

class HexMapApp {
    constructor() {
        this.canvas = document.getElementById('hexCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('canvasContainer');

        // Map sizes configuration
        this.mapSizes = {
            small: { cols: 15, rows: 12 },
            medium: { cols: 25, rows: 20 },
            large: { cols: 40, rows: 30 }
        };

        // Initialize components
        this.hexGrid = new HexGrid(40);
        this.mapGenerator = new MapGenerator(this.hexGrid);
        this.controls = new CameraControls(this.canvas, () => this.render());

        // Current map state
        this.mapData = null;
        this.cols = 0;
        this.rows = 0;
        this.hoveredHex = null;

        this.init();
    }

    init() {
        // Set up canvas sizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Set up UI controls
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateMap();
        });

        document.getElementById('resetViewBtn').addEventListener('click', () => {
            this.resetView();
        });

        document.getElementById('mapSize').addEventListener('change', () => {
            this.generateMap();
        });

        // Mouse move for hover effect
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const { x, y } = this.controls.screenToWorld(screenX, screenY);
            const hex = this.hexGrid.pixelToHex(x, y);

            if (hex.col >= 0 && hex.col < this.cols &&
                hex.row >= 0 && hex.row < this.rows) {
                if (!this.hoveredHex ||
                    this.hoveredHex.col !== hex.col ||
                    this.hoveredHex.row !== hex.row) {
                    this.hoveredHex = hex;
                    this.render();
                }
            } else if (this.hoveredHex) {
                this.hoveredHex = null;
                this.render();
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.hoveredHex) {
                this.hoveredHex = null;
                this.render();
            }
        });

        // Build legend
        this.buildLegend();

        // Generate initial map
        this.generateMap();
    }

    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.render();
    }

    generateMap() {
        const sizeKey = document.getElementById('mapSize').value;
        const size = this.mapSizes[sizeKey];
        this.cols = size.cols;
        this.rows = size.rows;

        this.mapData = this.mapGenerator.generate(this.cols, this.rows);
        this.resetView();
    }

    resetView() {
        if (!this.mapData) return;

        const dims = this.hexGrid.getMapDimensions(this.cols, this.rows);
        this.controls.resetView(
            dims.width,
            dims.height,
            this.canvas.width,
            this.canvas.height
        );
    }

    buildLegend() {
        const legendItems = document.getElementById('legendItems');
        legendItems.innerHTML = '';

        Object.values(TerrainTypes).forEach(terrain => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.background = `linear-gradient(135deg, ${terrain.accentColor} 0%, ${terrain.baseColor} 100%)`;
            colorBox.style.borderColor = terrain.borderColor;

            const label = document.createElement('span');
            label.textContent = terrain.name;

            item.appendChild(colorBox);
            item.appendChild(label);
            legendItems.appendChild(item);
        });
    }

    render() {
        if (!this.mapData) return;

        const ctx = this.ctx;
        const { offsetX, offsetY, scale } = this.controls.getTransform();
        const { map, rivers, roads } = this.mapData;

        // Clear canvas
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Calculate visible area for culling
        const visibleLeft = -offsetX / scale - this.hexGrid.hexSize * 2;
        const visibleTop = -offsetY / scale - this.hexGrid.hexSize * 2;
        const visibleRight = (this.canvas.width - offsetX) / scale + this.hexGrid.hexSize * 2;
        const visibleBottom = (this.canvas.height - offsetY) / scale + this.hexGrid.hexSize * 2;

        // Render hexes
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const { x, y } = this.hexGrid.hexToPixel(col, row);

                // Frustum culling - skip hexes outside visible area
                if (x < visibleLeft || x > visibleRight ||
                    y < visibleTop || y > visibleBottom) {
                    continue;
                }

                const terrain = map[row][col];
                const isHovered = this.hoveredHex &&
                                  this.hoveredHex.col === col &&
                                  this.hoveredHex.row === row;

                this.hexGrid.drawHex(ctx, col, row, terrain, isHovered);
            }
        }

        // Render roads (below rivers)
        this.renderRoads(ctx, roads);

        // Render rivers (on top)
        this.renderRivers(ctx, rivers);

        ctx.restore();

        // Draw zoom level indicator
        this.drawZoomIndicator();
    }

    renderRivers(ctx, rivers) {
        if (!rivers || rivers.length === 0) return;

        ctx.strokeStyle = '#2196f3';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        rivers.forEach(river => {
            if (river.length < 2) return;

            // Draw river as a path through hex edge midpoints
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#1565c0';
            ctx.beginPath();

            let started = false;
            for (let i = 0; i < river.length; i++) {
                const segment = river[i];
                const { x: cx, y: cy } = this.hexGrid.hexToPixel(segment.col, segment.row);

                if (segment.entryEdge === -1) {
                    // River source - start from center
                    ctx.moveTo(cx, cy);
                    started = true;
                } else if (!started) {
                    const entryMid = this.hexGrid.getEdgeMidpoint(segment.col, segment.row, segment.entryEdge);
                    ctx.moveTo(entryMid.x, entryMid.y);
                    started = true;
                }

                if (segment.exitEdge >= 0) {
                    const exitMid = this.hexGrid.getEdgeMidpoint(segment.col, segment.row, segment.exitEdge);
                    // Curve through center for smoother appearance
                    ctx.quadraticCurveTo(cx, cy, exitMid.x, exitMid.y);
                } else {
                    // River ends here (at water)
                    ctx.lineTo(cx, cy);
                }
            }

            ctx.stroke();

            // Draw lighter highlight
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#64b5f6';
            ctx.stroke();
        });
    }

    renderRoads(ctx, roads) {
        if (!roads || roads.length === 0) return;

        roads.forEach(road => {
            if (road.length < 1) return;

            // Draw road shadow/outline
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#5d4037';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();

            let started = false;
            for (let i = 0; i < road.length; i++) {
                const segment = road[i];
                const { x: cx, y: cy } = this.hexGrid.hexToPixel(segment.col, segment.row);

                if (!started) {
                    if (segment.entryEdge >= 0) {
                        const entryMid = this.hexGrid.getEdgeMidpoint(segment.col, segment.row, segment.entryEdge);
                        ctx.moveTo(entryMid.x, entryMid.y);
                    } else {
                        ctx.moveTo(cx, cy);
                    }
                    started = true;
                }

                if (segment.exitEdge >= 0) {
                    const exitMid = this.hexGrid.getEdgeMidpoint(segment.col, segment.row, segment.exitEdge);
                    ctx.quadraticCurveTo(cx, cy, exitMid.x, exitMid.y);
                } else {
                    ctx.lineTo(cx, cy);
                }
            }

            ctx.stroke();

            // Draw road surface
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#a1887f';
            ctx.stroke();

            // Draw center line (dashed)
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#d7ccc8';
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }

    drawZoomIndicator() {
        const { scale } = this.controls.getTransform();
        const ctx = this.ctx;

        ctx.save();
        ctx.fillStyle = 'rgba(22, 33, 62, 0.8)';
        ctx.fillRect(10, this.canvas.height - 35, 80, 25);
        ctx.strokeStyle = '#e94560';
        ctx.strokeRect(10, this.canvas.height - 35, 80, 25);

        ctx.fillStyle = '#fff';
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(scale * 100)}% zoom`, 50, this.canvas.height - 18);
        ctx.restore();
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', () => {
    new HexMapApp();
});
