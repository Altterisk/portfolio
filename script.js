// ---------------------------------------------------------------------------
// Setup / feature detection
// ---------------------------------------------------------------------------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

const navEl = document.querySelector('.site-nav');
const lightbox = document.getElementById('lightbox');

// Keep --nav-height in sync with the real (responsive) nav height so scroll-snap /
// scroll-padding / manual offset calculations all line up under the sticky nav.
function updateNavHeightVar() {
    if (!navEl) return;
    document.documentElement.style.setProperty('--nav-height', `${navEl.offsetHeight}px`);
}
updateNavHeightVar();
window.addEventListener('load', updateNavHeightVar);
window.addEventListener('resize', updateNavHeightVar);

// Shared smooth-scroll helper: scrolls so `target`'s top sits just below the nav.
function scrollToTarget(target) {
    if (!target) {
        window.scrollTo({ top: 0, behavior: scrollBehavior });
        return;
    }
    // Begin the visual state change with the gesture instead of waiting for the
    // target to reach the observer's center line.
    if (target.id) setActiveSection(target.id);
    const navHeight = navEl ? navEl.offsetHeight : 0;
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({ top: targetPosition, behavior: scrollBehavior });
}

// Smooth scrolling for top navigation links
document.querySelectorAll('.site-nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetSection = document.querySelector(this.getAttribute('href'));
        scrollToTarget(targetSection);
    });
});

// Smooth scrolling for the dot navigation
document.querySelectorAll('.dot-nav a.dot-link').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetSection = document.querySelector(this.getAttribute('href'));
        scrollToTarget(targetSection);
    });
});

// ---------------------------------------------------------------------------
// Projects horizontal carousel.
// The projects panel is exactly one viewport tall, so the cards live in a
// horizontal scroll-snap track instead of a vertical grid.
// ---------------------------------------------------------------------------
const track = document.getElementById('projectsTrack');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');

// Distance of one "page" of the carousel: a card plus the flex gap.
function cardStep() {
    if (!track) return 0;
    const firstVisible = track.querySelector('.project-card:not(.hidden)');
    if (!firstVisible) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return firstVisible.offsetWidth + gap;
}

// Tolerance, not an exact 0/max comparison: the track has a few px of padding, so
// scroll snapping rests the first card at scrollLeft ~4 rather than 0. Treating that
// as "not at the start" would leave the Prev arrow enabled AND — much worse — stop
// the wheel handler from passing an upward scroll through, trapping the user in the
// projects panel.
const EDGE_TOLERANCE = 8;

function carouselAtStart() {
    return !track || track.scrollLeft <= EDGE_TOLERANCE;
}

function carouselAtEnd() {
    if (!track) return true;
    return track.scrollLeft >= track.scrollWidth - track.clientWidth - EDGE_TOLERANCE;
}

function updateCarouselArrows() {
    if (!track || !carouselPrev || !carouselNext) return;
    // A filtered-down set can fit entirely on screen — disable both arrows then.
    const overflows = track.scrollWidth > track.clientWidth + 1;
    carouselPrev.disabled = !overflows || carouselAtStart();
    carouselNext.disabled = !overflows || carouselAtEnd();
}

function scrollCarousel(direction) {
    if (!track) return;
    track.scrollBy({ left: direction * cardStep(), behavior: scrollBehavior });
}

if (track && carouselPrev && carouselNext) {
    carouselPrev.addEventListener('click', () => scrollCarousel(-1));
    carouselNext.addEventListener('click', () => scrollCarousel(1));
    track.addEventListener('scroll', updateCarouselArrows, { passive: true });
    window.addEventListener('resize', updateCarouselArrows);
    updateCarouselArrows();

    // Wheel cascade over the carousel. A single vertical wheel has three plausible
    // meanings here, so they're consumed strictly in order of locality:
    //
    //   1. the card under the cursor still has content to scroll -> scroll the card
    //   2. otherwise, the carousel still has cards to move to     -> move sideways
    //   3. otherwise                                              -> don't touch it;
    //      the event bubbles and the page snaps to the next section
    //
    // Step 1 is why we can't just hijack every deltaY: doing that made the cards'
    // own scrollbars unreachable with the wheel. Because each step only fires once
    // the previous one is exhausted, you can always read a card, then browse cards,
    // then leave the section — without ever repositioning the mouse.
    function cardCanScroll(card, delta) {
        if (!card) return false;
        if (card.scrollHeight <= card.clientHeight + 1) return false;
        return delta > 0
            ? card.scrollTop < card.scrollHeight - card.clientHeight - 1
            : card.scrollTop > 1;
    }

    track.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return;                               // pinch-zoom
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // real horizontal gesture
        if (e.deltaY === 0) return;

        // 1. Let the hovered card scroll itself.
        if (cardCanScroll(e.target.closest('.project-card'), e.deltaY)) return;

        // 2. Move the carousel.
        if (track.scrollWidth <= track.clientWidth) return;
        if (e.deltaY < 0 && carouselAtStart()) return;
        if (e.deltaY > 0 && carouselAtEnd()) return;

        e.preventDefault();
        track.scrollLeft += e.deltaY;
    }, { passive: false });

    // Drag-to-pan, so the carousel is also directly grabbable with a mouse.
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        if (e.target.closest('a, button, .screenshot-thumb, .screenshot-more')) return;
        dragging = true;
        dragStartX = e.clientX;
        dragStartScroll = track.scrollLeft;
    });

    track.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        if (Math.abs(dx) < 3) return;
        // Snapping fights a live drag, so suspend it until the pointer is released.
        track.style.scrollSnapType = 'none';
        track.classList.add('dragging');
        track.setPointerCapture(e.pointerId);
        track.scrollLeft = dragStartScroll - dx;
    });

    function endDrag() {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('dragging');
        track.style.scrollSnapType = '';   // re-enable snap; the browser settles on the nearest card
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
}

// Project filtering functionality
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');

        const filterValue = button.getAttribute('data-filter');

        projectCards.forEach(card => {
            const show = filterValue === 'all' || (card.getAttribute('data-category') || '').includes(filterValue);

            if (show) {
                card.classList.remove('hidden');
                card.style.animation = 'fadeIn 0.5s ease-in';
                card.addEventListener('animationend', function clearInlineAnim() {
                    card.style.animation = '';
                    card.removeEventListener('animationend', clearInlineAnim);
                }, { once: true });
            } else {
                card.classList.add('hidden');
            }
        });

        // Rewind the carousel: the old scrollLeft is meaningless against a new,
        // shorter set of cards (and would otherwise strand the user past the end).
        if (track) {
            track.scrollTo({ left: 0, behavior: 'auto' });
            requestAnimationFrame(updateCarouselArrows);
        }
    });
});

// ---------------------------------------------------------------------------
// Active-section tracking: drives the top nav highlight AND the dot nav,
// from a single Intersection Observer so both stay perfectly in sync.
// ---------------------------------------------------------------------------
const panelSections = [
    document.getElementById('home'),
    document.getElementById('about'),
    document.getElementById('projects'),
    document.getElementById('skills'),
    document.getElementById('experience'),
    document.getElementById('education')
].filter(Boolean);

const dotLinks = document.querySelectorAll('.dot-nav a.dot-link');
const topNavLinks = document.querySelectorAll('.site-nav a');
let activeMotionSection = '';
let activeMotionIndex = -1;

function setActiveSection(id) {
    dotLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === id);
    });
    topNavLinks.forEach(link => {
        link.classList.toggle('active-link', link.getAttribute('href') === `#${id}`);
    });

    const nextIndex = panelSections.findIndex(section => section.id === id);
    if (nextIndex < 0 || id === activeMotionSection) return;

    const previousId = activeMotionSection;
    const direction = activeMotionIndex < 0 || nextIndex >= activeMotionIndex ? 'forward' : 'backward';
    activeMotionSection = id;
    activeMotionIndex = nextIndex;

    document.body.dataset.motionSection = id;
    document.body.dataset.motionDirection = direction;
    panelSections.forEach((section, index) => {
        section.classList.toggle('is-motion-active', index === nextIndex);
        section.classList.toggle('is-motion-before', index < nextIndex);
        section.classList.toggle('is-motion-after', index > nextIndex);
    });

    document.body.classList.remove('section-transitioning');
    // Force a style flush so rapid reverse navigation restarts the transition cleanly.
    void document.body.offsetWidth;
    document.body.classList.add('section-transitioning');
    window.setTimeout(() => document.body.classList.remove('section-transitioning'), 760);

    window.dispatchEvent(new CustomEvent('portfolio:sectionchange', {
        detail: { id, previousId, index: nextIndex, direction }
    }));
}

const sectionObserver = new IntersectionObserver((entries) => {
    // Prefer the entry closest to vertical center of the viewport among those intersecting.
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;

    let best = visible[0];
    let bestDist = Infinity;
    visible.forEach(entry => {
        const rect = entry.boundingClientRect;
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(center - window.innerHeight / 2);
        if (dist < bestDist) {
            bestDist = dist;
            best = entry;
        }
    });

    setActiveSection(best.target.id);
}, {
    threshold: 0,
    rootMargin: '-45% 0px -45% 0px'
});

panelSections.forEach(section => sectionObserver.observe(section));
setActiveSection('home');

// ---------------------------------------------------------------------------
// Scroll progress bar + parallax hero, batched into one rAF-throttled handler.
// ---------------------------------------------------------------------------
const scrollProgressEl = document.getElementById('scrollProgress');
const headerEl = document.getElementById('home');

let ticking = false;

function updateOnScroll() {
    const scrollTop = window.pageYOffset;

    // Progress bar
    if (scrollProgressEl) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollProgressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    // Parallax hero. Every layer drifts UPWARD (negative Y) and the rate DECREASES
    // down the stack, so the gap between any two layers only ever grows — the
    // subtitle can never ride down onto the contact buttons. Clamped at the hero's
    // own height so the layers settle once it's scrolled past.
    if (!prefersReducedMotion && headerEl) {
        const headerHeight = headerEl.offsetHeight || window.innerHeight;
        const y = Math.min(scrollTop, headerHeight);
        const root = document.documentElement.style;
        root.setProperty('--py-avatar', `${-y * 0.35}px`);
        root.setProperty('--py-title', `${-y * 0.25}px`);
        root.setProperty('--py-subtitle', `${-y * 0.15}px`);
        root.setProperty('--py-contact', `${-y * 0.05}px`);
        // Fade the hero out over the first 70% of its height.
        const fade = 1 - Math.min(1, y / (headerHeight * 0.7));
        root.setProperty('--hero-opacity', `${fade}`);
    }

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateOnScroll);
        ticking = true;
    }
}, { passive: true });

updateOnScroll();

// ---------------------------------------------------------------------------
// Keyboard navigation.
//   ArrowUp/Down, PageUp/Down -> previous/next section (every section is now one
//   viewport tall, so no special case for #projects is needed any more).
//   ArrowLeft/Right           -> previous/next project card, while Projects is active.
// ---------------------------------------------------------------------------
const projectsSection = document.getElementById('projects');

function currentSectionIndex() {
    const mid = window.innerHeight / 2;
    for (let i = panelSections.length - 1; i >= 0; i--) {
        if (panelSections[i].getBoundingClientRect().top <= mid) return i;
    }
    return 0;
}

function keyboardNavBlocked() {
    if (lightbox && lightbox.classList.contains('active')) return true;
    const active = document.activeElement;
    return !!(active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable));
}

// ---------------------------------------------------------------------------
// Wheel-driven section jumping.
//
// `scroll-snap-type: y mandatory` alone does NOT do what you'd hope here. A wheel
// notch scrolls a few hundred px, which is short of the halfway point between two
// 833px sections, so the browser snaps straight back where it came from — the page
// visibly refuses to move. Snapping only carries you forward once a gesture happens
// to accumulate past the midpoint, which feels like the page is fighting you.
//
// So the wheel drives the section change explicitly: one gesture = exactly one
// section, with a cooldown so a trackpad's event storm doesn't fly through five of
// them. Snap stays on underneath as the rest-position guarantee for scrollbar drags
// and touch. Anything the page shouldn't own — a card mid-scroll, a panel with an
// internal scrollbar, or a wheel the carousel already consumed — is handed back.
// ---------------------------------------------------------------------------
let sectionJumpLock = false;

// Must mirror the CSS breakpoint that drops panels back to natural page flow. There,
// a section can be taller than the viewport, so jumping wheel-by-wheel to section
// tops would skip straight over the content in between — let the browser scroll.
const fallbackLayout = window.matchMedia('(max-width: 768px), (max-height: 700px)');

// Walk up from the wheel target looking for something that can absorb this delta
// itself (a project card with more to read, a panel whose content overflows).
function findScrollableAncestor(el, deltaY) {
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
        if (node.nodeType === 1) {
            const oy = getComputedStyle(node).overflowY;
            if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
                const room = deltaY > 0
                    ? node.scrollTop < node.scrollHeight - node.clientHeight - 1
                    : node.scrollTop > 1;
                if (room) return node;
            }
        }
        node = node.parentElement;
    }
    return null;
}

window.addEventListener('wheel', (e) => {
    if (prefersReducedMotion) return;   // no hijacking for reduced-motion users
    if (fallbackLayout.matches) return; // small/short viewport: plain page scrolling
    if (e.ctrlKey) return;              // pinch-zoom
    if (e.defaultPrevented) return;     // the carousel already claimed this one
    if (lightbox && lightbox.classList.contains('active')) return;
    if (Math.abs(e.deltaY) < 4) return;
    if (findScrollableAncestor(e.target, e.deltaY)) return;

    e.preventDefault();
    if (sectionJumpLock) return;

    const idx = currentSectionIndex();
    const navHeight = navEl ? navEl.offsetHeight : 0;
    const currentTop = panelSections[idx].getBoundingClientRect().top + window.pageYOffset - navHeight;

    // Parked *below* the current section's rest position — i.e. down at the footer.
    // Scrolling up from there should re-align this section, not skip over it.
    if (e.deltaY < 0 && window.pageYOffset > currentTop + 10) {
        sectionJumpLock = true;
        scrollToTarget(panelSections[idx]);
        setTimeout(() => { sectionJumpLock = false; }, 700);
        return;
    }

    const nextIdx = Math.max(0, Math.min(panelSections.length - 1, idx + (e.deltaY > 0 ? 1 : -1)));

    // At the last section, let a downward wheel reach the footer rather than dead-end.
    if (nextIdx === idx) {
        if (e.deltaY > 0 && idx === panelSections.length - 1) {
            sectionJumpLock = true;
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: scrollBehavior });
            setTimeout(() => { sectionJumpLock = false; }, 700);
        }
        return;
    }

    sectionJumpLock = true;
    scrollToTarget(panelSections[nextIdx]);
    setTimeout(() => { sectionJumpLock = false; }, 700);
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if (keyboardNavBlocked()) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!track || panelSections[currentSectionIndex()] !== projectsSection) return;
        e.preventDefault();
        scrollCarousel(e.key === 'ArrowRight' ? 1 : -1);
        return;
    }

    if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) return;

    const goingDown = e.key === 'ArrowDown' || e.key === 'PageDown';
    const idx = currentSectionIndex();
    const nextIdx = Math.max(0, Math.min(panelSections.length - 1, idx + (goingDown ? 1 : -1)));
    if (nextIdx === idx) return;
    e.preventDefault();
    scrollToTarget(panelSections[nextIdx]);
});

window.addEventListener('load', updateCarouselArrows);

// Typing effect for subtitle (optional enhancement)
const subtitle = document.querySelector('.subtitle');
if (subtitle && !prefersReducedMotion) {
    const text = subtitle.textContent;
    subtitle.textContent = '';
    let i = 0;

    const typeWriter = () => {
        if (i < text.length) {
            subtitle.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        }
    };

    // Start typing effect after a short delay
    setTimeout(typeWriter, 500);
}

// Add hover effect for tech tags
document.querySelectorAll('.tech-tag, .skill-tag').forEach(tag => {
    tag.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.1)';
        this.style.transition = 'transform 0.2s ease';
    });

    tag.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
    });
});

// Contact link analytics (you can replace with your own tracking)
document.querySelectorAll('.contact-links a, .footer-links a').forEach(link => {
    link.addEventListener('click', () => {
        console.log(`Contact link clicked: ${link.textContent}`);
        // Add your analytics code here if needed
    });
});

// Lightbox for project screenshots
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxCounter = document.getElementById('lightbox-counter');

let lightboxImages = [];
let lightboxIndex = 0;

function updateLightboxImage() {
    lightboxImg.src = lightboxImages[lightboxIndex].src;
    lightboxImg.alt = lightboxImages[lightboxIndex].alt || '';
    lightboxPrev.disabled = lightboxIndex === 0;
    lightboxNext.disabled = lightboxIndex === lightboxImages.length - 1;
    lightboxCounter.textContent = lightboxImages.length > 1
        ? `${lightboxIndex + 1} / ${lightboxImages.length}` : '';
}

function openLightbox(images, index) {
    lightboxImages = images;
    lightboxIndex = index;
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxImg.src = '';
}

// Screenshot: wrap each img in .screenshot-thumb, lightbox clicks, "+N more" tile
document.querySelectorAll('.project-screenshot').forEach(container => {
    const allImgs = [...container.querySelectorAll('img')];

    allImgs.forEach((img, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'screenshot-thumb';
        if (img.style.display === 'none') {
            thumb.style.display = 'none';
            img.style.display = '';
        }
        img.parentNode.insertBefore(thumb, img);
        thumb.appendChild(img);
        thumb.addEventListener('click', () => openLightbox(allImgs, i));
    });

    const allThumbs = [...container.querySelectorAll('.screenshot-thumb')];
    const hiddenThumbs = allThumbs.filter(t => t.style.display === 'none');

    if (allImgs.length <= 3) {
        allThumbs.forEach(t => t.style.display = '');
        return;
    }

    if (hiddenThumbs.length === 0) return;

    const moreTile = document.createElement('div');
    moreTile.className = 'screenshot-more';
    moreTile.textContent = `+${hiddenThumbs.length} more`;
    container.appendChild(moreTile);

    const firstHiddenImg = hiddenThumbs[0].querySelector('img');
    moreTile.addEventListener('click', () => openLightbox(allImgs, allImgs.indexOf(firstHiddenImg)));
});

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) { lightboxIndex--; updateLightboxImage(); }
});

lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightboxImage(); }
});

document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; updateLightboxImage(); }
    if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightboxImage(); }
});

// Add scroll-to-top button functionality
const createScrollToTopButton = () => {
    const button = document.createElement('button');
    button.innerHTML = '↑';
    button.className = 'scroll-to-top';
    button.setAttribute('aria-label', 'Scroll to top');
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--primary);
        color: var(--text);
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    `;

    document.body.appendChild(button);

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            button.style.opacity = '1';
            button.style.visibility = 'visible';
        } else {
            button.style.opacity = '0';
            button.style.visibility = 'hidden';
        }
    });

    button.addEventListener('click', () => {
        scrollToTarget(null);
    });

    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.background = 'var(--primary-dark)';
    });

    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.background = 'var(--primary)';
    });
};

createScrollToTopButton();

// Add copy email functionality (optional)
document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const email = link.getAttribute('href').replace('mailto:', '');
        navigator.clipboard.writeText(email).then(() => {
            // Show copied notification
            const notification = document.createElement('div');
            notification.textContent = 'Email copied to clipboard!';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--success);
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        });
    });
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('Portfolio loaded successfully!');
