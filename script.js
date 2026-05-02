(() => {
    // ----- Canvas Setup -----
    const canvas = document.getElementById("bg");
    const ctx = canvas.getContext("2d");

    let width = window.innerWidth;
    let height = window.innerHeight;

    // ----- Config -----
    const CONFIG = {
        MAX_SPEED: 0.5,
        MOUSE_PULL_DISTANCE: 150,
        STOP_THRESHOLD: 5,
        EDGE_MARGIN: 50,
        EDGE_PUSH: 0.05,
        REPEL_DISTANCE: 80,
        REPEL_STRENGTH: 0.05,
        HALO_RADIUS: 180,
        BLOB_DENSITY: 10000 // pixels per blob
    };

    let blobs = [];
    let mouse = { x: width / 2, y: height / 2 };
    let bgHue = 220;
    let huePhase = 0;

    // ----- Utility Functions -----
    const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    // ----- Blob Class -----
    class Blob {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.radius = Math.random() * 80 + 50;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.baseVx = this.vx;
            this.baseVy = this.vy;
            this.hue = Math.random() * 360;
            this.opacity = 0.15 + Math.random() * 0.2;
        }

        update(blobs) {
            this._applyMouseAttraction();
            this._applyEdgePush();
            this._applyHaloOrbit();
            this._applyRepel(blobs);
            this._limitSpeed();
            this.x += this.vx;
            this.y += this.vy;
            this._softEdges();
        }

        draw(ctx) {
            const currentRadius = this.radius + Math.sin(Date.now() * 0.002) * 10;
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius);
            gradient.addColorStop(0, `hsla(${this.hue}, 70%, 60%, ${this.opacity})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        _applyMouseAttraction() {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = distance(this.x, this.y, mouse.x, mouse.y);

            if (dist < CONFIG.MOUSE_PULL_DISTANCE) {
                if (dist > CONFIG.STOP_THRESHOLD) {
                    this.vx += dx * 0.01;
                    this.vy += dy * 0.01;
                } else {
                    this.vx *= 0.9;
                    this.vy *= 0.9;
                }
            } else {
                this.vx += (this.baseVx - this.vx) * 0.02;
                this.vy += (this.baseVy - this.vy) * 0.02;
            }
        }

        _applyEdgePush() {
            const centerX = width / 2;
            const centerY = height / 2;
            if (this.x < CONFIG.EDGE_MARGIN) this.vx += (centerX - this.x) * CONFIG.EDGE_PUSH;
            if (this.x > width - CONFIG.EDGE_MARGIN) this.vx += (centerX - this.x) * CONFIG.EDGE_PUSH;
            if (this.y < CONFIG.EDGE_MARGIN) this.vy += (centerY - this.y) * CONFIG.EDGE_PUSH;
            if (this.y > height - CONFIG.EDGE_MARGIN) this.vy += (centerY - this.y) * CONFIG.EDGE_PUSH;
        }

        _applyHaloOrbit() {
            const dx = this.x - width / 2;
            const dy = this.y - height / 2;
            const dist = distance(this.x, this.y, width / 2, height / 2);

            if (dist < CONFIG.HALO_RADIUS) {
                const angle = Math.atan2(dy, dx);
                const orbitStrength = 0.002;
                this.vx += -Math.sin(angle) * orbitStrength;
                this.vy += Math.cos(angle) * orbitStrength;
                this.hue = (bgHue + (dist / CONFIG.HALO_RADIUS) * 60) % 360;
                this.opacity = 0.2 + (1 - dist / CONFIG.HALO_RADIUS) * 0.2;
            }
        }

        _applyRepel(blobs) {
            if (distance(this.x, this.y, mouse.x, mouse.y) < CONFIG.MOUSE_PULL_DISTANCE) return;
            for (const other of blobs) {
                if (other === this) continue;
                if (distance(other.x, other.y, mouse.x, mouse.y) < CONFIG.MOUSE_PULL_DISTANCE) continue;

                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const dist = distance(this.x, this.y, other.x, other.y);

                if (dist > 0 && dist < CONFIG.REPEL_DISTANCE) {
                    const force = ((CONFIG.REPEL_DISTANCE - dist) / CONFIG.REPEL_DISTANCE) * CONFIG.REPEL_STRENGTH;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    this.vx += nx * force;
                    this.vy += ny * force;
                    other.vx -= nx * force;
                    other.vy -= ny * force;
                }
            }
        }

        _limitSpeed() {
            this.vx = clamp(this.vx, -CONFIG.MAX_SPEED, CONFIG.MAX_SPEED);
            this.vy = clamp(this.vy, -CONFIG.MAX_SPEED, CONFIG.MAX_SPEED);
        }

        _softEdges() {
            if (this.x < 0) { this.x = 0; this.vx = Math.max(this.vx, 0.05); }
            if (this.x > width) { this.x = width; this.vx = Math.min(this.vx, -0.05); }
            if (this.y < 0) { this.y = 0; this.vy = Math.max(this.vy, 0.05); }
            if (this.y > height) { this.y = height; this.vy = Math.min(this.vy, -0.05); }
        }
    }

    // ----- Initialize Blobs Based on Screen Size -----
    const initBlobs = () => {
        let blobCount = Math.floor((width * height) / CONFIG.BLOB_DENSITY);
        blobCount = Math.max(20, Math.min(blobCount, 250));
        blobs = Array.from({ length: blobCount }, () => new Blob());
    };
    
    // ----- Mouse Tracking -----
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // ----- Resize Handling -----
    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initBlobs();
    };
    window.addEventListener("resize", handleResize);

    // ----- Initial Setup -----
    handleResize();

    // ----- Animation Loop -----
    const draw = () => {
        ctx.clearRect(0, 0, width, height);

        // Background gradient
        huePhase += 0.01;
        bgHue = 240 + 40 * Math.sin(huePhase);
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        const gradHue = bgHue + 20;
        gradient.addColorStop(0, `hsl(${bgHue}, 30%, 8%)`);
        gradient.addColorStop(1, `hsl(${gradHue}, 30%, 15%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw lines between blobs
        for (let i = 0; i < blobs.length; i++) {
            for (let j = i + 1; j < blobs.length; j++) {
                const dist = distance(blobs[i].x, blobs[i].y, blobs[j].x, blobs[j].y);
                if (dist < 200) {
                    ctx.strokeStyle = `rgba(255,255,255,${(200 - dist) / 200 * 0.15})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(blobs[i].x, blobs[i].y);
                    ctx.lineTo(blobs[j].x, blobs[j].y);
                    ctx.stroke();
                }
            }
        }

        blobs.forEach(blob => {
            blob.update(blobs);
            blob.draw(ctx);
        });

        requestAnimationFrame(draw);
    };

    draw();
})();