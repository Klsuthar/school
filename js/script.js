document.addEventListener('DOMContentLoaded', () => {
    const GH_PAGES_PREFIX = '/school'; // Define this once, used by SW and other paths
    const CACHE_PREFIX = 'springfield-academy-cache'; // Must match sw.js

    // --- Progressive Web App (PWA) Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swPath = `${GH_PAGES_PREFIX}/sw.js`;
            const swScope = `${GH_PAGES_PREFIX}/`;

            navigator.serviceWorker.register(swPath, { scope: swScope })
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        // New content is available and will be used when all tabs for this scope are closed.
                                        // Can prompt user to refresh or use the hard refresh button.
                                        console.log('New content is available. Refresh or use hard refresh to update.');
                                    } else {
                                        console.log('Content is cached for offline use.');
                                    }
                                }
                            };
                        }
                    };
                }).catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                });
        });
    }

    // --- Navigation Menu Toggle (for smaller screens, if CSS enables it) ---
    const menuToggle = document.querySelector('.menu-toggle');
    const topNavUl = document.querySelector('header nav ul');
    if (menuToggle && topNavUl) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = topNavUl.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isExpanded.toString());
        });
    }

    // --- Active Navigation Link Highlighting ---
    function getCurrentPageFile() {
        const pathSegments = window.location.pathname.split('/');
        let fileName = pathSegments.pop() || 'index.html'; // Handles trailing slash
        if (fileName === GH_PAGES_PREFIX.substring(1) && pathSegments.length === 1 && pathSegments[0] === "") { // Handles root like /school/
             fileName = 'index.html';
        }
        return fileName;
    }
    const currentPageFile = getCurrentPageFile();

    function setActiveLink(selector, attribute, fileCheck) {
        document.querySelectorAll(selector).forEach(link => {
            const linkValue = link.getAttribute(attribute) || link.dataset.page;
            if (linkValue) {
                let linkFile = linkValue.split('/').pop() || 'index.html';
                if (linkFile === '' && linkValue.endsWith('/')) { // For hrefs like "about/"
                    linkFile = 'index.html';
                }
                if (fileCheck(linkFile, currentPageFile)) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }

    setActiveLink('header nav ul li a', 'href', (linkFile, pageFile) => linkFile === pageFile);
    setActiveLink('.bottom-nav-bar .bottom-nav-link', 'data-page', (linkFile, pageFile) => linkFile === pageFile);


    // --- Global Notice Indicator Logic ---
    const navNoticeLinkAnchor = document.getElementById('nav-notice-link');
    const noticeIndicatorTop = navNoticeLinkAnchor ? navNoticeLinkAnchor.querySelector('.notice-indicator-badge') : null;
    const bottomNavNoticeLink = document.querySelector('.bottom-nav-link[data-page="notice.html"]');
    let noticeIndicatorBottom = null;

    if (bottomNavNoticeLink) {
        noticeIndicatorBottom = bottomNavNoticeLink.querySelector('.notice-indicator-badge');
        if (!noticeIndicatorBottom) { // Create if not present in HTML
            noticeIndicatorBottom = document.createElement('span');
            noticeIndicatorBottom.className = 'notice-indicator-badge';
            noticeIndicatorBottom.style.display = 'none';
            bottomNavNoticeLink.appendChild(noticeIndicatorBottom);
        }
    }

    async function checkForNewNotices() {
        if (!noticeIndicatorTop && !noticeIndicatorBottom) return;

        try {
            const noticesPath = `${GH_PAGES_PREFIX}/data/notices.json`;
            const response = await fetch(noticesPath, { cache: "no-store" }); // Always check network for indicator

            if (!response.ok) {
                console.warn(`Could not fetch ${noticesPath} for new item check. Status:`, response.status);
                return;
            }
            const notices = await response.json();
            if (!Array.isArray(notices)) {
                console.warn("Notices data is not an array.");
                return;
            }
            const hasNewNotices = notices.some(notice => notice.isNew === true);

            [noticeIndicatorTop, noticeIndicatorBottom].forEach(indicator => {
                if (indicator) {
                    indicator.style.display = hasNewNotices ? 'inline-block' : 'none';
                }
            });
        } catch (error) {
            console.warn("Error checking for new notices:", error);
        }
    }
    checkForNewNotices();


    // --- Home Page: Results Slider ---
    const resultsSliderContainer = document.querySelector('.results-slider');
    if (resultsSliderContainer) {
        const resultsTrack = resultsSliderContainer.querySelector('.results-track');
        if (resultsTrack && resultsTrack.children.length > 0) {
            const originalCards = Array.from(resultsTrack.children);
            let cardWidth, visibleCards, currentIndex = 0, intervalId;

            function calculateSliderDimensions() {
                if (originalCards.length === 0) {
                    visibleCards = 0; return;
                }
                const firstCard = originalCards[0];
                const computedStyle = window.getComputedStyle(firstCard);
                const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
                const marginRight = parseFloat(computedStyle.marginRight) || 0;
                cardWidth = firstCard.offsetWidth + marginLeft + marginRight;
                visibleCards = (resultsSliderContainer.offsetWidth > 0 && cardWidth > 0) ?
                               Math.floor(resultsSliderContainer.offsetWidth / cardWidth) :
                               originalCards.length;
            }

            function setupSliderClones() {
                // Remove any existing clones before adding new ones (e.g., on resize)
                Array.from(resultsTrack.children).forEach((child, index) => {
                    if (index >= originalCards.length) child.remove();
                });

                if (originalCards.length > 0 && originalCards.length > visibleCards) {
                    originalCards.forEach(card => {
                        const clone = card.cloneNode(true);
                        resultsTrack.appendChild(clone);
                    });
                }
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
                        void resultsTrack.offsetWidth; // Force reflow
                    }, 500);
                }
            }

            function initializeOrResetSlider() {
                calculateSliderDimensions();
                setupSliderClones();
                if (intervalId) clearInterval(intervalId);

                if (originalCards.length > 0 && originalCards.length > visibleCards) {
                    intervalId = setInterval(slideResults, 3000);
                } else {
                    resultsTrack.style.transition = 'none';
                    resultsTrack.style.transform = `translateX(0px)`;
                    currentIndex = 0;
                }
            }

            initializeOrResetSlider();

            resultsSliderContainer.addEventListener('mouseenter', () => clearInterval(intervalId));
            resultsSliderContainer.addEventListener('mouseleave', () => {
                if (originalCards.length > 0 && originalCards.length > visibleCards) {
                    intervalId = setInterval(slideResults, 3000);
                }
            });
            window.addEventListener('resize', initializeOrResetSlider);
        }
    }

    // --- Gallery Page: Image Slideshows and Modal ---
    const galleryPageContainer = document.getElementById('gallery-page');
    if (galleryPageContainer) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalImageTitle'); // For accessibility
        const closeModalBtnGallery = modal ? modal.querySelector('.close-modal') : null;
        const prevModalBtn = modal ? modal.querySelector('.prev-modal') : null;
        const nextModalBtn = modal ? modal.querySelector('.next-modal') : null;

        let currentGalleryImages = [];
        let currentGalleryAlts = [];
        let currentImageIndexInModal = 0;

        document.querySelectorAll('#gallery-page .image-grid-container').forEach(gridContainer => {
            const grid = gridContainer.querySelector('.image-grid');
            if (!grid) return;
            const images = Array.from(grid.querySelectorAll('img'));
            if (images.length === 0) return;

            let currentSlideIndex = 0;
            if (images.length > 1) {
                setInterval(() => {
                    currentSlideIndex = (currentSlideIndex + 1) % images.length;
                    grid.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
                }, 2500); // Slightly slower interval
            }

            images.forEach((img, index) => {
                img.addEventListener('click', () => {
                    currentGalleryImages = images.map(i => i.src);
                    currentGalleryAlts = images.map(i => i.alt || 'Gallery image'); // Fallback alt
                    currentImageIndexInModal = index;
                    openImageModal(currentGalleryImages[currentImageIndexInModal], currentGalleryAlts[currentImageIndexInModal]);
                });
            });
        });

        function openImageModal(src, altText) {
            if (modal && modalImg && modalTitle) {
                modal.classList.add('active'); // Use class to trigger CSS transition
                modalImg.src = src;
                modalImg.alt = altText;
                modalTitle.textContent = altText; // For screen readers
                document.body.style.overflow = 'hidden'; // Prevent background scroll
                updateModalNavButtons();
                modal.focus(); // Focus the modal for keyboard navigation
            }
        }

        function closeImageModal() {
            if (modal) {
                modal.classList.remove('active'); // Use class to trigger CSS transition
                document.body.style.overflow = '';
            }
        }

        function updateModalNavButtons() {
            if (prevModalBtn && nextModalBtn) {
                const showButtons = currentGalleryImages.length > 1;
                prevModalBtn.style.display = showButtons ? 'block' : 'none';
                nextModalBtn.style.display = showButtons ? 'block' : 'none';
            }
        }

        if (closeModalBtnGallery) closeModalBtnGallery.onclick = closeImageModal;
        if (prevModalBtn) {
            prevModalBtn.onclick = () => {
                currentImageIndexInModal = (currentImageIndexInModal - 1 + currentGalleryImages.length) % currentGalleryImages.length;
                if (modalImg) {
                    modalImg.src = currentGalleryImages[currentImageIndexInModal];
                    modalImg.alt = currentGalleryAlts[currentImageIndexInModal];
                    if (modalTitle) modalTitle.textContent = currentGalleryAlts[currentImageIndexInModal];
                }
            };
        }
        if (nextModalBtn) {
            nextModalBtn.onclick = () => {
                currentImageIndexInModal = (currentImageIndexInModal + 1) % currentGalleryImages.length;
                if (modalImg) {
                    modalImg.src = currentGalleryImages[currentImageIndexInModal];
                    modalImg.alt = currentGalleryAlts[currentImageIndexInModal];
                    if (modalTitle) modalTitle.textContent = currentGalleryAlts[currentImageIndexInModal];
                }
            };
        }

        if (modal) {
            modal.addEventListener('click', (event) => { // Click outside modal content to close
                if (event.target === modal) closeImageModal();
            });
            window.addEventListener('keydown', (event) => {
                if (modal.classList.contains('active')) { // Check class instead of style.display
                    if (event.key === 'Escape') closeImageModal();
                    if (event.key === 'ArrowLeft' && prevModalBtn && currentGalleryImages.length > 1) prevModalBtn.click();
                    if (event.key === 'ArrowRight' && nextModalBtn && currentGalleryImages.length > 1) nextModalBtn.click();
                }
            });
        }
    }

    // --- Contact Page: Form Submission ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                alert('Please fill in all fields.'); return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Simple email validation
                alert('Please enter a valid email address.'); return;
            }

            // Placeholder for form submission (e.g., using Fetch API to send data)
            console.log('Form Submitted (Placeholder):', { name, email, message });
            alert('Thank you for your message! We will get back to you soon. (This is a demo)');
            contactForm.reset();
        });
    }

    // --- Hard Refresh Logic for Data (Notices, Results) ---
    async function getActiveCacheName() {
        try {
            const keys = await caches.keys();
            return keys.find(key => key.startsWith(CACHE_PREFIX));
        } catch (error) {
            console.error("Error getting cache keys:", error);
            return null;
        }
    }

    async function handleDataRefresh(jsonFileRelativePath, loadDataFunction, buttonElement, statusElement) {
        if (buttonElement) buttonElement.disabled = true;
        if (statusElement) statusElement.textContent = 'Refreshing data...';

        const fullJsonUrl = `${GH_PAGES_PREFIX}${jsonFileRelativePath}`;

        try {
            const activeCacheName = await getActiveCacheName();
            if (activeCacheName) {
                const cache = await caches.open(activeCacheName);
                await cache.delete(new Request(fullJsonUrl)); // Delete specific JSON from cache
                console.log(`Deleted ${fullJsonUrl} from cache ${activeCacheName}.`);
            }

            await loadDataFunction(true); // Pass true to force network reload

            if (statusElement) statusElement.textContent = 'Data refreshed successfully.';

            // Check for Service Worker updates
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && registration.waiting) {
                    statusElement.textContent = 'New app version found. Activating...';
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        statusElement.textContent = 'App updated. Reloading page...';
                        setTimeout(() => window.location.reload(), 1000); // Delay for message visibility
                    }, { once: true });
                } else if (registration) {
                    await registration.update(); // Check for SW update in background
                }
            }
        } catch (error) {
            console.error('Data refresh process failed:', error);
            if (statusElement) statusElement.textContent = `Error refreshing: ${error.message.substring(0, 100)}`;
        } finally {
            if (buttonElement) buttonElement.disabled = false;
            setTimeout(() => {
                if (statusElement && !statusElement.textContent.includes('Activating...') && !statusElement.textContent.includes('Reloading page...')) {
                    statusElement.textContent = '';
                }
            }, 7000);
        }
    }

    // --- Results Page Specific Logic ---
    const resultsPage = document.getElementById('results-page');
    if (resultsPage) {
        const selectClassDropdown = document.getElementById('select-class');
        const selectTestDropdown = document.getElementById('select-test');
        const resultsTableContainer = document.getElementById('results-table-container');
        let resultsData = null;

        async function loadResultsData(forceNetwork = false) {
            try {
                const resultsJsonPath = `${GH_PAGES_PREFIX}/results/results.json`;
                const fetchOptions = forceNetwork ? { cache: 'reload' } : {};
                const response = await fetch(resultsJsonPath, fetchOptions);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} for ${resultsJsonPath}`);
                resultsData = await response.json();

                populateClassSelector();
                // Re-apply selections if they exist
                if (selectClassDropdown.value) {
                    populateTestSelector(selectClassDropdown.value);
                    if (selectTestDropdown.value) {
                        displayResultsTable(selectClassDropdown.value, selectTestDropdown.value);
                    } else {
                        resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
                    }
                } else {
                     resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a class to view results.</p>`;
                }
            } catch (error) {
                console.error("Could not load results data:", error);
                resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results: ${error.message}.</p>`;
            }
        }

        function populateClassSelector() {
            if (!resultsData || !selectClassDropdown) return;
            const currentSelectedClass = selectClassDropdown.value;
            selectClassDropdown.innerHTML = '<option value="">-- Select Class --</option>'; // Clear and add default

            const classes = Object.keys(resultsData).sort((a, b) =>
                parseInt(a.replace('class', ''), 10) - parseInt(b.replace('class', ''), 10)
            );
            classes.forEach(className => {
                const option = new Option(`Class ${className.replace('class', '')}`, className);
                selectClassDropdown.add(option);
            });
            if (classes.includes(currentSelectedClass)) selectClassDropdown.value = currentSelectedClass;
        }

        function populateTestSelector(selectedClassKey) {
            if (!resultsData || !selectTestDropdown || !resultsData[selectedClassKey]) {
                selectTestDropdown.innerHTML = '<option value="">-- Select Test --</option>';
                selectTestDropdown.disabled = true;
                resultsTableContainer.innerHTML = `<p class="no-results-message">No data for selected class.</p>`;
                return;
            }
            const currentSelectedTest = selectTestDropdown.value;
            selectTestDropdown.innerHTML = '<option value="">-- Select Test --</option>';
            const tests = Object.keys(resultsData[selectedClassKey]).sort();

            if (tests.length > 0) {
                tests.forEach(testKey => {
                    const testName = testKey.replace(/([A-Za-z])(\d+)/, '$1 $2').replace(/^./, str => str.toUpperCase());
                    const option = new Option(testName, testKey);
                    selectTestDropdown.add(option);
                });
                selectTestDropdown.disabled = false;
                if (tests.includes(currentSelectedTest)) selectTestDropdown.value = currentSelectedTest;
            } else {
                selectTestDropdown.disabled = true;
                resultsTableContainer.innerHTML = `<p class="no-results-message">No tests available for selected class.</p>`;
            }
        }

        function displayResultsTable(classKey, testKey) {
            if (!resultsData || !resultsTableContainer || !resultsData[classKey] || !resultsData[classKey][testKey]) {
                resultsTableContainer.innerHTML = `<p class="no-results-message">No results data for the selected criteria.</p>`;
                return;
            }
            const students = resultsData[classKey][testKey];
            if (!Array.isArray(students) || students.length === 0) {
                resultsTableContainer.innerHTML = `<p class="no-results-message">No student results found.</p>`;
                return;
            }

            // Define table columns configuration
            const columnConfig = [
                { key: 'Rank', displayName: 'Rank', className: 'rank-column' },
                { key: 'Name', displayName: 'Name', className: 'name-column' },
                { key: 'Hindi', displayName: 'Hindi' }, { key: 'English', displayName: 'English' },
                { key: 'Science', displayName: 'Science' }, { key: 'SocialS', displayName: 'Social Studies' },
                { key: 'Maths', displayName: 'Maths' }, { key: 'Sanskrit', displayName: 'Sanskrit' },
                { key: 'Total', displayName: 'Total', className: 'total-column' },
                { key: 'Percentage', displayName: 'Percentage', className: 'percentage-column' }
            ];

            const table = document.createElement('table');
            table.className = 'results-table';
            const thead = table.createTHead();
            const tbody = table.createTBody();
            const headerRow = thead.insertRow();

            columnConfig.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col.displayName;
                headerRow.appendChild(th);
            });

            students.forEach(student => {
                const row = tbody.insertRow();
                columnConfig.forEach(col => {
                    const cell = row.insertCell();
                    cell.textContent = student[col.key] !== undefined ? student[col.key] : '-';
                    if (col.className) cell.className = col.className;
                });
            });
            resultsTableContainer.innerHTML = ''; // Clear previous content
            resultsTableContainer.appendChild(table);
        }

        selectClassDropdown.addEventListener('change', function() {
            resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            selectTestDropdown.innerHTML = '<option value="">-- Select Test --</option>';
            selectTestDropdown.disabled = true;
            if (this.value) populateTestSelector(this.value);
        });

        selectTestDropdown.addEventListener('change', function() {
            const selectedClass = selectClassDropdown.value;
            if (selectedClass && this.value) {
                displayResultsTable(selectedClass, this.value);
            } else {
                resultsTableContainer.innerHTML = `<p class="no-results-message">Please select both class and test.</p>`;
            }
        });

        loadResultsData(); // Initial load
        const refreshResultsButton = document.getElementById('refresh-results-button');
        const resultsStatusElement = document.getElementById('results-refresh-status');
        if (refreshResultsButton) {
            refreshResultsButton.addEventListener('click', () => {
                handleDataRefresh('/results/results.json', loadResultsData, refreshResultsButton, resultsStatusElement);
            });
        }
    }

    // --- Notice Board Page Specific Logic ---
    const noticeBoardPage = document.getElementById('notice-board-page');
    if (noticeBoardPage) {
        const noticesContainer = document.getElementById('notices-container');

        async function loadNotices(forceNetwork = false) {
            if (!noticesContainer) return;
            noticesContainer.innerHTML = `<p class="loading-notices">Loading notices...</p>`;

            try {
                const noticesJsonPath = `${GH_PAGES_PREFIX}/data/notices.json`;
                const fetchOptions = forceNetwork ? { cache: 'reload' } : {};
                const response = await fetch(noticesJsonPath, fetchOptions);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} for ${noticesJsonPath}`);
                const notices = await response.json();

                displayNotices(notices);
                checkForNewNotices(); // Update global indicator after loading
            } catch (error) {
                console.error("Could not load notices:", error);
                noticesContainer.innerHTML = `<p class="no-notices-message">Error loading notices: ${error.message}.</p>`;
            }
        }

        function displayNotices(notices) {
            if (!noticesContainer) return;
            if (!Array.isArray(notices) || notices.length === 0) {
                noticesContainer.innerHTML = `<p class="no-notices-message">No notices to display at the moment.</p>`;
                return;
            }

            notices.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first
            noticesContainer.innerHTML = ''; // Clear loading message or old notices

            notices.forEach(notice => {
                const noticeCard = document.createElement('article'); // Use article for semantic meaning
                noticeCard.className = `notice-card ${notice.isNew ? 'new-notice' : ''}`;
                noticeCard.setAttribute('aria-labelledby', `notice-title-${notice.id}`);

                const noticeDate = new Date(notice.date);
                const formattedDate = noticeDate.toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });

                let noticeHTML = '';
                if (notice.isNew) {
                    noticeHTML += `<span class="new-badge" aria-hidden="true">NEW</span>`;
                }
                noticeHTML += `<h3 id="notice-title-${notice.id}">${notice.title}</h3>
                               <p class="notice-date"><i class="fas fa-calendar-alt" aria-hidden="true"></i> Published: ${formattedDate}</p>
                               <div class="notice-description">${notice.description.replace(/\n/g, '<br>')}</div>`;
                if (notice.image) {
                    noticeHTML += `<div class="notice-image-container">
                                     <img src="${GH_PAGES_PREFIX}/${notice.image}" alt="Image for notice: ${notice.title}" class="notice-image">
                                   </div>`;
                }
                noticeCard.innerHTML = noticeHTML;
                noticesContainer.appendChild(noticeCard);
            });
        }

        loadNotices(); // Initial load
        const refreshNoticesButton = document.getElementById('refresh-notices-button');
        const noticeStatusElement = document.getElementById('notice-refresh-status');
        if (refreshNoticesButton) {
            refreshNoticesButton.addEventListener('click', () => {
                handleDataRefresh('/data/notices.json', loadNotices, refreshNoticesButton, noticeStatusElement);
            });
        }
    }
});