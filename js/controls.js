// Camera controls for zoom and pan

export class CameraControls {
    constructor(canvas, onUpdate) {
        this.canvas = canvas;
        this.onUpdate = onUpdate;

        // Camera state
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        this.minScale = 0.25;
        this.maxScale = 3;

        // Drag state
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        // Touch state
        this.lastTouchDist = 0;

        this.bindEvents();
    }

    bindEvents() {
        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e.clientX, e.clientY, e.deltaY);
        }, { passive: false });

        // Mouse drag pan
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastX;
                const dy = e.clientY - this.lastY;
                this.offsetX += dx;
                this.offsetY += dy;
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.onUpdate();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.lastTouchDist = this.getTouchDistance(e.touches);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - this.lastX;
                const dy = e.touches[0].clientY - this.lastY;
                this.offsetX += dx;
                this.offsetY += dy;
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
                this.onUpdate();
            } else if (e.touches.length === 2) {
                const dist = this.getTouchDistance(e.touches);
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const delta = this.lastTouchDist - dist;
                this.handleZoom(centerX, centerY, delta * 2);
                this.lastTouchDist = dist;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleZoom(clientX, clientY, delta) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        // Calculate world position before zoom
        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;

        // Apply zoom
        const zoomFactor = delta > 0 ? 0.9 : 1.1;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));

        if (newScale !== this.scale) {
            this.scale = newScale;

            // Adjust offset to zoom toward mouse position
            this.offsetX = mouseX - worldX * this.scale;
            this.offsetY = mouseY - worldY * this.scale;

            this.onUpdate();
        }
    }

    // Reset to show entire map
    resetView(mapWidth, mapHeight, canvasWidth, canvasHeight) {
        const scaleX = canvasWidth / mapWidth;
        const scaleY = canvasHeight / mapHeight;
        this.scale = Math.min(scaleX, scaleY) * 0.9;
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

        this.offsetX = (canvasWidth - mapWidth * this.scale) / 2;
        this.offsetY = (canvasHeight - mapHeight * this.scale) / 2;

        this.onUpdate();
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) / this.scale,
            y: (screenY - this.offsetY) / this.scale
        };
    }

    // Get current transform for canvas
    getTransform() {
        return {
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            scale: this.scale
        };
    }
}
