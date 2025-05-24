document.addEventListener('DOMContentLoaded', () => {
    // --- PWA: Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/school/sw.js', { scope: '/school/' }) // Ensure scope matches manifest
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    // Optional: Check for updates to the service worker
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        // New update available
                                        console.log('New content is available and will be used when all tabs for this scope are closed.');
                                        // You could show a "New version available, please refresh" toast message here
                                        // and offer a button that calls: registration.waiting.postMessage({type: 'SKIP_WAITING'});
                                        // Example: if (confirm("New version available. Refresh now?")) { registration.waiting.postMessage({type: 'SKIP_WAITING'}); }
                                    } else {
                                        // Content is cached for offline use.
                                        console.log('Content is cached for offline use.');
                                    }
                                }
                            };
                        }
                    };
                }).catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
    // --- End of PWA: Service Worker Registration ---

    // --- PWA: Window Controls Overlay Logic ---
    const wcoHandleGeometryChange = () => {
        if (navigator.windowControlsOverlay && navigator.windowControlsOverlay.visible) {
            document.body.classList.add('window-controls-overlay-active');
            // console.log('Window Controls Overlay is visible. Title bar rect:', navigator.windowControlsOverlay.getTitlebarAreaRect());
        } else {
            document.body.classList.remove('window-controls-overlay-active');
            // console.log('Window Controls Overlay is not visible or not supported.');
        }
    };

    if ('windowControlsOverlay' in navigator) {
        navigator.windowControlsOverlay.addEventListener('geometrychange', wcoHandleGeometryChange);
        wcoHandleGeometryChange(); // Initial check
    }
    // --- End of PWA: Window Controls Overlay Logic ---


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
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length -1] !== '') {
        // This handles cases like /school/ where index.html is implied
        currentPageFile = 'index.html';
    } else if (currentPageFile === '') {
         currentPageFile = 'index.html';
    }
    // If deployed at root (e.g., klsuthar.github.io/ without /school/),
    // and pathSegments.pop() is empty, currentPageFile correctly becomes 'index.html'
    // For /school/index.html, it becomes 'index.html'.
    // For /school/about.html, it becomes 'about.html'.

    // For Top Header Navigation
    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Make href comparison more robust by considering relative paths
        let linkHrefFile = linkHref.split('/').pop();
        if (linkHrefFile === '' && linkHref.endsWith('/')) { // e.g. href="some_dir/" implies index.html
            linkHrefFile = 'index.html';
        }

        if (linkHrefFile && linkHrefFile === currentPageFile) {
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
        if (!bottomNoticeIndicator) {
            bottomNoticeIndicator = document.createElement('span');
            bottomNoticeIndicator.className = 'notice-indicator-badge';
            bottomNoticeIndicator.style.display = 'none';
            bottomNavNoticeLink.appendChild(bottomNoticeIndicator);
        }
    }

    async function checkForNewNotices() {
        if (!noticeIndicator && !bottomNoticeIndicator) {
            return;
        }
        try {
            // Adjust path to notices.json if your GH Pages repo has a base name
            const noticesPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/data/notices.json';
            const response = await fetch(noticesPath);

            if (!response.ok) {
                console.warn(`Could not fetch ${noticesPath} to check for new items. Status:`, response.status);
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
                calculateCardWidthAndVisible();
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
                        void resultsTrack.offsetWidth; // Force reflow
                    }, 500);
                }
            }

            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                intervalId = setInterval(slideResults, 3000);

                resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
                resultsSliderContainer.addEventListener('mouseleave', () => {
                    if (originalCards.length > visibleCards) {
                        intervalId = setInterval(slideResults, 3000);
                    }
                });
            }

            window.addEventListener('resize', () => {
                calculateCardWidthAndVisible();
                if (originalCards.length <= visibleCards) {
                    if (intervalId) clearInterval(intervalId);
                    intervalId = null;
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
            // Here you would typically send the data to a server
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
    let resultsData = null;

    async function loadResultsData() {
        try {
            const resultsPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/results/results.json';
            const response = await fetch(resultsPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - Could not fetch ${resultsPath}.`);
            }
            resultsData = await response.json();
            populateClassSelector();
        } catch (error) {
            console.error("Could not load results data:", error);
            if (resultsTableContainer) {
                 resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results data. Please check console.</p>`;
            }
        }
    }

    function populateClassSelector() {
        if (!resultsData || !selectClassDropdown) return;
        selectClassDropdown.length = 1; // Keep the "-- Select Class --" option

        const classes = Object.keys(resultsData).sort((a, b) => {
            // Simple numeric sort if class names are like "class1", "class10"
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
            selectTestDropdown.length = 1; // Reset to "-- Select Test --"
            selectTestDropdown.disabled = true;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No data for selected class.</p>`;
            return;
        }

        selectTestDropdown.length = 1; // Reset
        const tests = Object.keys(resultsData[selectedClassKey]).sort(); // Sort test names if needed

        if (tests.length > 0) {
            tests.forEach(testKey => {
                const option = document.createElement('option');
                option.value = testKey;
                // Make test names user-friendly, e.g., "test1" becomes "Test 1"
                option.textContent = testKey.replace(/([A-Za-z])(\d+)/, '$1 $2').replace(/^./, str => str.toUpperCase());
                selectTestDropdown.appendChild(option);
            });
            selectTestDropdown.disabled = false;
        } else {
            selectTestDropdown.disabled = true;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No tests for selected class.</p>`;
        }
    }

    function displayResultsTable(classKey, testKey) {
        if (!resultsData || !resultsTableContainer || !resultsData[classKey] || !resultsData[classKey][testKey]) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No results data available for the selected criteria.</p>`;
            return;
        }

        const students = resultsData[classKey][testKey];
        if (!Array.isArray(students) || students.length === 0) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No students found in this result set or data format is incorrect.</p>`;
            return;
        }

        // Define columns (could be dynamic if subject lists vary greatly)
        const columnConfig = [
            { key: 'Rank', displayName: 'Rank', className: 'rank-column' },
            { key: 'Name', displayName: 'Name', className: 'name-column' },
            { key: 'Hindi', displayName: 'Hindi' },
            { key: 'English', displayName: 'English' },
            { key: 'Science', displayName: 'Science' },
            { key: 'SocialS', displayName: 'Social Studies' }, // Key matches JSON
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
            // Clear previous results and disable test dropdown until a class is selected
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            selectTestDropdown.length = 1; // Reset to default option
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
                if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select both class and test to view results.</p>`;
            }
        });
    }

    // Load results data if on the results page
    if (document.getElementById('results-page')) { // Check if we are on the results page
        loadResultsData();
    }
    // --- End of Results Page Specific ---


    // --- Notice Board Page Specific ---
    const noticesContainer = document.getElementById('notices-container');

    async function loadNotices() {
        if (!noticesContainer) return;

        try {
            const noticesPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/data/notices.json';
            const response = await fetch(noticesPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. Check '${noticesPath}'.`);
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
            noticesContainer.innerHTML = `<p class="no-notices-message">No notices to display at the moment.</p>`;
            return;
        }

        // Sort notices by date, most recent first
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));

        let noticesHTML = '';
        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            const formattedDate = noticeDate.toLocaleDateString('en-GB', { // Example: 05 November 2023
                day: 'numeric', month: 'long', year: 'numeric'
            });
            // Sanitize description or ensure it's safe HTML if coming from a CMS
            // For simple text with newlines, replacing \n with <br> is okay.
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
                            <img src="${(window.location.pathname.includes('/school/') ? '/school/' : '/') + notice.image}" alt="${notice.title}" class="notice-image">
                        </div>
                    ` : ''}
                </div>
            `;
        });
        noticesContainer.innerHTML = noticesHTML;
    }

    // Load notices if on the notice board page
    if (document.getElementById('notice-board-page')) { // Check if we are on the notice board page
        loadNotices();
    }
    // --- End of Notice Board Page Specific ---

}); // End of DOMContentLoaded