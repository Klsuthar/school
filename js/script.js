document.addEventListener('DOMContentLoaded', () => {
    // --- Common Elements ---
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navUl = document.querySelector('nav ul');
    if (menuToggle && navUl) {
        menuToggle.addEventListener('click', () => {
            navUl.classList.toggle('active');
        });
    }

    // Active Nav Link
    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop(); // Get the last segment (file name)
    if (currentPageFile === '' || currentPageFile === pathSegments.pop() /* for paths ending in / */) {
        currentPageFile = 'index.html'; // Default to index.html if it's the root
    }

    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPageFile) {
            link.classList.add('active');
        } else {
            link.classList.remove('active'); // Good practice to remove active from others
        }
    });

    // --- Home Page Specific ---
    const resultsSliderContainer = document.querySelector('.results-slider'); // Get the container
    if (resultsSliderContainer) {
        const resultsTrack = resultsSliderContainer.querySelector('.results-track');
        if (resultsTrack && resultsTrack.children.length > 0) {
            const originalCards = Array.from(resultsTrack.children);
            const cardWidth = originalCards[0].offsetWidth + 30; // card width + its right margin (15px + 15px from CSS)
            let visibleCards = Math.floor(resultsSliderContainer.offsetWidth / cardWidth);
            let totalCardsInView = originalCards.length; // Initially

            // Clone cards for infinite loop only if needed
            if (originalCards.length > visibleCards) {
                originalCards.forEach(card => {
                    const clone = card.cloneNode(true);
                    resultsTrack.appendChild(clone);
                });
                totalCardsInView = originalCards.length * 2; // Now double the cards
            }

            let currentIndex = 0;
            let intervalId; // To store the interval ID

            function slideResults() {
                if (originalCards.length === 0 || originalCards.length <= visibleCards) {
                    // If no cards or all cards are visible, no need to slide or loop
                    if (intervalId) clearInterval(intervalId); // Stop if it was running
                    resultsTrack.style.transform = `translateX(0px)`; // Ensure it's at the start
                    return;
                }

                currentIndex++;
                resultsTrack.style.transition = 'transform 0.5s ease-in-out';
                resultsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

                // If we've slid past the original set and are now showing a clone that matches the start
                if (currentIndex >= originalCards.length) {
                    // After the transition ends, silently jump back to the beginning
                    setTimeout(() => {
                        resultsTrack.style.transition = 'none'; // No transition for the jump
                        currentIndex = 0;
                        resultsTrack.style.transform = `translateX(0px)`;
                        // Force reflow to apply the reset immediately
                        void resultsTrack.offsetWidth;
                    }, 500); // Match transition duration
                }
            }

            // Only start sliding if there are more cards than can be shown
            if (originalCards.length > visibleCards) {
                intervalId = setInterval(slideResults, 3000); // Slide every 3 seconds

                // Optional: Pause on hover
                resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
                resultsSliderContainer.addEventListener('mouseleave', () => {
                    if (originalCards.length > visibleCards) { // Re-check condition before restarting
                        intervalId = setInterval(slideResults, 3000);
                    }
                });
            }

            // Recalculate on resize
            window.addEventListener('resize', () => {
                visibleCards = Math.floor(resultsSliderContainer.offsetWidth / cardWidth);
                // Potentially re-initialize or adjust slider logic if needed on resize,
                // for this example, we'll just let it continue, but complex scenarios might need more.
                // If it was sliding, and now all cards are visible, stop it.
                if (originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    resultsTrack.style.transition = 'none';
                    resultsTrack.style.transform = `translateX(0px)`;
                    currentIndex = 0;
                } else if (!intervalId && originalCards.length > 0) { // If it wasn't sliding but now should
                    intervalId = setInterval(slideResults, 3000);
                }
            });
        }
    }
    // --- Gallery Page Specific ---
    const galleryGrids = document.querySelectorAll('.image-grid-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModal = document.querySelector('.close-modal');
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
            if (images.length <= 1) return; // Don't slide if 1 or 0 images
            currentImgIdx = (currentImgIdx + 1) % images.length;
            grid.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        }
        if (images.length > 1) {
            setInterval(slideGallery, 2000); // Auto slide every 2 seconds
        }

        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                currentGalleryImages = images.map(i => i.src); // Get sources from this specific gallery
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

    if (closeModal) {
        closeModal.onclick = () => {
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

    // Close modal on outside click
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
            // Basic validation (can be expanded)
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

            // Here you would typically send the data to a server
            // For this example, we'll just log it and show a success message
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