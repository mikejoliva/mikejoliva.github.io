(() => {
    // ----- Canvas Setup -----
    const canvas = document.getElementById("bg");
    const ctx = canvas.getContext("2d");

    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;

    const activeConnections = new Set();

    // ----- Configuration -----
    const CONFIG = {
        MAX_SPEED: 0.5,
        MOUSE_PULL_DISTANCE: 150,
        STOP_THRESHOLD: 5,
        EDGE_MARGIN: 50,
        EDGE_PUSH: 0.05,
        REPEL_DISTANCE: 80,
        REPEL_STRENGTH: 0.05,
        HALO_RADIUS: 180,
        BLOB_DENSITY: 10000,
        BLOB_MAX: 100,
        BLOB_MIN: 20,
        LINE_INTENSITY: 0.25,
    };

    let blobs = [];
    let packets = [];
    const mouse = { x: canvasWidth / 2, y: canvasHeight / 2 };
    let backgroundHue = 220;
    let huePhase = 0;

    // ----- Utility Functions -----
    const distanceSquared = (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const getConnectionKey = (a, b) => a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;

    // ----- Blob Class -----
    class Blob {
        #baseVx;
        #baseVy;

        constructor(id) {
            this.id = id;
            this.x = Math.random() * canvasWidth;
            this.y = Math.random() * canvasHeight;
            this.radius = Math.random() * 80 + 50;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.#baseVx = this.vx;
            this.#baseVy = this.vy;
            this.hue = Math.random() * 360;
            this.opacity = 0.15 + Math.random() * 0.2;
        }

        update(allBlobs) {
            this.#applyMouseAttraction();
            this.#applyEdgePush();
            this.#applyHaloOrbit();
            this.#applyRepulsion(allBlobs);
            this.#limitSpeed();

            this.x += this.vx;
            this.y += this.vy;
            this.#handleCanvasEdges();
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

            this.hue = (this.hue + Math.hypot(this.vx, this.vy) * 1.5) % 360;
        }

        #applyMouseAttraction() {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distSq = dx * dx + dy * dy;
            const maxDistSq = CONFIG.MOUSE_PULL_DISTANCE ** 2;

            if (distSq < maxDistSq) {
                const dist = Math.sqrt(distSq);
                if (dist > CONFIG.STOP_THRESHOLD) {
                    this.vx += dx * 0.01;
                    this.vy += dy * 0.01;
                } else {
                    this.vx *= 0.9;
                    this.vy *= 0.9;
                }
            } else {
                this.vx += (this.#baseVx - this.vx) * 0.02;
                this.vy += (this.#baseVy - this.vy) * 0.02;
            }
        }

        #applyEdgePush() {
            const centreX = canvasWidth / 2;
            const centreY = canvasHeight / 2;

            if (this.x < CONFIG.EDGE_MARGIN || this.x > canvasWidth - CONFIG.EDGE_MARGIN) {
                this.vx += (centreX - this.x) * CONFIG.EDGE_PUSH;
            }
            if (this.y < CONFIG.EDGE_MARGIN || this.y > canvasHeight - CONFIG.EDGE_MARGIN) {
                this.vy += (centreY - this.y) * CONFIG.EDGE_PUSH;
            }
        }

        #applyHaloOrbit() {
            const dx = this.x - canvasWidth / 2;
            const dy = this.y - canvasHeight / 2;
            const distSq = dx * dx + dy * dy;

            if (distSq < CONFIG.HALO_RADIUS ** 2) {
                const angle = Math.atan2(dy, dx);
                const orbitStrength = 0.002;
                this.vx += -Math.sin(angle) * orbitStrength;
                this.vy += Math.cos(angle) * orbitStrength;

                const dist = Math.sqrt(distSq);
                this.hue = (backgroundHue + (dist / CONFIG.HALO_RADIUS) * 60) % 360;
                this.opacity = 0.2 + (1 - dist / CONFIG.HALO_RADIUS) * 0.2;
            }
        }

        #applyRepulsion(allBlobs) {
            if (distanceSquared(this.x, this.y, mouse.x, mouse.y) < CONFIG.MOUSE_PULL_DISTANCE ** 2) return;
            const repelDistSq = CONFIG.REPEL_DISTANCE ** 2;

            allBlobs.forEach(other => {
                if (other === this) return;
                if (distanceSquared(other.x, other.y, mouse.x, mouse.y) < CONFIG.MOUSE_PULL_DISTANCE ** 2) return;

                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 0 && distSq < repelDistSq) {
                    const dist = Math.sqrt(distSq);
                    const force = ((CONFIG.REPEL_DISTANCE - dist) / CONFIG.REPEL_DISTANCE) * CONFIG.REPEL_STRENGTH;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    this.vx += nx * force;
                    this.vy += ny * force;
                    other.vx -= nx * force;
                    other.vy -= ny * force;
                }
            });
        }

        #limitSpeed() {
            this.vx = clamp(this.vx, -CONFIG.MAX_SPEED, CONFIG.MAX_SPEED);
            this.vy = clamp(this.vy, -CONFIG.MAX_SPEED, CONFIG.MAX_SPEED);
        }

        #handleCanvasEdges() {
            if (this.x < 0) { this.x = 0; this.vx = Math.max(this.vx, 0.05); }
            if (this.x > canvasWidth) { this.x = canvasWidth; this.vx = Math.min(this.vx, -0.05); }
            if (this.y < 0) { this.y = 0; this.vy = Math.max(this.vy, 0.05); }
            if (this.y > canvasHeight) { this.y = canvasHeight; this.vy = Math.min(this.vy, -0.05); }
        }
    }

    // ----- Packet Class -----
    class Packet {
        #trail = [];
        #fading = false;

        constructor(fromBlob, toBlob) {
            this.from = fromBlob;
            this.to = toBlob;
            this.progress = 0;
            this.speed = 0.003 + Math.random() * 0.005;
            this.hue = fromBlob.hue;
            this.alpha = 0.5 + Math.random() * 0.3;
            this.size = 2 + Math.random() * 2;
        }

        update() {
            const x = this.from.x + (this.to.x - this.from.x) * this.progress;
            const y = this.from.y + (this.to.y - this.from.y) * this.progress;
            this.#trail.push({ x, y, alpha: this.alpha });

            if (!this.#fading) {
                this.progress += this.speed;
                if (this.progress >= 1) this.#fading = true;
            } else {
                this.alpha *= 0.9;
                this.#trail.forEach(t => t.alpha *= 0.9);
            }

            if (this.#trail.length > 10) this.#trail.shift();
        }

        draw(ctx) {
            this.#trail.forEach((point, i) => {
                ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${point.alpha * (i / this.#trail.length)})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            });

            const x = this.from.x + (this.to.x - this.from.x) * this.progress;
            const y = this.from.y + (this.to.y - this.from.y) * this.progress;
            ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        isFinished() {
            return this.#fading && this.alpha < 0.01;
        }
    }

    // ----- Initialise Blobs -----
    const initialiseBlobs = () => {
        let blobCount = Math.floor((canvasWidth * canvasHeight) / CONFIG.BLOB_DENSITY);
        blobCount = Math.max(CONFIG.BLOB_MIN, Math.min(blobCount, CONFIG.BLOB_MAX));
        blobs = Array.from({ length: blobCount }, (_, i) => new Blob(i));
    };

    // ----- Mouse Tracking -----
    window.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // ----- Handle Resize -----
    const handleResize = () => {
        canvasWidth = canvas.width = window.innerWidth;
        canvasHeight = canvas.height = window.innerHeight;
        initialiseBlobs();
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    // ----- Animation Loop -----
    const animate = () => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Background gradient
        huePhase += 0.01;
        backgroundHue = 240 + 40 * Math.sin(huePhase);
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, `hsl(${backgroundHue}, 30%, 8%)`);
        gradient.addColorStop(1, `hsl(${backgroundHue + 20}, 30%, 15%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Update and draw blobs
        blobs.forEach(blob => {
            blob.update(blobs);
            blob.draw(ctx);
        });

        // Draw connections and spawn packets
        const maxLineDistSq = 200 * 200;
        ctx.lineWidth = 1;

        blobs.forEach((a, i) => {
            blobs.slice(i + 1).forEach(b => {
                const distSq = distanceSquared(a.x, a.y, b.x, b.y);
                const key = getConnectionKey(a, b);

                if (distSq < maxLineDistSq / 2) {
                    const alpha = ((200 - Math.sqrt(distSq)) / 200) * CONFIG.LINE_INTENSITY;
                    ctx.strokeStyle = `hsla(${a.hue}, 70%, 60%, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();

                    if (!activeConnections.has(key)) {
                        packets.push(new Packet(a, b));
                        activeConnections.add(key);
                    }
                } else if (activeConnections.has(key)) {
                    activeConnections.delete(key);
                }
            });
        });

        // Update and draw packets
        for (let i = packets.length - 1; i >= 0; i--) {
            packets[i].update();
            packets[i].draw(ctx);
            if (packets[i].isFinished()) packets.splice(i, 1);
        }

        requestAnimationFrame(animate);
    };

    animate();
})();