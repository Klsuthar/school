// school-website/js/script.js

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
    let currentPageFile = pathSegments.pop() || 'index.html';
    // Handle root path (e.g. "school-website/" should be index.html)
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length - 1] !== '') {
        currentPageFile = 'index.html';
    } else if (currentPageFile === '') {
        currentPageFile = 'index.html';
    }


    // For Top Header Navigation
    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref && (linkHref === currentPageFile || linkHref.endsWith('/' + currentPageFile))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // For Bottom Mobile Navigation
    const bottomNavLinks = document.querySelectorAll('.bottom-nav-bar .bottom-nav-link');
    bottomNavLinks.forEach(link => {
        const linkPage = link.dataset.page;
        if (linkPage && (linkPage === currentPageFile || linkPage.endsWith('/' + currentPageFile))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // --- Global Notice Indicator Logic ---
    const navNoticeLinkAnchor = document.getElementById('nav-notice-link'); // The <a> tag
    let noticeIndicator = null;
    if (navNoticeLinkAnchor) { // Check if the anchor itself exists
        noticeIndicator = navNoticeLinkAnchor.querySelector('.notice-indicator-badge'); // Find badge inside it
    }

    const bottomNavNoticeLink = document.querySelector('.bottom-nav-link[data-page="notice.html"]');
    let bottomNoticeIndicator = null;

    if (bottomNavNoticeLink) {
        bottomNoticeIndicator = bottomNavNoticeLink.querySelector('.notice-indicator-badge');
        // If the badge doesn't exist in HTML, create and append it (for robustness)
        if (!bottomNoticeIndicator) {
            bottomNoticeIndicator = document.createElement('span');
            bottomNoticeIndicator.className = 'notice-indicator-badge';
            bottomNoticeIndicator.style.display = 'none'; // Start hidden
            bottomNavNoticeLink.appendChild(bottomNoticeIndicator);
        }
    }


    async function checkForNewNotices() {
        // Only proceed if at least one indicator element is present
        if (!noticeIndicator && !bottomNoticeIndicator) {
            // console.log("No notice indicators found on this page.");
            return;
        }
        try {
            const response = await fetch('data/notices.json');
            if (!response.ok) {
                console.warn("Could not fetch notices.json to check for new items. Status:", response.status);
                return;
            }
            const notices = await response.json();
            if (!Array.isArray(notices)) {
                console.warn("Notices data is not an array.");
                return;
            }
            const hasNewNotices = notices.some(notice => notice.isNew === true);

            if (hasNewNotices) {
                if (noticeIndicator) noticeIndicator.style.display = 'inline-block';
                if (bottomNoticeIndicator) bottomNoticeIndicator.style.display = 'inline-block';
            } else {
                if (noticeIndicator) noticeIndicator.style.display = 'none';
                if (bottomNoticeIndicator) bottomNoticeIndicator.style.display = 'none';
            }
        } catch (error) {
            console.warn("Error checking for new notices:", error);
        }
    }
    checkForNewNotices(); // Call on every page load
    // --- End of Global Notice Indicator Logic ---


    // --- Home Page Specific ---
    const resultsSliderContainer = document.querySelector('.results-slider');
    if (resultsSliderContainer) {
        const resultsTrack = resultsSliderContainer.querySelector('.results-track');
        if (resultsTrack && resultsTrack.children.length > 0) {
            const originalCards = Array.from(resultsTrack.children);
            let cardWidth;
            let visibleCards;
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
                        // Fallback if container width or card width is zero, show all cards
                        visibleCards = originalCards.length;
                    }
                } else {
                    visibleCards = 0;
                }
            }
            calculateCardWidthAndVisible();


            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                originalCards.forEach(card => {
                    const clone = card.cloneNode(true);
                    resultsTrack.appendChild(clone);
                });
            }

            function slideResults() {
                calculateCardWidthAndVisible(); // Recalculate in case of resize
                if (originalCards.length === 0 || originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    resultsTrack.style.transform = `translateX(0px)`; // Reset position
                    return;
                }

                currentIndex++;
                resultsTrack.style.transition = 'transform 0.5s ease-in-out';
                resultsTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

                // If we've slid past the original set, jump back to the beginning without transition
                if (currentIndex >= originalCards.length) {
                    setTimeout(() => {
                        resultsTrack.style.transition = 'none'; // Disable transition for the jump
                        currentIndex = 0;
                        resultsTrack.style.transform = `translateX(0px)`;
                        // Force reflow to apply the 'none' transition immediately before re-enabling
                        void resultsTrack.offsetWidth;
                    }, 500); // Match transition duration
                }
            }

            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                intervalId = setInterval(slideResults, 3000);

                resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
                resultsSliderContainer.addEventListener('mouseleave', () => {
                    // Restart interval only if conditions are still met
                    if (originalCards.length > visibleCards) {
                        intervalId = setInterval(slideResults, 3000);
                    }
                });
            }

            // Handle window resize
            window.addEventListener('resize', () => {
                calculateCardWidthAndVisible();
                // If no longer need to slide (e.g., window became wider)
                if (originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    intervalId = null; // Clear interval ID
                    resultsTrack.style.transition = 'none'; // No transition for reset
                    resultsTrack.style.transform = `translateX(0px)`;
                    currentIndex = 0; // Reset index
                } else if (!intervalId && originalCards.length > 0 && originalCards.length > visibleCards) {
                    // If sliding should occur but interval isn't set, start it
                    intervalId = setInterval(slideResults, 3000);
                }
            });
        }
    }

    // --- Gallery Page Specific ---
    const galleryGrids = document.querySelectorAll('.image-grid-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModalBtnGallery = document.querySelector('.close-modal');
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
            if (images.length <= 1) return; // No need to slide if 0 or 1 image
            currentImgIdx = (currentImgIdx + 1) % images.length;
            grid.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        }

        if (images.length > 1) {
            setInterval(slideGallery, 2000); // Start sliding only if more than one image
        }


        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                currentGalleryImages = images.map(i => i.src); // Store sources of this specific gallery
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

    if (closeModalBtnGallery) {
        closeModalBtnGallery.onclick = () => {
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

    // Close modal on click outside image or Esc key
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

            // Simulate form submission (replace with actual submission logic if needed)
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
    let resultsData = null; // Store fetched results data

    async function loadResultsData() {
        try {
            const response = await fetch('results/results.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - Could not fetch results.json.`);
            }
            resultsData = await response.json();
            populateClassSelector();
        } catch (error) {
            console.error("Could not load results data:", error);
            if (resultsTableContainer) {
                resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results data. Please check the console for details.</p>`;
            }
        }
    }

    function populateClassSelector() {
        if (!resultsData || !selectClassDropdown) return;
        selectClassDropdown.length = 1; // Clear existing options except the first ("-- Select Class --")

        // Get class keys and sort them (e.g., class1, class2, class10)
        const classes = Object.keys(resultsData).sort((a, b) => {
            // Extract number from "classX" and compare numerically
            return parseInt(a.replace('class', ''), 10) - parseInt(b.replace('class', ''), 10);
        });

        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className.replace('class', 'Class '); // Make it user-friendly
            selectClassDropdown.appendChild(option);
        });
    }

    function populateTestSelector(selectedClassKey) {
        if (!resultsData || !selectTestDropdown || !resultsData[selectedClassKey]) {
            selectTestDropdown.length = 1; // Clear existing options
            selectTestDropdown.disabled = true;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No data available for the selected class.</p>`;
            return;
        }

        selectTestDropdown.length = 1; // Clear existing options except the first
        const tests = Object.keys(resultsData[selectedClassKey]).sort(); // Sort test names if needed

        if (tests.length > 0) {
            tests.forEach(testKey => {
                const option = document.createElement('option');
                option.value = testKey;
                // Make test names more readable (e.g., "test1" to "Test 1")
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
        if (!Array.isArray(students) || students.length === 0) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No student results found for this test or the data is not in the expected format.</p>`;
            return;
        }

        // Define column configuration for the table
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

    // Event listener for class selection
    if (selectClassDropdown) {
        selectClassDropdown.addEventListener('change', function () {
            const selectedClass = this.value;
            // Reset test dropdown and results table
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            selectTestDropdown.length = 1; // Clear options
            selectTestDropdown.disabled = true;

            if (selectedClass) {
                populateTestSelector(selectedClass);
            }
        });
    }

    // Event listener for test selection
    if (selectTestDropdown) {
        selectTestDropdown.addEventListener('change', function () {
            const selectedClass = selectClassDropdown.value;
            const selectedTest = this.value;
            if (selectedClass && selectedTest) {
                displayResultsTable(selectedClass, selectedTest);
            } else {
                if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a class and a test to view results.</p>`;
            }
        });
    }

    // Load results data if on the results page
    if (document.getElementById('results-page')) {
        loadResultsData();
    }
    // --- End of Results Page Specific ---


    // --- Notice Board Page Specific ---
    const noticesContainer = document.getElementById('notices-container');

    async function loadNotices() {
        if (!noticesContainer) return;

        try {
            const response = await fetch('data/notices.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. Please ensure 'data/notices.json' exists and is accessible.`);
            }
            const notices = await response.json();
            displayNotices(notices);
        } catch (error) {
            console.error("Could not load notices:", error);
            noticesContainer.innerHTML = `<p class="no-notices-message">Error loading notices. Please check the console for details.</p>`;
        }
    }

    function displayNotices(notices) {
        if (!noticesContainer) return;

        if (!Array.isArray(notices) || notices.length === 0) {
            noticesContainer.innerHTML = `<p class="no-notices-message">There are currently no notices to display.</p>`;
            return;
        }

        // Sort notices by date, newest first
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));

        let noticesHTML = '';
        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            const formattedDate = noticeDate.toLocaleDateString('en-GB', { // Example: 01 January 2023
                day: 'numeric', month: 'long', year: 'numeric'
            });
            // Convert newline characters in description to <br> tags
            const descriptionHTML = notice.description.replace(/\n/g, '<br>');

            noticesHTML += `
                <div class="notice-card ${notice.isNew ? 'new-notice' : ''}">
                    ${notice.isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <h3>${notice.title}</h3>
                    <span class="notice-date"><i class="fas fa-calendar-alt"></i> Published: ${formattedDate}</span>
                    <div class="notice-description">
                        ${descriptionHTML}
                    </div>
                    ${notice.image ? `
                        <div class="notice-image-container">
                            <img src="${notice.image}" alt="${notice.title}" class="notice-image">
                        </div>
                    ` : ''}
                </div>
            `;
        });
        noticesContainer.innerHTML = noticesHTML;
    }

    // Load notices if on the notice board page
    if (document.getElementById('notice-board-page')) {
        loadNotices();
    }
    // --- End of Notice Board Page Specific ---

    // --- PWA Service Worker Registration ---
    // This should be at the end of your script.js or in its own file linked after this one
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js') // sw.js must be at the root of your site
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
    // --- End of PWA Service Worker Registration ---

}); // End of DOMContentLoaded