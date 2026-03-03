/**
 * GoT MCP Landing Page — Interactive Graph + Scroll Reveal
 */

// ==========================================
// Hero Graph Visualization
// ==========================================

const graphNodes = [
    { id: 'root', label: '🎯 Root', x: 48, y: 8, type: 'active' },
    { id: 'n1', label: '📖 A', x: 22, y: 28, type: 'validated' },
    { id: 'n2', label: '📖 B', x: 52, y: 25, type: 'active' },
    { id: 'n3', label: '📖 C', x: 78, y: 30, type: 'rejected' },
    { id: 'n4', label: '✅ A1', x: 10, y: 52, type: 'validated' },
    { id: 'n5', label: '🌿 A2', x: 35, y: 50, type: 'validated' },
    { id: 'n6', label: '❌ B1', x: 60, y: 50, type: 'rejected' },
    { id: 'n7', label: '🔬 R', x: 15, y: 72, type: 'validated' },
    { id: 'n8', label: '🏆', x: 38, y: 78, type: 'winner' },
];

const graphEdges = [
    { from: 'root', to: 'n1', color: '#00e5ff' },
    { from: 'root', to: 'n2', color: '#00e5ff' },
    { from: 'root', to: 'n3', color: '#ff4444' },
    { from: 'n1', to: 'n4', color: '#00ff88' },
    { from: 'n1', to: 'n5', color: '#00ff88' },
    { from: 'n2', to: 'n6', color: '#ff4444' },
    { from: 'n4', to: 'n7', color: '#ff00ff' },
    { from: 'n5', to: 'n8', color: '#ffd700' },
    { from: 'n7', to: 'n8', color: '#ffd700' },
];

function initHeroGraph() {
    const container = document.getElementById('hero-graph');
    const svgEl = document.getElementById('graph-edges');
    if (!container || !svgEl) return;

    // Create nodes
    graphNodes.forEach((node, i) => {
        const el = document.createElement('div');
        el.className = `graph-node node-${node.type}`;
        el.style.left = `${node.x}%`;
        el.style.top = `${node.y}%`;
        el.style.transform = 'translate(-50%, -50%)';
        el.style.animationDelay = `${i * 0.15}s`;
        el.style.opacity = '0';
        el.style.animation = `fadeInUp 0.6s ease-out ${i * 0.12}s forwards`;
        el.textContent = node.label;
        el.dataset.id = node.id;
        container.appendChild(el);
    });

    // Draw edges after a short delay (let nodes position first)
    setTimeout(() => {
        drawEdges(container, svgEl);
    }, 100);

    // Redraw on resize
    window.addEventListener('resize', () => drawEdges(container, svgEl));

    // Add floating animation
    setInterval(() => {
        const nodes = container.querySelectorAll('.graph-node');
        nodes.forEach(node => {
            const dx = (Math.random() - 0.5) * 4;
            const dy = (Math.random() - 0.5) * 4;
            const current = node.style.transform || '';
            node.style.transition = 'transform 3s ease-in-out';
            node.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        });
    }, 3000);
}

function drawEdges(container, svgEl) {
    const rect = container.getBoundingClientRect();
    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    graphEdges.forEach((edge, i) => {
        const fromNode = container.querySelector(`[data-id="${edge.from}"]`);
        const toNode = container.querySelector(`[data-id="${edge.to}"]`);
        if (!fromNode || !toNode) return;

        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();

        const x1 = fromRect.left - rect.left + fromRect.width / 2;
        const y1 = fromRect.top - rect.top + fromRect.height / 2;
        const x2 = toRect.left - rect.left + toRect.width / 2;
        const y2 = toRect.top - rect.top + toRect.height / 2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', edge.color);
        line.setAttribute('stroke-opacity', '0.5');
        line.style.animationDelay = `${i * 0.1}s`;
        svgEl.appendChild(line);
    });
}

// ==========================================
// Scroll Reveal
// ==========================================

function initScrollReveal() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ==========================================
// Stat Counter Animation
// ==========================================

function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    entry.target.dataset.counted = 'true';
                    animateCounter(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
    const text = el.textContent;
    const num = parseInt(text);
    if (isNaN(num)) return; // Skip non-numeric (v4.0, ∞)

    const duration = 1200;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(num * ease);
        if (progress < 1) requestAnimationFrame(step);
    }

    el.textContent = '0';
    requestAnimationFrame(step);
}

// ==========================================
// Nav scroll effect
// ==========================================

function initNavScroll() {
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(5, 5, 16, 0.95)';
            nav.style.borderBottomColor = 'rgba(0, 229, 255, 0.1)';
        } else {
            nav.style.background = 'rgba(5, 5, 16, 0.85)';
            nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
        }
    });
}

// ==========================================
// Smooth scroll for anchor links
// ==========================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ==========================================
// Init
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initHeroGraph();
    initScrollReveal();
    initCounters();
    initNavScroll();
    initSmoothScroll();
});
