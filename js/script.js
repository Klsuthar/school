document.addEventListener('DOMContentLoaded', () => {
    // --- PWA: Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/school/sw.js', { scope: '/school/' }) // Ensure scope matches manifest
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        console.log('New content is available and will be used when all tabs for this scope are closed, or if refreshed via button.');
                                        // A new SW is waiting. The refresh button can activate it.
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

    // ... (WCO logic, menu toggle, active nav link logic remains the same) ...
    const menuToggle = document.querySelector('.menu-toggle');
    const topNavUl = document.querySelector('header nav ul'); 
    if (menuToggle && topNavUl) {
        menuToggle.addEventListener('click', () => {
            topNavUl.classList.toggle('active');
        });
    }

    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html';
    if (currentPageFile === '' && pathSegments.length > 0 && pathSegments[pathSegments.length -1] !== '') {
        currentPageFile = 'index.html';
    } else if (currentPageFile === '') {
         currentPageFile = 'index.html';
    }
    
    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        let linkHrefFile = linkHref.split('/').pop();
        if (linkHrefFile === '' && linkHref.endsWith('/')) { 
            linkHrefFile = 'index.html';
        }

        if (linkHrefFile && linkHrefFile === currentPageFile) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

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
    // ... (This logic remains the same) ...
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
            const response = await fetch(noticesPath, {cache: "no-store"}); // Check network always for indicator

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

    // --- Home Page Specific ---
    // ... (resultsSliderContainer logic remains the same) ...
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
    // ... (gallery logic remains the same) ...
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
    // ... (contact form logic remains the same) ...
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


    // --- START: Hard Refresh Logic ---
    const GH_PAGES_PREFIX = '/school'; // Define this globally or pass it if needed

    async function getActiveCacheName() {
        const cachePrefix = 'springfield-academy-cache'; // Must match sw.js
        try {
            const keys = await caches.keys();
            const activeCache = keys.find(key => key.startsWith(cachePrefix));
            // console.log('Found active cache:', activeCache);
            return activeCache;
        } catch (error) {
            console.error("Error getting cache keys:", error);
            return null;
        }
    }

    async function handleHardRefresh(jsonFileRelativePath, loadDataFunction, buttonElement, statusElement) {
        if (buttonElement) buttonElement.disabled = true;
        if (statusElement) statusElement.textContent = 'Refreshing data...';

        const fullJsonUrl = `${GH_PAGES_PREFIX}${jsonFileRelativePath}`;

        try {
            const activeCacheName = await getActiveCacheName();
            if (activeCacheName) {
                const cache = await caches.open(activeCacheName);
                const deleteResponse = await cache.delete(new Request(fullJsonUrl)); // Use Request object
                console.log(`Attempted to delete ${fullJsonUrl} from cache ${activeCacheName}. Success: ${deleteResponse}`);
            } else {
                console.warn('Could not determine active cache name to delete from.');
            }

            await loadDataFunction(true); // Pass true to use cache: 'reload'

            if (statusElement) statusElement.textContent = 'Data refreshed successfully.';

            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && registration.waiting) {
                    if (statusElement) statusElement.textContent = 'New app version found. Activating...';
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        if (statusElement) statusElement.textContent = 'App updated. Reloading page...';
                        // Delay reload slightly to ensure message is visible if controllerchange is very fast
                        setTimeout(() => window.location.reload(), 500);
                    }, { once: true });
                } else if (registration) {
                    // Optional: Check for an update in the background without forcing immediate reload
                    // This might find a new version that wasn't 'waiting' yet.
                    registration.update().then(newRegistration => {
                        if (newRegistration && newRegistration.installing) {
                           console.log("Service Worker update found and is installing in background.");
                           if (statusElement && statusElement.textContent.startsWith('Data refreshed')) {
                               statusElement.textContent += ' (App update installing...)';
                           }
                        }
                    }).catch(err => console.warn("SW update check failed:", err));
                }
            }
        } catch (error) {
            console.error('Hard refresh process failed:', error);
            if (statusElement) statusElement.textContent = `Error refreshing: ${error.message.substring(0,100)}`;
        } finally {
            if (buttonElement) buttonElement.disabled = false;
            setTimeout(() => {
                if (statusElement && !statusElement.textContent.includes('Activating...') && !statusElement.textContent.includes('Reloading page...')) {
                    statusElement.textContent = '';
                }
            }, 7000); // Clear status message after 7 seconds if not an app update message
        }
    }
    // --- END: Hard Refresh Logic ---


    // --- Results Page Specific (Modified) ---
    const selectClassDropdown = document.getElementById('select-class');
    const selectTestDropdown = document.getElementById('select-test');
    const resultsTableContainer = document.getElementById('results-table-container');
    let resultsData = null;

    async function loadResultsData(useCacheReload = false) { // Added useCacheReload flag
        try {
            const resultsPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/results/results.json';
            const fetchOptions = useCacheReload ? { cache: 'reload' } : {};
            const response = await fetch(resultsPath, fetchOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - Could not fetch ${resultsPath}.`);
            }
            resultsData = await response.json();
            populateClassSelector();
            // After loading new data, if a class and test were selected, re-display them
            if (selectClassDropdown.value && selectTestDropdown.value && !selectTestDropdown.disabled) {
                displayResultsTable(selectClassDropdown.value, selectTestDropdown.value);
            } else if (selectClassDropdown.value) { // Only class was selected, repopulate tests
                 populateTestSelector(selectClassDropdown.value);
                 if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            } else {
                 if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a class and test to view results.</p>`;
            }

        } catch (error) {
            console.error("Could not load results data:", error);
            if (resultsTableContainer) {
                 resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results data: ${error.message}.</p>`;
            }
        }
    }
    // ... (populateClassSelector, populateTestSelector, displayResultsTable remain the same) ...
    function populateClassSelector() {
        if (!resultsData || !selectClassDropdown) return;
        const currentSelectedClass = selectClassDropdown.value; // Preserve selection
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
        if (classes.includes(currentSelectedClass)) { // Restore selection
            selectClassDropdown.value = currentSelectedClass;
        }
    }

    function populateTestSelector(selectedClassKey) {
        if (!resultsData || !selectTestDropdown || !resultsData[selectedClassKey]) {
            selectTestDropdown.length = 1; 
            selectTestDropdown.disabled = true;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">No data for selected class.</p>`;
            return;
        }
        const currentSelectedTest = selectTestDropdown.value; // Preserve selection
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
            if (tests.includes(currentSelectedTest)) { // Restore selection
                selectTestDropdown.value = currentSelectedTest;
            }
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
                if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select both class and test to view results.</p>`;
            }
        });
    }

    if (document.getElementById('results-page')) {
        loadResultsData();
        const refreshResultsButton = document.getElementById('refresh-results-button');
        const resultsStatusElement = document.getElementById('results-refresh-status');
        if (refreshResultsButton) {
            refreshResultsButton.addEventListener('click', () => {
                handleHardRefresh('/results/results.json', loadResultsData, refreshResultsButton, resultsStatusElement);
            });
        }
    }
    // --- End of Results Page Specific ---


    // --- Notice Board Page Specific (Modified) ---
    const noticesContainer = document.getElementById('notices-container');

    async function loadNotices(useCacheReload = false) { // Added useCacheReload flag
        if (!noticesContainer) return;
        noticesContainer.innerHTML = `<p class="loading-notices">Loading notices...</p>`; // Show loading message

        try {
            const noticesPath = (window.location.pathname.includes('/school/') ? '/school' : '') + '/data/notices.json';
            const fetchOptions = useCacheReload ? { cache: 'reload' } : {};
            const response = await fetch(noticesPath, fetchOptions);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. Check '${noticesPath}'.`);
            }
            const notices = await response.json();
            displayNotices(notices);
            checkForNewNotices(); // Re-check indicator after loading notices
        } catch (error) {
            console.error("Could not load notices:", error);
            noticesContainer.innerHTML = `<p class="no-notices-message">Error loading notices: ${error.message}.</p>`;
        }
    }

    // ... (displayNotices function remains the same) ...
    function displayNotices(notices) {
        if (!noticesContainer) return;

        if (!Array.isArray(notices) || notices.length === 0) {
            noticesContainer.innerHTML = `<p class="no-notices-message">No notices to display at the moment.</p>`;
            return;
        }

        notices.sort((a, b) => new Date(b.date) - new Date(a.date));

        let noticesHTML = '';
        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            const formattedDate = noticeDate.toLocaleDateString('en-GB', { 
                day: 'numeric', month: 'long', year: 'numeric'
            });
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

    if (document.getElementById('notice-board-page')) {
        loadNotices();
        const refreshNoticesButton = document.getElementById('refresh-notices-button');
        const noticeStatusElement = document.getElementById('notice-refresh-status');
        if (refreshNoticesButton) {
            refreshNoticesButton.addEventListener('click', () => {
                handleHardRefresh('/data/notices.json', loadNotices, refreshNoticesButton, noticeStatusElement);
            });
        }
    }
    // --- End of Notice Board Page Specific ---

}); // End of DOMContentLoaded