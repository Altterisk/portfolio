// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const navHeight = document.querySelector('nav').offsetHeight;
            const targetPosition = targetSection.offsetTop - navHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Masonry layout
function applyMasonry() {
    const grid = document.querySelector('.projects-grid');
    if (!grid || !grid.clientWidth) return;

    const cards = [...grid.querySelectorAll('.project-card:not(.hidden)')];
    if (!cards.length) { grid.style.height = ''; return; }

    const gap = 30;
    const cols = window.innerWidth <= 768 ? 1 : 2;

    if (cols === 1) {
        cards.forEach(card => {
            card.style.position = '';
            card.style.left = '';
            card.style.top = '';
            card.style.width = '';
        });
        grid.style.height = '';
        return;
    }

    const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;

    // Phase 1: set widths so show-more and height measurements use the real column width
    cards.forEach(card => {
        card.style.position = 'absolute';
        card.style.width = colWidth + 'px';
        card.style.left = '0';
        card.style.top = '0';
    });

    // Phase 2: read heights (each offsetHeight read forces a reflow) and place cards
    const colHeights = Array(cols).fill(0);
    cards.forEach(card => {
        const col = colHeights.indexOf(Math.min(...colHeights));
        card.style.left = col * (colWidth + gap) + 'px';
        card.style.top = colHeights[col] + 'px';
        colHeights[col] += card.offsetHeight + gap;
    });

    grid.style.height = Math.max(...colHeights) - gap + 'px';
}

let masonryResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(masonryResizeTimer);
    masonryResizeTimer = setTimeout(applyMasonry, 150);
});

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
            if (filterValue === 'all') {
                card.classList.remove('hidden');
                card.style.animation = 'fadeIn 0.5s ease-in';
            } else {
                const categories = card.getAttribute('data-category');
                if (categories && categories.includes(filterValue)) {
                    card.classList.remove('hidden');
                    card.style.animation = 'fadeIn 0.5s ease-in';
                } else {
                    card.classList.add('hidden');
                }
            }
        });
        requestAnimationFrame(applyMasonry);
    });
});

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all project cards, skill categories, and timeline items
document.querySelectorAll('.project-card, .skill-category, .timeline-item, .education-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Active navigation highlighting on scroll
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
    let current = '';
    const navHeight = document.querySelector('nav').offsetHeight;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - navHeight - 100;
        const sectionHeight = section.offsetHeight;
        
        if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = 'var(--primary)';
        }
    });
});

// Initial masonry + card reveal on load
window.addEventListener('load', () => {
    applyMasonry();
    projectCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Typing effect for subtitle (optional enhancement)
const subtitle = document.querySelector('.subtitle');
if (subtitle) {
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
    tag.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.transition = 'transform 0.2s ease';
    });
    
    tag.addEventListener('mouseleave', function() {
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
const lightbox = document.getElementById('lightbox');
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
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
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

console.log('Portfolio loaded successfully! 🚀');