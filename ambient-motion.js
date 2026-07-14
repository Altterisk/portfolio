(() => {
    'use strict';

    const canvas = document.getElementById('ambientCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sectionIds = ['home', 'about', 'projects', 'skills', 'experience', 'education'];
    const sectionMeta = [
        ['01', 'Origin'],
        ['02', 'Signal'],
        ['03', 'Systems'],
        ['04', 'Constellation'],
        ['05', 'Trajectory'],
        ['06', 'Resolve']
    ];
    const colors = [
        [99, 245, 210],
        [102, 205, 255],
        [255, 207, 112],
        [157, 126, 255],
        [99, 245, 210],
        [239, 246, 255]
    ];

    const NODE_COUNT = 84;
    const nodes = Array.from({ length: NODE_COUNT }, (_, index) => ({
        index,
        x: Math.random(),
        y: Math.random(),
        tx: 0.5,
        ty: 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.55 + Math.random() * 0.8,
        size: index % 11 === 0 ? 2.2 : 0.7 + Math.random() * 1.15
    }));

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stateIndex = 0;
    let targetColor = colors[0].slice();
    let color = colors[0].slice();
    let pointerX = 0;
    let pointerY = 0;
    let raf = 0;
    let running = true;

    function seeded(index, salt = 0) {
        const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
        return value - Math.floor(value);
    }

    function layoutFor(index, state) {
        const u = index / (NODE_COUNT - 1);

        if (state === 0) {
            const ring = index % 3;
            const angle = u * Math.PI * 8 + ring * 0.7;
            const radiusX = 0.11 + ring * 0.105;
            const radiusY = radiusX * 0.62;
            return [0.72 + Math.cos(angle) * radiusX, 0.48 + Math.sin(angle) * radiusY];
        }

        if (state === 1) {
            const row = index % 3;
            const x = 0.08 + u * 0.84;
            const y = 0.32 + row * 0.17 + Math.sin(u * Math.PI * (3 + row) + row) * 0.055;
            return [x, y];
        }

        if (state === 2) {
            const cols = 12;
            const col = index % cols;
            const row = Math.floor(index / cols);
            return [0.12 + col * 0.069, 0.18 + row * 0.105];
        }

        if (state === 3) {
            const centers = [[0.2, 0.32], [0.48, 0.23], [0.76, 0.35], [0.3, 0.67], [0.62, 0.65], [0.86, 0.72]];
            const cluster = index % centers.length;
            const angle = seeded(index, 2) * Math.PI * 2;
            const radius = 0.025 + seeded(index, 3) * 0.085;
            return [centers[cluster][0] + Math.cos(angle) * radius, centers[cluster][1] + Math.sin(angle) * radius];
        }

        if (state === 4) {
            const side = index % 4;
            const y = 0.1 + u * 0.82;
            const x = side === 0 ? 0.22 : 0.22 + (0.08 + seeded(index, 5) * 0.48) * (side % 2 ? 1 : -0.12);
            return [x, y];
        }

        const ring = index % 4;
        const angle = u * Math.PI * 10 + ring * 0.8;
        const radius = 0.08 + ring * 0.065;
        return [0.5 + Math.cos(angle) * radius, 0.47 + Math.sin(angle) * radius];
    }

    function setState(index) {
        stateIndex = Math.max(0, Math.min(sectionIds.length - 1, index));
        targetColor = colors[stateIndex].slice();
        nodes.forEach(node => {
            [node.tx, node.ty] = layoutFor(node.index, stateIndex);
        });

        const indexEl = document.querySelector('.section-readout-index');
        const nameEl = document.querySelector('.section-readout-name');
        if (indexEl) indexEl.textContent = sectionMeta[stateIndex][0];
        if (nameEl) nameEl.textContent = sectionMeta[stateIndex][1];

        if (reducedMotion.matches) {
            nodes.forEach(node => { node.x = node.tx; node.y = node.ty; });
            draw(performance.now(), true);
        } else {
            start();
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.6);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (reducedMotion.matches) draw(performance.now(), true);
    }

    function shouldConnect(a, b) {
        if (stateIndex === 0 || stateIndex === 5) return Math.abs(a.index - b.index) <= 3;
        if (stateIndex === 1) return a.index % 3 === b.index % 3 && Math.abs(a.index - b.index) <= 6;
        if (stateIndex === 2) return Math.abs(a.index - b.index) === 1 || Math.abs(a.index - b.index) === 12;
        if (stateIndex === 3) return a.index % 6 === b.index % 6;
        return Math.abs(a.index - b.index) <= 4;
    }

    function draw(time, forceStatic = false) {
        ctx.clearRect(0, 0, width, height);
        const t = time * 0.001;
        const motion = forceStatic ? 0 : 1;

        color = color.map((value, index) => value + (targetColor[index] - value) * 0.045);
        const rgb = color.map(Math.round).join(',');

        nodes.forEach(node => {
            const ease = forceStatic ? 1 : 0.035;
            node.x += (node.tx - node.x) * ease;
            node.y += (node.ty - node.y) * ease;
        });

        ctx.lineWidth = 0.7;
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                if (!shouldConnect(a, b)) continue;
                const ax = a.x * width;
                const ay = a.y * height;
                const bx = b.x * width;
                const by = b.y * height;
                const distance = Math.hypot(ax - bx, ay - by);
                if (distance > Math.min(width, height) * 0.2) continue;
                const alpha = Math.max(0, 0.14 - distance / Math.min(width, height) * 0.55);
                ctx.strokeStyle = `rgba(${rgb},${alpha})`;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.stroke();
            }
        }

        nodes.forEach(node => {
            const idleX = Math.sin(t * node.speed + node.phase) * 3.2 * motion;
            const idleY = Math.cos(t * node.speed * 0.8 + node.phase) * 3.2 * motion;
            const depth = 0.35 + node.size / 3;
            const x = node.x * width + idleX + pointerX * depth;
            const y = node.y * height + idleY + pointerY * depth;
            const pulse = forceStatic ? 1 : 0.78 + Math.sin(t * 1.5 + node.phase) * 0.22;

            if (node.size > 1.8) {
                const glow = ctx.createRadialGradient(x, y, 0, x, y, 18);
                glow.addColorStop(0, `rgba(${rgb},${0.18 * pulse})`);
                glow.addColorStop(1, `rgba(${rgb},0)`);
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = `rgba(${rgb},${0.34 + node.size * 0.16})`;
            ctx.beginPath();
            ctx.arc(x, y, node.size * pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!forceStatic && running) raf = requestAnimationFrame(draw);
    }

    function start() {
        if (reducedMotion.matches || raf) return;
        running = true;
        raf = requestAnimationFrame(draw);
    }

    function stop() {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
    }

    window.addEventListener('portfolio:sectionchange', event => {
        const next = sectionIds.indexOf(event.detail.id);
        if (next >= 0) setState(next);
    });

    window.addEventListener('pointermove', event => {
        if (reducedMotion.matches || event.pointerType === 'touch') return;
        pointerX = (event.clientX / width - 0.5) * 13;
        pointerY = (event.clientY / height - 0.5) * 13;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
    });

    reducedMotion.addEventListener('change', () => {
        stop();
        if (reducedMotion.matches) draw(performance.now(), true); else start();
    });

    window.addEventListener('resize', resize, { passive: true });
    resize();
    const initialId = document.body.dataset.motionSection || 'home';
    setState(Math.max(0, sectionIds.indexOf(initialId)));
})();
