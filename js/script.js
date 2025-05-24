// school-website/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Common Elements ---
    const menuToggle = document.querySelector('.menu-toggle');
    const topNavUl = document.querySelector('header nav ul');
    if (menuToggle && topNavUl) {
        menuToggle.addEventListener('click', () => {
            topNavUl.classList.toggle('active');
        });
    }

    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html';
    let basePath = pathSegments.join('/') + '/'; // e.g. "/school/" or "/"
    if (basePath === "//") basePath = "/"; // Handles case where site is at root

    if (currentPageFile === '' && (basePath === "/school/" || basePath === "/")) {
        currentPageFile = 'index.html';
    }


    const topNavLinks = document.querySelectorAll('header nav ul li a');
    topNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Compare filename part of href with currentPageFile
        const linkFileName = linkHref.split('/').pop() || 'index.html';
        if (linkFileName === currentPageFile) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    const bottomNavLinks = document.querySelectorAll('.bottom-nav-bar .bottom-nav-link');
    bottomNavLinks.forEach(link => {
        const linkPage = link.dataset.page;
        const linkPageFileName = linkPage.split('/').pop() || 'index.html';
        if (linkPageFileName === currentPageFile) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

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
            // Assuming script.js is in /school/js/script.js, data/notices.json means /school/data/notices.json
            // If issues, use absolute path: fetch('/school/data/notices.json')
            const response = await fetch('data/notices.json');
            if (!response.ok) {
                console.warn("Could not fetch notices.json. Status:", response.status);
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

    const resultsSliderContainer = document.querySelector('.results-slider');
    if (resultsSliderContainer) {
        const resultsTrack = resultsSliderContainer.querySelector('.results-track');
        if (resultsTrack && resultsTrack.children.length > 0) {
            const originalCards = Array.from(resultsTrack.children);
            let cardWidth, visibleCards, currentIndex = 0, intervalId;

            function calculateCardWidthAndVisible() {
                if (originalCards.length > 0) {
                    const currentCard = originalCards[0];
                    const computedStyle = window.getComputedStyle(currentCard);
                    const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
                    const marginRight = parseFloat(computedStyle.marginRight) || 0;
                    cardWidth = currentCard.offsetWidth + marginLeft + marginRight;
                    visibleCards = (resultsSliderContainer.offsetWidth > 0 && cardWidth > 0) ? Math.floor(resultsSliderContainer.offsetWidth / cardWidth) : originalCards.length;
                } else {
                    visibleCards = 0;
                }
            }
            calculateCardWidthAndVisible();

            if (originalCards.length > 0 && originalCards.length > visibleCards) {
                originalCards.forEach(card => resultsTrack.appendChild(card.cloneNode(true)));
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
                    if (originalCards.length > visibleCards) intervalId = setInterval(slideResults, 3000);
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

    const galleryGrids = document.querySelectorAll('.image-grid-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeModalBtnGallery = document.querySelector('.close-modal');
    const prevModalBtn = document.querySelector('.prev-modal');
    const nextModalBtn = document.querySelector('.next-modal');
    let currentGalleryImages = [], currentImageIndex = 0;

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
        if (images.length > 1) setInterval(slideGallery, 2000);
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
    if (closeModalBtnGallery) closeModalBtnGallery.onclick = () => { if (modal) modal.style.display = "none"; };
    if (prevModalBtn) prevModalBtn.onclick = () => { currentImageIndex = (currentImageIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length; if (modalImg) modalImg.src = currentGalleryImages[currentImageIndex]; };
    if (nextModalBtn) nextModalBtn.onclick = () => { currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length; if (modalImg) modalImg.src = currentGalleryImages[currentImageIndex]; };
    if (modal) {
        window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = "none"; });
        window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.style.display === 'block') modal.style.display = 'none'; });
    }

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            if (!name || !email || !message) { alert('Please fill in all fields.'); return; }
            if (!validateEmail(email)) { alert('Please enter a valid email address.'); return; }
            console.log('Form Submitted:', { name, email, message });
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
    function validateEmail(email) { const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; return re.test(String(email).toLowerCase()); }

    const selectClassDropdown = document.getElementById('select-class');
    const selectTestDropdown = document.getElementById('select-test');
    const resultsTableContainer = document.getElementById('results-table-container');
    let resultsData = null;

    async function loadResultsData() {
        try {
            // If issues, use absolute path: fetch('/school/results/results.json')
            const response = await fetch('results/results.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            resultsData = await response.json();
            populateClassSelector();
        } catch (error) {
            console.error("Could not load results data:", error);
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Error loading results data.</p>`;
        }
    }
    function populateClassSelector() {
        if (!resultsData || !selectClassDropdown) return;
        selectClassDropdown.length = 1;
        const classes = Object.keys(resultsData).sort((a, b) => parseInt(a.replace('class', ''), 10) - parseInt(b.replace('class', ''), 10));
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className.replace('class', 'Class ');
            selectClassDropdown.appendChild(option);
        });
    }
    function populateTestSelector(selectedClassKey) {
        if (!resultsData || !selectTestDropdown || !resultsData[selectedClassKey]) {
            selectTestDropdown.length = 1; selectTestDropdown.disabled = true;
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
            resultsTableContainer.innerHTML = `<p class="no-results-message">No results data for criteria.</p>`; return;
        }
        const students = resultsData[classKey][testKey];
        if (!Array.isArray(students) || students.length === 0) {
            resultsTableContainer.innerHTML = `<p class="no-results-message">No students in result set.</p>`; return;
        }
        const columnConfig = [ { key: 'Rank', displayName: 'Rank', className: 'rank-column' }, { key: 'Name', displayName: 'Name', className: 'name-column' }, { key: 'Hindi', displayName: 'Hindi' }, { key: 'English', displayName: 'English' }, { key: 'Science', displayName: 'Science' }, { key: 'SocialS', displayName: 'Social Studies' }, { key: 'Maths', displayName: 'Maths' }, { key: 'Sanskrit', displayName: 'Sanskrit' }, { key: 'Total', displayName: 'Total', className: 'total-column' }, { key: 'Percentage', displayName: 'Percentage', className: 'percentage-column' } ];
        let tableHTML = '<table class="results-table"><thead><tr>';
        columnConfig.forEach(col => { tableHTML += `<th>${col.displayName}</th>`; });
        tableHTML += '</tr></thead><tbody>';
        students.forEach(student => {
            tableHTML += '<tr>';
            columnConfig.forEach(col => { tableHTML += `<td class="${col.className || ''}">${student[col.key] !== undefined ? student[col.key] : '-'}</td>`; });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        resultsTableContainer.innerHTML = tableHTML;
    }
    if (selectClassDropdown) {
        selectClassDropdown.addEventListener('change', function() {
            const selectedClass = this.value;
            if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Please select a test to view results.</p>`;
            selectTestDropdown.length = 1; selectTestDropdown.disabled = true;
            if (selectedClass) populateTestSelector(selectedClass);
        });
    }
    if (selectTestDropdown) {
        selectTestDropdown.addEventListener('change', function() {
            const selectedClass = selectClassDropdown.value;
            const selectedTest = this.value;
            if (selectedClass && selectedTest) displayResultsTable(selectedClass, selectedTest);
            else if (resultsTableContainer) resultsTableContainer.innerHTML = `<p class="no-results-message">Select class and test.</p>`;
        });
    }
    if (document.getElementById('results-page')) loadResultsData();

    const noticesContainer = document.getElementById('notices-container');
    async function loadNotices() {
        if (!noticesContainer) return;
        try {
            // If issues, use absolute path: fetch('/school/data/notices.json')
            const response = await fetch('data/notices.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const notices = await response.json();
            displayNotices(notices);
        } catch (error) {
            console.error("Could not load notices:", error);
            noticesContainer.innerHTML = `<p class="no-notices-message">Error loading notices.</p>`;
        }
    }
    function displayNotices(notices) {
        if (!noticesContainer) return;
        if (!Array.isArray(notices) || notices.length === 0) {
            noticesContainer.innerHTML = `<p class="no-notices-message">No notices to display.</p>`; return;
        }
        notices.sort((a, b) => new Date(b.date) - new Date(a.date));
        let noticesHTML = '';
        notices.forEach(notice => {
            const noticeDate = new Date(notice.date);
            const formattedDate = noticeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const descriptionHTML = notice.description.replace(/\n/g, '<br>');
            noticesHTML += `
                <div class="notice-card ${notice.isNew ? 'new-notice' : ''}">
                    ${notice.isNew ? '<span class="new-badge">NEW</span>' : ''}
                    <h3>${notice.title}</h3>
                    <span class="notice-date"><i class="fas fa-calendar-alt"></i> Published: ${formattedDate}</span>
                    <div class="notice-description">${descriptionHTML}</div>
                    ${notice.image ? `<div class="notice-image-container"><img src="${notice.image}" alt="${notice.title}" class="notice-image"></div>` : ''}
                </div>`;
        });
        noticesContainer.innerHTML = noticesHTML;
    }
    if (document.getElementById('notice-board-page')) loadNotices();

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Register sw.js from the /school/ path, and set its scope to /school/
        navigator.serviceWorker.register('/school/sw.js', { scope: '/school/' })
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(error => {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }
}); // End of DOMContentLoaded