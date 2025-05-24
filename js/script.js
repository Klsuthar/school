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
    // Handles cases like /folder/ which results in "" for pop(), or root /
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length -1] !== '') {
        // This case implies a path like /folder/ where pop() gives "", but it's not the root.
        // For a flat structure, we generally default to index.html if the pop is empty or not a file.
        currentPageFile = 'index.html';
    } else if (currentPageFile === '') { // Handles root path / explicitly making it index.html
         currentPageFile = 'index.html';
    }
    // Ensure it has .html if it's a page name without extension (less common for static sites but for safety)
    // For this project, all links are explicit .html files, so this might not be strictly needed.
    // if (!currentPageFile.endsWith('.html') && currentPageFile !== 'index.html') {
    //     currentPageFile = 'index.html'; // Default if no .html and not already index
    // }


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
            // let totalCardsInView = originalCards.length; // This variable wasn't strictly used later for cloning logic
            let currentIndex = 0;
            let intervalId;

            function calculateCardWidthAndVisible() {
                if (originalCards.length > 0) {
                    const currentCard = originalCards[0];
                    const computedStyle = window.getComputedStyle(currentCard);
                    const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
                    const marginRight = parseFloat(computedStyle.marginRight) || 0;
                    cardWidth = currentCard.offsetWidth + marginLeft + marginRight;
                    if (resultsSliderContainer.offsetWidth > 0 && cardWidth > 0) {
                        visibleCards = Math.floor(resultsSliderContainer.offsetWidth / cardWidth);
                    } else {
                        visibleCards = originalCards.length; // Default to all if calculation fails
                    }
                }
            }
            calculateCardWidthAndVisible(); // Initial calculation


            // Clone cards for infinite loop only if needed
            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                originalCards.forEach(card => {
                    const clone = card.cloneNode(true);
                    resultsTrack.appendChild(clone);
                });
                // totalCardsInView = originalCards.length * 2; // After cloning
            }

            function slideResults() {
                // Recalculate visibleCards in case of resize changes before slide execution
                calculateCardWidthAndVisible();
                if (originalCards.length === 0 || originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    resultsTrack.style.transform = `translateX(0px)`;
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

            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                intervalId = setInterval(slideResults, 3000); // Slide every 3 seconds

                resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
                resultsSliderContainer.addEventListener('mouseleave', () => {
                    // Re-check condition before restarting
                    if (originalCards.length > visibleCards) {
                        intervalId = setInterval(slideResults, 3000);
                    }
                });
            }

            window.addEventListener('resize', () => {
                calculateCardWidthAndVisible(); // Recalculate on resize
                // Stop or start interval based on new visibility
                if (originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    intervalId = null; // Clear intervalId
                    resultsTrack.style.transition = 'none';
                    resultsTrack.style.transform = `translateX(0px)`;
                    currentIndex = 0;
                } else if (!intervalId && originalCards.length > 0 && originalCards.length > visibleCards) {
                    // If it wasn't sliding (e.g., was cleared) but now should
                    intervalId = setInterval(slideResults, 3000);
                }
                // If it was already sliding and should continue, the existing interval will handle it or be recreated by mouseleave
            });
        }
    }

    // --- Gallery Page Specific ---
    const galleryGrids = document.querySelectorAll('.image-grid-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModalBtn = document.querySelector('.close-modal');
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

    // Close modal on outside click or Escape key
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        });
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
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

    // --- Results Page Specific ---
    const selectClassDropdown = document.getElementById('select-class');
    const selectTestDropdown = document.getElementById('select-test');
    const resultsTableContainer = document.getElementById('results-table-container');
    let resultsData = null; // To store loaded results data

    async function loadResultsData() {
        try {
            const response = await fetch('results/results.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            resultsData = await response.json();
            populateClassSelector();
        } catch (error) {
            console.error("Could not load results data:", error);
            if (resultsTableContainer) {
                 resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results data. Please check the console for details and ensure 'results/results.json' is accessible and correctly formatted.</p>`;
            }
        }
    }

    function populateClassSelector() {
        if (!resultsData || !selectClassDropdown) return;
        selectClassDropdown.length = 1; // Keep "-- Select Class --"

        const classes = Object.keys(resultsData).sort((a, b) => {
            return parseInt(a.replace('class', ''), 10) - parseInt(b.replace('class', ''), 10);
        });

        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className.replace('class', 'Class ');
            selectClassDropdown.appendChild(option);
        });
    }

    function populateTestSelector(selectedClassKey) {
        if (!resultsData || !selectTestDropdown || !resultsData[selectedClassKey]) {
            selectTestDropdown.length = 1;
            selectTestDropdown.disabled = true;
            return;
        }

        selectTestDropdown.length = 1; // Keep "-- Select Test --"
        const tests = Object.keys(resultsData[selectedClassKey]).sort();

        if (tests.length > 0) {
            tests.forEach(testKey => {
                const option = document.createElement('option');
                option.value = testKey;
                option.textContent = testKey.replace(/([A-Za-z])(\d+)/, '$1 $2').replace(/^./, str => str.toUpperCase());
                selectTestDropdown.appendChild(option);
            });
            selectTestDropdown.disabled = false;
        } else {
            selectTestDropdown.disabled = true;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No tests found for the selected class.</p>`;
        }
    }

    function displayResultsTable(classKey, testKey) {
        if (!resultsData || !resultsTableContainer || !resultsData[classKey] || !resultsData[classKey][testKey]) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No results data found for the selected criteria.</p>`;
            return;
        }

        const students = resultsData[classKey][testKey];
        if (!students || students.length === 0) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No students in this result set.</p>`;
            return;
        }

        const columnConfig = [
            { key: 'Rank', displayName: 'Rank', className: 'rank-column' },
            { key: 'Name', displayName: 'Name', className: 'name-column' },
            { key: 'Hindi', displayName: 'Hindi' },
            { key: 'English', displayName: 'English' },
            { key: 'Science', displayName: 'Science' },
            { key: 'SocialS', displayName: 'Social Studies' },
            { key: 'Maths', displayName: 'Maths' },
            { key: 'Sanskrit', displayName: 'Sanskrit' },
            { key: 'Total', displayName: 'Total', className: 'total-column' },
            { key: 'Percentage', displayName: 'Percentage', className: 'percentage-column' }
        ];

        let tableHTML = '<table class="results-table"><thead><tr>';
        columnConfig.forEach(col => {
            tableHTML += `<th>${col.displayName}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        students.forEach(student => {
            tableHTML += '<tr>';
            columnConfig.forEach(col => {
                tableHTML += `<td class="${col.className || ''}">${student[col.key] !== undefined ? student[col.key] : '-'}</td>`;
            });
            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        resultsTableContainer.innerHTML = tableHTML;
    }

    if (selectClassDropdown) {
        selectClassDropdown.addEventListener('change', function() {
            const selectedClass = this.value;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            selectTestDropdown.length = 1; // Reset test dropdown to "-- Select Test --"
            selectTestDropdown.disabled = true;

            if (selectedClass) {
                populateTestSelector(selectedClass);
            }
        });
    }

    if (selectTestDropdown) {
        selectTestDropdown.addEventListener('change', function() {
            const selectedClass = selectClassDropdown.value;
            const selectedTest = this.value;
            if (selectedClass && selectedTest) {
                displayResultsTable(selectedClass, selectedTest);
            } else {
                if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a class and test to view results.</p>`;
            }
        });
    }

    if (document.getElementById('results-page')) {
        loadResultsData();
    }
    // --- End of Results Page Specific ---

}); // End of DOMContentLoaded