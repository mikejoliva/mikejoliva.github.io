(() => {
    const body = document.body;
    const name = document.getElementById("name");
    const status = document.getElementById("status");
    const sun = document.querySelector(".sun");
    const orb = sun.querySelector(".orb");
    const WEATHER = {
        dawn: "cold start",
        day: "clear skies",
        dusk: "golden hour",
        night: "all quiet",
    };

    let phase = "day";

    // The sun's height and side decide the weather: high is day, low is dawn (left) or dusk (right), below the horizon is night.
    const phaseForSun = (x, y) => {
        const elevation = 1 - y / innerHeight;
        if (elevation > 0.45) return "day";
        if (elevation > 0.15) return x < innerWidth / 2 ? "dawn" : "dusk";
        return "night";
    };

    const setPhase = p => {
        phase = p;
        body.dataset.sky = p;
        status.textContent = `${p} · ${WEATHER[p]}`;
        document.querySelector('meta[name="theme-color"]').content = getComputedStyle(body).getPropertyValue("--sky-top");
    };

    // Wrap every letter of both names so each can react to the pointer.
    Array.from(name.childNodes).forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        for (const c of node.textContent) {
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = c;
            frag.append(s);
        }
        node.replaceWith(frag);
    });

    // Letters swell into a wave around the pointer: the nearest lifts most, neighbours follow and lean away.
    const letters = [...name.querySelectorAll(".ch")];
    let waveQueued = false;
    let wx = 0, wy = 0;

    const wave = () => {
        waveQueued = false;
        for (const el of letters) {
            const r = el.getBoundingClientRect();
            const dx = wx - (r.left + r.width / 2);
            const dy = wy - (r.top + r.height / 2);
            const falloff = Math.max(0, 1 - Math.hypot(dx, dy * 0.6) / (r.height * 0.9)) ** 2;
            el.style.transform = falloff
                ? `translateY(${(-0.2 * falloff).toFixed(3)}em) rotate(${(-dx / r.width * 7 * falloff).toFixed(2)}deg) scale(${(1 + 0.18 * falloff).toFixed(3)})`
                : "";
        }
    };

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        name.addEventListener("pointermove", e => {
            wx = e.clientX;
            wy = e.clientY;
            if (!waveQueued) {
                waveQueued = true;
                requestAnimationFrame(wave);
            }
        });
        name.addEventListener("pointerleave", () => {
            for (const el of letters) el.style.transform = "";
        });
    }

    // ----- Sun -----
    let sunPx = { x: innerWidth * 0.78, y: innerHeight * 0.18 };
    const recent = [];
    let lastUser = -Infinity;
    let baseX = NaN, baseY = NaN;
    const REBASE_PX = 48;
    const glintEl = document.querySelector(".glint");
    let cancelDrift = () => {};

    const moveSun = (x, y, squash = true, auto = false) => {
        if (!auto) {
            lastUser = performance.now();
            cancelDrift();
        }
        sunPx = { x, y };
        // left/top snap to whole pixels and changing them restyles the page, so a slow drift jitters if it goes through them.
        // The sun (and its reflection) sit on a rounded base position and the offset from it is a transform, which the
        // compositor interpolates smoothly. The base only moves when the sun is dragged or has strayed far from it.
        if (!auto || !(Math.abs(x - baseX) < REBASE_PX && Math.abs(y - baseY) < REBASE_PX)) {
            baseX = Math.round(x);
            baseY = Math.round(y);
            body.style.setProperty("--sun-x", `${(baseX / innerWidth) * 100}%`);
            body.style.setProperty("--sun-y", `${(baseY / innerHeight) * 100}%`);
        }
        const ox = (x - baseX).toFixed(3), oy = (y - baseY).toFixed(3);
        sun.style.translate = `${ox}px ${oy}px`;
        glintEl.style.translate = `calc(-50% + ${ox}px) 0`;
        const next = phaseForSun(x, y);
        if (next !== phase) setPhase(next);
        if (!squash) return;

        const now = performance.now();
        recent.push(now);
        while (recent.length && now - recent[0] > 6000) recent.shift();
        const dizzy = recent.length >= 6;

        orb.animate(
            dizzy
                ? [{ transform: "rotate(0)" }, { transform: "rotate(720deg) scale(0.85)" }, { transform: "rotate(720deg)" }]
                : [{ transform: "scale(1, 1)" }, { transform: "scale(1.25, 0.7)", offset: 0.25 }, { transform: "scale(0.85, 1.2)", offset: 0.6 }, { transform: "scale(1, 1)" }],
            { duration: dizzy ? 900 : 600, easing: "ease-out" }
        );

        if (dizzy) recent.length = 0;
    };

    // Drag: grab the orb and it follows the pointer; the click that ends a drag is swallowed so the sun doesn't jump.
    let drag = null, dragged = false;
    const overSun = e => {
        const r = orb.getBoundingClientRect();
        return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) <= r.width / 2;
    };
    document.addEventListener("pointerdown", e => {
        if (e.button !== 0 || e.target.closest("a") || !overSun(e)) return;
        const r = orb.getBoundingClientRect();
        drag = { dx: r.left + r.width / 2 - e.clientX, dy: r.top + r.height / 2 - e.clientY, x: e.clientX, y: e.clientY };
        dragged = false;
        // The sun sits behind the text and buttons, so stop the press turning into a text selection or a link drag,
        // and keep the pointer events with one element so passing over them does nothing.
        body.classList.add("grabbing");
        getSelection()?.removeAllRanges();
        try { e.target.setPointerCapture(e.pointerId); } catch {}
    });
    for (const type of ["selectstart", "dragstart"]) document.addEventListener(type, e => { if (drag) e.preventDefault(); });
    document.addEventListener("pointermove", e => {
        if (!drag) return;
        if (!dragged && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
        if (!dragged) {
            dragged = true;
            body.classList.add("dragging");
        }
        moveSun(e.clientX + drag.dx, e.clientY + drag.dy, false);
    });
    const endDrag = () => {
        if (!drag) return;
        drag = null;
        body.classList.remove("dragging", "grabbing");
    };
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);

    document.addEventListener("click", e => {
        if (dragged) { dragged = false; return; }
        if (e.target.closest("a")) return;
        moveSun(e.clientX, e.clientY);
    });

    // ----- Sun drift: a slow day cycle. The sun rises on the left, arcs over, sets on the right and
    // hurries back under the sea; the phases follow from its height. Move it by hand and it resumes from there.
    // The motion is a Web Animation on the sun and its reflection, so the compositor interpolates it at sub-pixel
    // precision (a transform set from script each frame is snapped to whole pixels and visibly steps).
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SECONDS_PER_RADIAN = 50;           // daytime pace: 10s per radian, so a full cycle is about 44 seconds
    const NIGHT_SPEED = 2.5;                 // below the horizon the sun moves faster so night doesn't drag
    const IDLE_BEFORE_RESUME = 6000;
    const TAU = 2 * Math.PI;
    const CYCLE = Math.PI + Math.PI / NIGHT_SPEED;   // in daytime-radians
    let anim = null, anim2 = null, gliding = false, resumeToken = 0;

    // Cycle position (0..CYCLE) <-> sun angle: the below-horizon half of the circle is traversed faster.
    const timeOf = th => (th <= Math.PI ? th : Math.PI + (th - Math.PI) / NIGHT_SPEED);
    const angleOf = t => (t <= Math.PI ? t : Math.PI + (t - Math.PI) * NIGHT_SPEED);

    const arc = th => {
        const h0 = innerHeight - sea.offsetHeight;
        const amp = h0 - innerHeight * 0.12;
        return { x: innerWidth * (0.5 - 0.42 * Math.cos(th)), y: h0 - amp * Math.sin(th) };
    };

    // Invert the arc from a position: above the horizon is the rising/setting half, below it the way back.
    const thetaFor = (x, y) => {
        const c = Math.max(-1, Math.min(1, (0.5 - x / innerWidth) / 0.42));
        return y > innerHeight - sea.offsetHeight ? TAU - Math.acos(c) : Math.acos(c);
    };

    const stopDrift = () => {
        resumeToken++;
        gliding = false;
        body.classList.remove("drifting");
        if (anim) {
            anim.cancel();
            anim2.cancel();
            anim = anim2 = null;
        }
    };
    cancelDrift = stopDrift;

    // Start the endless animation with the sun at angle th: one keyframe per degree, spaced by cycle time.
    const runDrift = th => {
        body.classList.add("drifting");
        const p0 = arc(th);
        baseX = Math.round(p0.x);
        baseY = Math.round(p0.y);
        body.style.setProperty("--sun-x", `${(baseX / innerWidth) * 100}%`);
        body.style.setProperty("--sun-y", `${(baseY / innerHeight) * 100}%`);
        sun.style.translate = "";
        glintEl.style.translate = "";
        const frames = [], gframes = [];
        for (let d = 0; d <= 360; d++) {
            const a = (d * Math.PI) / 180, p = arc(a);
            const offset = timeOf(a) / CYCLE;
            frames.push({ transform: `translate(${(p.x - baseX).toFixed(2)}px, ${(p.y - baseY).toFixed(2)}px)`, offset });
            gframes.push({ transform: `translateX(${(p.x - baseX).toFixed(2)}px)`, offset });
        }
        const opts = { duration: CYCLE * SECONDS_PER_RADIAN * 1000, iterations: Infinity, easing: "linear" };
        anim = sun.animate(frames, opts);
        anim2 = glintEl.animate(gframes, opts);
        anim.currentTime = anim2.currentTime = timeOf(th) * SECONDS_PER_RADIAN * 1000;
    };

    const startDrift = () => {
        const token = ++resumeToken;
        gliding = true;
        const th = thetaFor(sunPx.x, sunPx.y);
        const p = arc(th);
        moveSun(p.x, p.y, false, true);        // glide onto the arc with the sun's usual spring...
        setTimeout(() => {                     // ...then hand over to the animation
            if (token !== resumeToken) return;
            gliding = false;
            runDrift(th);
        }, 900);
    };

    // The animation moves the sun without script, so watch it only to keep the sky phase in step.
    const follow = () => {
        requestAnimationFrame(follow);
        if (!anim) return;
        const th = angleOf(((anim.currentTime / 1000 / SECONDS_PER_RADIAN) % CYCLE + CYCLE) % CYCLE);
        const p = arc(th);
        sunPx = p;
        const next = phaseForSun(p.x, p.y);
        if (next !== phase) setPhase(next);
    };
    requestAnimationFrame(follow);

    // Resume a few seconds after the last hand-placement of the sun.
    setInterval(() => {
        if (anim || gliding || drag || document.hidden || reducedMotion) return;
        if (performance.now() - lastUser > IDLE_BEFORE_RESUME) startDrift();
    }, 1000);

    // The arc is built from the viewport, so rebuild it (at the same moment of the day) when that changes.
    let rebuild = 0;
    addEventListener("resize", () => {
        clearTimeout(rebuild);
        if (!anim) {
            const cs = getComputedStyle(sun);
            sunPx = { x: parseFloat(cs.left), y: parseFloat(cs.top) };
            return;
        }
        rebuild = setTimeout(() => {
            if (!anim) return;
            const th = sunAngle();
            stopDrift();
            runDrift(th);
        }, 150);
    });
    const sunAngle = () => angleOf(((anim.currentTime / 1000 / SECONDS_PER_RADIAN) % CYCLE + CYCLE) % CYCLE);

    // ----- Night traffic: shooting stars and satellites -----
    const traffic = document.createElement("div");
    traffic.className = "traffic";
    traffic.setAttribute("aria-hidden", "true");
    document.querySelector(".sky").before(traffic);

    const rand = (a, b) => a + Math.random() * (b - a);

    const shootingStar = () => {
        const el = document.createElement("div");
        el.className = "shooter";
        const a = rand(15, 40) * (Math.random() < 0.5 ? 1 : -1) + (Math.random() < 0.5 ? 0 : 180);
        const dist = Math.max(innerWidth, innerHeight) * rand(0.25, 0.4);
        const x = rand(0.1, 0.9) * innerWidth, y = rand(0.02, 0.5) * innerHeight;
        const at = d => `translate(${x}px, ${y}px) rotate(${a}deg) translateX(${d}px)`;
        traffic.append(el);
        el.animate(
            [{ transform: at(0), opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: at(dist), opacity: 0 }],
            { duration: rand(700, 1300), easing: "ease-in" }
        ).onfinish = () => el.remove();
    };

    const satellite = () => {
        const el = document.createElement("div");
        el.className = "sat";
        const ltr = Math.random() < 0.5;
        const y0 = rand(0.05, 0.55) * innerHeight, drift = rand(-0.12, 0.12) * innerHeight;
        const x0 = ltr ? -10 : innerWidth + 10, x1 = ltr ? innerWidth + 10 : -10;
        traffic.append(el);
        el.animate(
            [{ transform: `translate(${x0}px, ${y0}px)`, opacity: 0 }, { opacity: 0.9, offset: 0.08 }, { opacity: 0.9, offset: 0.92 }, { transform: `translate(${x1}px, ${y0 + drift}px)`, opacity: 0 }],
            { duration: rand(14000, 24000), easing: "linear" }
        ).onfinish = () => el.remove();
    };

    const spawn = () => {
        if (phase === "night" && !document.hidden && traffic.childElementCount < 4) {
            if (Math.random() < 0.65) shootingStar();
            else if (!traffic.querySelector(".sat")) satellite();
        }
        setTimeout(spawn, rand(1800, 5500));
    };
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(spawn, 1500);

    // ----- Day flyer: a hot air balloon wizzes past -----
    const flyers = document.createElement("div");
    flyers.className = "flyers";
    flyers.setAttribute("aria-hidden", "true");
    document.querySelector(".sky").before(flyers);

    const BALLOONS = [["#e5484d", "#ffd166"], ["#3b82f6", "#fff1c1"], ["#f08a24", "#ffffff"], ["#8b5cf6", "#ffd1e8"]];

    const balloon = () => {
        const [a, b] = BALLOONS[Math.floor(Math.random() * BALLOONS.length)];
        const el = document.createElement("div");
        el.className = "balloon";
        const ltr = Math.random() < 0.5;
        el.innerHTML = `<svg viewBox="0 -7 60 91"><defs><clipPath id="bal-clip"><path d="M30 2C12 2 3 14 3 28c0 12 7 22 16 30h22c9-8 16-18 16-30C57 14 48 2 30 2z"/></clipPath></defs><path d="M30 2V-4" stroke="#3a3550" stroke-width="1"/><path d="M30 -4l${ltr ? -7 : 7} 2.2 ${ltr ? 7 : -7} 2.2z" fill="${b}"/><path d="M30 2C12 2 3 14 3 28c0 12 7 22 16 30h22c9-8 16-18 16-30C57 14 48 2 30 2z" fill="${a}"/><g clip-path="url(#bal-clip)"><path d="M30 2C20 8 16 18 16 30c0 12 4 22 8 28h12c4-6 8-16 8-28C44 18 40 8 30 2z" fill="${b}"/><path d="M30 2c-3 6-4 16-4 28 0 12 1 22 2 28h4c1-6 2-16 2-28C34 18 33 8 30 2z" fill="${a}"/><rect x="0" y="38" width="60" height="5" fill="${b}" opacity=".9"/><rect x="0" y="39.5" width="60" height="1.6" fill="${a}"/><rect x="40" y="0" width="20" height="62" fill="#000" opacity=".1"/><ellipse cx="17" cy="17" rx="3.5" ry="8" transform="rotate(18 17 17)" fill="#fff" opacity=".28"/></g><path d="M19 58h22l-2 4.5H21z" fill="#3a3550"/><path class="flame" d="M30 66.5c-2.4-2.2-2-4.4 0-6.4 2 2 2.4 4.2 0 6.4z" fill="#ffb02e"/><path class="flame" d="M30 66c-1-1.1-.9-2.2 0-3.2.9 1 1 2.1 0 3.2z" fill="#fff3b0"/><path d="M21.5 62.5L24 71M38.5 62.5L36 71M30 66V71" stroke="#3a3550" stroke-width=".8"/><circle cx="30" cy="70" r="2.8" fill="#ffd8b0"/><circle cx="29" cy="69.6" r=".5" fill="#3a3550"/><circle cx="31" cy="69.6" r=".5" fill="#3a3550"/><rect x="22.5" y="71" width="15" height="10" rx="2" fill="#b57a42"/><rect x="22" y="70.5" width="16" height="2.6" rx="1.2" fill="#8a5a34"/><path d="M23 75.5h14M23 78.5h14" stroke="#8a5a34" stroke-width=".8"/><path d="M27 73.5v7.5M33 73.5v7.5" stroke="#8a5a34" stroke-width=".6" opacity=".7"/></svg>`;
        const y0 = rand(0.08, 0.5) * innerHeight, rise = rand(-0.1, 0.05) * innerHeight;
        const w = Math.max(36, Math.min(innerWidth, innerHeight) * 0.055);
        const x0 = ltr ? -w - 10 : innerWidth + 10, x1 = ltr ? innerWidth + 10 : -w - 10;
        flyers.append(el);
        el.animate(
            [{ transform: `translate(${x0}px, ${y0}px)` }, { transform: `translate(${x1}px, ${y0 + rise}px)` }],
            { duration: rand(9000, 14000), easing: "linear" }
        ).onfinish = () => el.remove();
    };

    // At dawn a plane crosses much faster, leaving a contrail.
    const plane = () => {
        const el = document.createElement("div");
        el.className = "plane";
        const ltr = Math.random() < 0.5;
        el.innerHTML = `<div class="plane-in" style="transform: scaleX(${ltr ? 1 : -1})"><span class="trail far"></span><span class="trail"></span><svg viewBox="0 0 120 40" fill="currentColor"><path d="M62 15L76 15L54 6H49z" opacity=".55"/><path d="M12 15L6 20H12L28 18z" opacity=".55"/><path d="M72 22H86L58 37H49z" opacity=".8"/><rect x="63" y="27.5" width="17" height="6.5" rx="3.2"/><rect x="77" y="28.5" width="3.5" height="4.5" rx="1.6" opacity=".45"/><path d="M4 12L1 2H8L27 14z"/><path d="M4 12L22 14H90C103 14 112 17 117 21C112 25 103 27 90 27H30C20 27 10 20 4 12z"/><path d="M24 24.5H92" stroke="var(--sky-top)" stroke-width=".7" opacity=".35" fill="none"/><g fill="var(--sky-top)" opacity=".6"><circle cx="32" cy="18.5" r="1.1"/><circle cx="37" cy="18.5" r="1.1"/><circle cx="42" cy="18.5" r="1.1"/><circle cx="47" cy="18.5" r="1.1"/><circle cx="52" cy="18.5" r="1.1"/><circle cx="57" cy="18.5" r="1.1"/><circle cx="62" cy="18.5" r="1.1"/><circle cx="67" cy="18.5" r="1.1"/><circle cx="72" cy="18.5" r="1.1"/><circle cx="77" cy="18.5" r="1.1"/><circle cx="82" cy="18.5" r="1.1"/><circle cx="87" cy="18.5" r="1.1"/></g><path d="M100 16.5L108 18.4H100z" fill="var(--sky-top)" opacity=".7"/><circle class="nav" cx="2.6" cy="2.6" r="1.4" fill="#ff5a5a"/></svg></div>`;
        const y0 = rand(0.1, 0.45) * innerHeight, rise = rand(-0.12, -0.02) * innerHeight;
        const w = Math.max(44, Math.min(innerWidth, innerHeight) * 0.06), trail = Math.min(innerWidth, innerHeight) * 0.28;
        const x0 = ltr ? -w - trail : innerWidth + w + trail, x1 = ltr ? innerWidth + w + trail : -2 * w - trail;
        flyers.append(el);
        el.animate(
            [{ transform: `translate(${x0}px, ${y0}px)` }, { transform: `translate(${x1}px, ${y0 + rise}px)` }],
            { duration: rand(5000, 8000), easing: "linear" }
        ).onfinish = () => el.remove();
    };

    // At dusk a UFO beams a cow up as it cruises by.
    const ufo = () => {
        const el = document.createElement("div");
        el.className = "ufo";
        el.innerHTML = `<svg viewBox="0 0 80 90"><defs><linearGradient id="ufo-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4ffc4" stop-opacity=".8"/><stop offset="1" stop-color="#e4ffc4" stop-opacity=".1"/></linearGradient></defs><path class="beam" d="M31 22H49L66 88H14z" fill="url(#ufo-beam)"/><g class="cow"><path d="M29 63c-4-2-5 1-4 4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><g fill="#fff"><rect x="31" y="68" width="3.4" height="8" rx="1.7"/><rect x="36" y="69" width="3.4" height="7" rx="1.7"/><rect x="44" y="69" width="3.4" height="7" rx="1.7"/><rect x="49" y="68" width="3.4" height="8" rx="1.7"/></g><g fill="#3a3550"><rect x="31" y="74" width="3.4" height="2.2" rx="1.1"/><rect x="36" y="74" width="3.4" height="2.2" rx="1.1"/><rect x="44" y="74" width="3.4" height="2.2" rx="1.1"/><rect x="49" y="74" width="3.4" height="2.2" rx="1.1"/></g><ellipse cx="41" cy="64" rx="12" ry="8" fill="#fff"/><path d="M34 59c4-2 7 0 6 4-3 2-7 1-6-4zM46 65c3-1 5 1 4 4-3 1-5-1-4-4z" fill="#3a3550"/><g fill="#3a3550"><ellipse cx="46" cy="53.5" rx="1.8" ry="2.6" transform="rotate(-25 46 53.5)"/><ellipse cx="58" cy="53.5" rx="1.8" ry="2.6" transform="rotate(25 58 53.5)"/></g><circle cx="52" cy="59" r="7" fill="#fff"/><ellipse cx="54.5" cy="62" rx="4.2" ry="3" fill="#ffb8c8"/><circle cx="48.8" cy="57.5" r="1.6" fill="#3a3550"/><circle cx="55.2" cy="57.5" r="1.6" fill="#3a3550"/><circle cx="49.3" cy="57" r=".5" fill="#fff"/><circle cx="55.7" cy="57" r=".5" fill="#fff"/><circle cx="53" cy="62" r=".55" fill="#c0607a"/><circle cx="56" cy="62" r=".55" fill="#c0607a"/></g><path d="M32 15a8 8 0 0 1 16 0z" fill="#c9efff"/><circle cx="40" cy="12.2" r="3.6" fill="#8fe388"/><circle cx="38.6" cy="11.8" r=".9" fill="#2b3a2b"/><circle cx="41.4" cy="11.8" r=".9" fill="#2b3a2b"/><ellipse cx="40" cy="18" rx="28" ry="7" fill="#b9c3d9"/><ellipse cx="40" cy="21" rx="15" ry="3.5" fill="#8a96b3"/><circle class="light" cx="20" cy="18.5" r="1.7" fill="#ffe27a" style="animation-delay:0.00s"/><circle class="light" cx="30" cy="18.5" r="1.7" fill="#ffe27a" style="animation-delay:0.18s"/><circle class="light" cx="40" cy="18.5" r="1.7" fill="#ffe27a" style="animation-delay:0.36s"/><circle class="light" cx="50" cy="18.5" r="1.7" fill="#ffe27a" style="animation-delay:0.54s"/><circle class="light" cx="60" cy="18.5" r="1.7" fill="#ffe27a" style="animation-delay:0.72s"/></svg>`;
        const ltr = Math.random() < 0.5;
        const y0 = rand(0.06, 0.4) * innerHeight, rise = rand(-0.06, 0.06) * innerHeight;
        const w = Math.max(52, Math.min(innerWidth, innerHeight) * 0.075);
        const x0 = ltr ? -w - 10 : innerWidth + 10, x1 = ltr ? innerWidth + 10 : -w - 10;
        flyers.append(el);
        el.animate(
            [{ transform: `translate(${x0}px, ${y0}px)` }, { transform: `translate(${x1}px, ${y0 + rise}px)` }],
            { duration: rand(7000, 11000), easing: "linear" }
        ).onfinish = () => el.remove();
    };

    const flyBy = () => {
        if (!document.hidden && !flyers.childElementCount) {
            if (phase === "day") balloon();
            else if (phase === "dawn") plane();
            else if (phase === "dusk") ufo();
        }
        setTimeout(flyBy, rand(9000, 22000));
    };
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(flyBy, 3000);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Glow: clouds crossing the sun light up with its colour, strongest when centred on it.
    const clouds = [...document.querySelectorAll(".cloud")].map(el => ({ el, g: -1 }));
    const sea = document.querySelector(".sea");
    let glint = -1;
    const horizon = () => innerHeight - sea.offsetHeight;
    const glow = () => {
        const s = orb.getBoundingClientRect();
        const sx = s.left + s.width / 2, sy = s.top + s.height / 2;
        const gl = sy < horizon() ? Math.min(1, (horizon() - sy) / (innerHeight * 0.2) + 0.3) : 0;
        if (Math.abs(gl - glint) > 0.01) {
            glint = gl;
            sea.style.setProperty("--glint", gl.toFixed(2));
        }
        for (const c of clouds) {
            const r = c.el.getBoundingClientRect();
            const dist = Math.hypot(r.left + r.width / 2 - sx, r.top + r.height / 2 - sy);
            const g = Math.max(0, 1 - dist / (r.width / 2 + s.width * 0.75));
            const q = Math.round(g * 20) / 20;
            if (q !== c.g) {
                c.g = q;
                c.el.style.setProperty("--glow", q);
            }
        }
        requestAnimationFrame(glow);
    };
    if (!reduced) requestAnimationFrame(glow);

    // Start already on the arc (mid-morning, up on the left) so there is no jump onto it when the page loads.
    const START_ANGLE = (115 * Math.PI) / 180;
    const start = arc(START_ANGLE);
    sunPx = start;
    phase = phaseForSun(start.x, start.y);
    setPhase(phase);
    if (reducedMotion) moveSun(start.x, start.y, false, true);
    else runDrift(START_ANGLE);
})();
