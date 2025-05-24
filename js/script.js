document.addEventListener('DOMContentLoaded', () => {
    // --- Common Elements ---
    // Mobile Menu Toggle (for top nav, if re-enabled or for wider mobile screens without bottom nav)
    const menuToggle = document.querySelector('.menu-toggle');
    const topNavUl = document.querySelector('header nav ul'); // More specific selector
    if (menuToggle && topNavUl) {
        menuToggle.addEventListener('click', () => {
            topNavUl.classList.toggle('active');
        });
    }

    // Active Nav Link Logic
    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html'; // Get the last segment (file name) or default
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length -1] !== '') { // handles cases like /folder/
        currentPageFile = 'index.html';
    } else if (currentPageFile === '') { // handles root path /
         currentPageFile = 'index.html';
    }


    // For Top Header Navigation
    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Check if the link's href ends with the current page file name
        if (linkHref && (linkHref === currentPageFile || linkHref.endsWith('/' + currentPageFile))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // For Bottom Mobile Navigation
    const bottomNavLinks = document.querySelectorAll('.bottom-nav-bar .bottom-nav-link');
    bottomNavLinks.forEach(link => {
        const linkPage = link.dataset.page; // Using data-page attribute
        // Or, if you prefer using href: const linkHref = link.getAttribute('href');
        if (linkPage && (linkPage === currentPageFile || linkPage.endsWith('/' + currentPageFile))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // --- Home Page Specific ---
    const resultsSliderContainer = document.querySelector('.results-slider');
    if (resultsSliderContainer) {
        const resultsTrack = resultsSliderContainer.querySelector('.results-track');
        if (resultsTrack && resultsTrack.children.length > 0) {
            const originalCards = Array.from(resultsTrack.children);
            let cardWidth; // To be calculated
            let visibleCards;
            let totalCardsInView = originalCards.length;
            let currentIndex = 0;
            let intervalId;

            function calculateCardWidth() {
                if (originalCards.length > 0) {
                    const currentCard = originalCards[0];
                    const computedStyle = window.getComputedStyle(currentCard);
                    const marginLeft = parseFloat(computedStyle.marginLeft);
                    const marginRight = parseFloat(computedStyle.marginRight);
                    cardWidth = currentCard.offsetWidth + marginLeft + marginRight;
                    visibleCards = Math.floor(resultsSliderContainer.offsetWidth / cardWidth);
                }
            }
            calculateCardWidth(); // Initial calculation


            if (originalCards.length > visibleCards) {
                originalCards.forEach(card => {
                    const clone = card.cloneNode(true);
                    resultsTrack.appendChild(clone);
                });
                totalCardsInView = originalCards.length * 2;
            }

            function slideResults() {
                if (originalCards.length === 0 || originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    resultsTrack.style.transform = `translateX(0px)`;
                    return;
                }

                currentIndex++;
                resultsTrack.style.transition = 'transform 0.5s ease-in-out';
                resultsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

                if (currentIndex >= originalCards.length) {
                    setTimeout(() => {
                        resultsTrack.style.transition = 'none';
                        currentIndex = 0;
                        resultsTrack.style.transform = `translateX(0px)`;
                        void resultsTrack.offsetWidth;
                    }, 500);
                }
            }

            if (originalCards.length > visibleCards) {
                intervalId = setInterval(slideResults, 3000);
                resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
                resultsSliderContainer.addEventListener('mouseleave', () => {
                    if (originalCards.length > visibleCards) {
                        intervalId = setInterval(slideResults, 3000);
                    }
                });
            }

            window.addEventListener('resize', () => {
                calculateCardWidth(); // Recalculate on resize

                if (originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    resultsTrack.style.transition = 'none';
                    resultsTrack.style.transform = `translateX(0px)`;
                    currentIndex = 0;
                } else if (!intervalId && originalCards.length > 0 && originalCards.length > visibleCards) {
                    intervalId = setInterval(slideResults, 3000);
                }
            });
        }
    }

    // --- Gallery Page Specific ---
    const galleryGrids = document.querySelectorAll('.image-grid-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModalBtn = document.querySelector('.close-modal'); // Renamed for clarity
    const prevModalBtn = document.querySelector('.prev-modal');
    const nextModalBtn = document.querySelector('.next-modal');

    let currentGalleryImages = [];
    let currentImageIndex = 0;

    galleryGrids.forEach(gridContainer => {
        const grid = gridContainer.querySelector('.image-grid');
        if (!grid) return;
        const images = Array.from(grid.querySelectorAll('img'));
        if (images.length === 0) return;

        let currentImgIdx = 0;

        function slideGallery() {
            if (images.length <= 1) return;
            currentImgIdx = (currentImgIdx + 1) % images.length;
            grid.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        }
        if (images.length > 1) {
            setInterval(slideGallery, 2000);
        }

        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                currentGalleryImages = images.map(i => i.src);
                currentImageIndex = index;
                openModal(img.src);
            });
        });
    });

    function openModal(src) {
        if (modal && modalImg) {
            modal.style.display = "block";
            modalImg.src = src;
            updateModalNavButtons();
        }
    }

    function updateModalNavButtons() {
        if (prevModalBtn && nextModalBtn) {
            prevModalBtn.style.display = currentGalleryImages.length > 1 ? 'block' : 'none';
            nextModalBtn.style.display = currentGalleryImages.length > 1 ? 'block' : 'none';
        }
    }

    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            if (modal) modal.style.display = "none";
        }
    }

    if (prevModalBtn) {
        prevModalBtn.onclick = () => {
            currentImageIndex = (currentImageIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
            if (modalImg) modalImg.src = currentGalleryImages[currentImageIndex];
        }
    }
    if (nextModalBtn) {
        nextModalBtn.onclick = () => {
            currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
            if (modalImg) modalImg.src = currentGalleryImages[currentImageIndex];
        }
    }

    if (modal) {
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    }

    // --- Contact Form ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('Please fill in all fields.');
                return;
            }
            if (!validateEmail(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            console.log('Form Submitted:', { name, email, message });
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }

    function validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

});