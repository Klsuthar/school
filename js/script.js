// js/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- PWA: Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Adjust path if your GH Pages repo name is different, e.g., /your-repo-name/sw.js
            const swPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/sw.js';
            const swScope = (window.location.pathname.includes('/school/') ? '/school/' : '/');

            navigator.serviceWorker.register(swPath, { scope: swScope })
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('New content is available and will be used when all tabs for this scope are closed.');
                                        // Optionally, prompt user to refresh
                                        // if (confirm("New version available. Refresh now to update?")) {
                                        //     registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                                        //     // Reload after SW is controller
                                        //     navigator.serviceWorker.addEventListener('controllerchange', () => {
                                        //         window.location.reload();
                                        //     });
                                        // }
                                    } else {
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
        } else {
            document.body.classList.remove('window-controls-overlay-active');
        }
    };

    if ('windowControlsOverlay' in navigator) {
        navigator.windowControlsOverlay.addEventListener('geometrychange', wcoHandleGeometryChange);
        wcoHandleGeometryChange(); // Initial check
    }
    // --- End of PWA: Window Controls Overlay Logic ---


    // --- Common Elements ---
    const menuToggle = document.querySelector('.menu-toggle');
    const topNavUl = document.querySelector('header nav ul');
    if (menuToggle && topNavUl) {
        menuToggle.addEventListener('click', () => {
            topNavUl.classList.toggle('active');
        });
    }

    // Active Nav Link Logic
    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html'; // Ensures 'index.html' for root path
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length -1] !== '') {
        currentPageFile = 'index.html';
    } else if (currentPageFile === '' && window.location.pathname.endsWith('/')) { // Handles trailing slash for root
         currentPageFile = 'index.html';
    }


    // For Top Header Navigation
    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        let linkHrefFile = linkHref.split('/').pop();
        if (linkHrefFile === '' && linkHref.endsWith('/')) {
            linkHrefFile = 'index.html';
        }
        if (!linkHrefFile && linkHref === './') { // Handle href="./" case
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
    const navNoticeLinkAnchor = document.getElementById('nav-notice-link');
    let noticeIndicator = null;
    if (navNoticeLinkAnchor) {
        noticeIndicator = navNoticeLinkAnchor.querySelector('.notice-indicator-badge');
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
    checkForNewNotices();
    // --- End of Global Notice Indicator Logic ---

    // --- Hard Refresh Button Logic ---
    const hardRefreshButton = document.getElementById('hard-refresh-button');
    const currentPageIsNoticeOrResults = currentPageFile === 'notice.html' || currentPageFile === 'results.html';
    // Check for standalone display mode (PWA) and not a typical mobile browser user agent
    const isLikelyDesktopPWA = window.matchMedia('(display-mode: standalone)').matches && !/Mobi|Android/i.test(navigator.userAgent);

    if (hardRefreshButton && currentPageIsNoticeOrResults && isLikelyDesktopPWA) {
        hardRefreshButton.style.display = 'inline-block'; // Show the button

        hardRefreshButton.addEventListener('click', async () => {
            console.log('Hard refresh initiated...');
            const refreshIcon = hardRefreshButton.querySelector('i');
            if (refreshIcon) refreshIcon.classList.add('fa-spin');

            try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration) {
                        if (registration.waiting) {
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                            // Wait for the new SW to take control
                            await new Promise(resolve => {
                                const interval = setInterval(() => {
                                    if (registration.active && registration.active === registration.waiting) {
                                        clearInterval(interval);
                                        resolve();
                                    }
                                }, 100);
                                setTimeout(() => { clearInterval(interval); resolve(); }, 2000); // Timeout
                            });
                        }
                        await registration.update();
                        console.log('Service worker update check triggered.');
                        // After update and potential skipWaiting, reload
                        setTimeout(() => {
                            window.location.reload(true);
                        }, 300); // Small delay to allow SW to potentially take over
                    } else {
                        console.log('No active service worker registration found. Performing standard hard reload.');
                        window.location.reload(true);
                    }
                } else {
                    console.log('Service workers not supported or no active controller. Performing standard hard reload.');
                    window.location.reload(true);
                }
            } catch (error) {
                console.error('Error during hard refresh:', error);
                if (refreshIcon) refreshIcon.classList.remove('fa-spin');
                alert('Could not perform hard refresh. Please try manually (Ctrl+Shift+R or Cmd+Shift+R).');
                window.location.reload(true); // Fallback
            }
        });
    }
    // --- End of Hard Refresh Button Logic ---

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
                        visibleCards = Math.max(1, Math.floor(resultsSliderContainer.offsetWidth / cardWidth));
                    } else {
                        visibleCards = originalCards.length; // Fallback if container width is 0
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
                        void resultsTrack.offsetWidth;
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
                // Clear existing interval if it exists
                if (intervalId) clearInterval(intervalId);
                intervalId = null;

                // Recalculate and reset state
                calculateCardWidthAndVisible();
                resultsTrack.style.transition = 'none'; // Avoid transition during resize adjustment
                currentIndex = 0;
                resultsTrack.style.transform = `translateX(0px)`;
                void resultsTrack.offsetWidth; // Force reflow

                // Restart interval if conditions still met
                if (originalCards.length > 0 && originalCards.length > visibleCards) {
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
    let galleryIntervals = []; // Store intervals for each gallery

    galleryGrids.forEach((gridContainer, idx) => {
        const grid = gridContainer.querySelector('.image-grid');
        if (!grid) return;
        const images = Array.from(grid.querySelectorAll('img'));
        if (images.length === 0) return;

        let currentImgIdx = 0;

        function slideGallery() {
            if (images.length <= 1) return; // No slide for single image
            currentImgIdx = (currentImgIdx + 1) % images.length;
            grid.style.transform = `translateX(-${currentImgIdx * 100}%)`;
        }
        if (images.length > 1) {
            galleryIntervals[idx] = setInterval(slideGallery, 2000 + (idx * 100)); // Stagger start times slightly
        }

        images.forEach((img, index) => {
            img.addEventListener('click', () => {
                // Stop all gallery slideshows when modal opens
                galleryIntervals.forEach(clearInterval);
                galleryIntervals = []; // Clear stored intervals

                currentGalleryImages = images.map(i => i.src); // Get images from this specific grid
                currentImageIndex = index;
                openModal(img.src);
            });
        });
    });

    function closeModalActions() {
        if (modal) modal.style.display = "none";
        // Restart gallery slideshows (optional, could be complex if many galleries)
        // For now, we'll leave them stopped after modal interaction for simplicity.
        // To restart: you'd need to re-initialize the intervals for each galleryGrid.
    }

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
        closeModalBtnGallery.onclick = closeModalActions;
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
                closeModalActions();
            }
        });
        window.addEventListener('keydown', (event) => {
            if (modal.style.display === 'block') {
                if (event.key === 'Escape') {
                    closeModalActions();
                } else if (event.key === 'ArrowLeft' && currentGalleryImages.length > 1) {
                    prevModalBtn.click();
                } else if (event.key === 'ArrowRight' && currentGalleryImages.length > 1) {
                    nextModalBtn.click();
                }
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
        selectClassDropdown.length = 1;

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
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No data for selected class.</p>`;
            return;
        }

        selectTestDropdown.length = 1;
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
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No tests for selected class.</p>`;
        }
    }

    function displayResultsTable(classKey, testKey) {
        if (!resultsData || !resultsTableContainer || !resultsData[classKey] || !resultsData[classKey][testKey]) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No results data for criteria.</p>`;
            return;
        }

        const students = resultsData[classKey][testKey];
        if (!Array.isArray(students) || students.length === 0) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No students in result set or data not array.</p>`;
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
            selectTestDropdown.length = 1;
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
                if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Select class and test.</p>`;
            }
        });
    }

    if (document.getElementById('results-page')) {
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
            noticesContainer.innerHTML = `<p class="no-notices-message">Error loading notices. Check console.</p>`;
        }
    }

    function displayNotices(notices) {
        if (!noticesContainer) return;

        if (!Array.isArray(notices) || notices.length === 0) {
            noticesContainer.innerHTML = `<p class="no-notices-message">No notices to display.</p>`;
            return;
        }

        notices.sort((a, b) => new Date(b.date) - new Date(a.date));

        let noticesHTML = '';
        const basePath = window.location.pathname.includes('/school/') ? '/school/' : '/';

        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            const formattedDate = noticeDate.toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const descriptionHTML = notice.description.replace(/\n/g, '<br>');
            const imagePath = notice.image ? `${basePath}${notice.image}` : null;


            noticesHTML += `
                <div class="notice-card ${notice.isNew ? 'new-notice' : ''}">
                    ${notice.isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <h3>${notice.title}</h3>
                    <span class="notice-date"><i class="fas fa-calendar-alt"></i> Published: ${formattedDate}</span>
                    <div class="notice-description">
                        ${descriptionHTML}
                    </div>
                    ${imagePath ? `
                        <div class="notice-image-container">
                            <img src="${imagePath}" alt="${notice.title}" class="notice-image">
                        </div>
                    ` : ''}
                </div>
            `;
        });
        noticesContainer.innerHTML = noticesHTML;
    }

    if (document.getElementById('notice-board-page')) {
        loadNotices();
    }
    // --- End of Notice Board Page Specific ---

}); // End of DOMContentLoaded