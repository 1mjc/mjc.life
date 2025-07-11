document.addEventListener("DOMContentLoaded", function () {
    // DOM element references
    const mjcButton = document.getElementById("mjc");
    const mainMenu = document.querySelector(".mainMenu");
    const allMenuItems = document.querySelectorAll(".mainMenu a");
    const contentContainers = document.querySelectorAll(".content.container");
    const galleryContainers = document.querySelectorAll(".gallery.container");
    const footerLinks = document.querySelectorAll("footer a");

    // Initialize: Hide all content and gallery containers on load
    function hideAllContent() {
        contentContainers.forEach(container => container.style.display = "none");
        galleryContainers.forEach(container => container.style.display = "none");
    }

    // Close main menu
    function closeMainMenu() {
        mainMenu.classList.remove("active");
        mjcButton.classList.remove("open");
        closeAllSubLists();
    }

    // Initialize page
    hideAllContent();

    // Toggle main menu visibility when mjc button is clicked
    mjcButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        
        const isMenuOpen = mainMenu.classList.contains("active");
        
        if (isMenuOpen) {
            closeMainMenu();
            hideAllContent();
        } else {
            // Close any footer content first, then open main menu
            hideAllContent();
            mainMenu.classList.add("active");
            mjcButton.classList.add("open");
        }
    });

    // Function to show content and gallery by base id
    function showSectionById(baseId, updateHash = true) {
        hideAllContent();
        // Show content section if it exists
        const content = document.getElementById(baseId);
        if (content) {
            content.style.display = "block";
        }
        // Show gallery section if it exists
        const gallery = document.getElementById(baseId + "Gallery");
        if (gallery) {
            gallery.style.display = "flex";
        }
        // Update URL hash if needed
        if (updateHash && window.location.hash !== "#" + baseId) {
            history.pushState(null, null, "#" + baseId);
        }
    }

    // Handle main menu item clicks (modular)
    allMenuItems.forEach(function (item) {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            const href = this.getAttribute("href");
            const parentLi = this.parentElement;
            const submenu = parentLi.querySelector('.sublist, .subSublist');
            // Handle section links (direct navigation)
            if (href && href.startsWith("#") && href !== "#" && document.querySelector(href)) {
                hideAllContent();
                showSectionById(href.replace('#', ''));
                closeMainMenu();
                return;
            }
            // Handle menu items with submenus
            if (href === "#" && submenu) {
                const isCurrentlyActive = this.classList.contains("active");
                closeSiblingSubLists(this);
                if (!isCurrentlyActive) {
                    this.classList.add("active");
                    submenu.classList.add("active");
                } else {
                    this.classList.remove("active");
                    submenu.classList.remove("active");
                }
            }
            // Modular: If nav link id ends with 'Link', show corresponding section
            if (this.id && this.id.endsWith('Link')) {
                const baseId = this.id.slice(0, -4); // Remove 'Link'
                showSectionById(baseId);
                closeMainMenu();
            }
        });
    });

    // Footer navigation (still works as before)
    footerLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            const href = this.getAttribute("href");
            if (href && href.startsWith("#")) {
                event.preventDefault();
                closeMainMenu();
                hideAllContent();
                showSectionById(href.replace('#', ''));
                if (window.location.hash !== href) {
                    history.pushState(null, null, href);
                }
            }
        });
    });

    // Hash navigation (modular)
    function showContentByHash(hash) {
        if (!hash || hash === "#") return;
        const baseId = hash.replace('#', '');
        showSectionById(baseId, false);
    }

    // Handle initial page load with hash
    function handleInitialHash() {
        if (window.location.hash) {
            showContentByHash(window.location.hash);
        }
    }
    handleInitialHash();

    // Listen for hash changes (browser back/forward navigation)
    window.addEventListener("hashchange", function () {
        closeMainMenu();
        showContentByHash(window.location.hash);
    });
    window.addEventListener("popstate", function () {
        closeMainMenu();
        if (window.location.hash) {
            showContentByHash(window.location.hash);
        } else {
            hideAllContent();
        }
    });

    class BackgroundPortfolioAnimation {
        constructor(container, options = {}) {
            this.container = container;
            this.images = [];
            this.currentIndex = 0;
            this.isRunning = false;
            this.intervalId = null;
            
            // Default options
            this.options = {
                duration: options.duration || 5000, // Time each image is shown (5 seconds)
                opacity: options.opacity || 0.12,   // Background opacity (subtle)
                fadeTime: options.fadeTime || 2500, // Fade transition time
                ...options
            };
            
            this.init();
        }
        
        init() {
            // Your actual portfolio images
            this.imageUrls = [
                './assets/images/Mangosalad/L.JPEG',
                './assets/images/Mangosalad/tinme.JPEG',
                './assets/images/Mangosalad/mjc.JPEG',
                './assets/images/Mangosalad/R.JPEG',
                './assets/images/Design/bubblegum.png',
                './assets/images/Design/xRay.jpg',
                './assets/images/Design/jichaelJackson.JPEG',
                './assets/images/Design/gold.jpg',
                './assets/images/Design/bookCover.png',
                './assets/images/Design/noire.png',
                './assets/images/Art/betterThanYesterday.JPEG',
                './assets/images/Art/brazilianExperiment.png',
                './assets/images/Art/Skull.JPEG',
                './assets/images/Art/loveYouRainbowKid.png',
                './assets/images/Art/allMyFriends.jpg',
                './assets/images/Art/arcticCircle.jpg'
            ];
            
            this.createImageElements();
            this.preloadImages();
            this.start();
        }
        
        createImageElements() {
            this.imageUrls.forEach((url, index) => {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'background-image';
                imageDiv.style.backgroundImage = `url(${url})`;
                imageDiv.style.opacity = '0';
                imageDiv.style.transition = `opacity ${this.options.fadeTime}ms ease-in-out`;
                
                this.container.appendChild(imageDiv);
                this.images.push(imageDiv);
            });
        }
        
        preloadImages() {
            // Preload images for smooth transitions
            this.imageUrls.forEach(url => {
                const img = new Image();
                img.src = url;
            });
        }
        
        showImage(index) {
            // Hide all images
            this.images.forEach(img => {
                img.classList.remove('active');
                img.style.opacity = '0';
            });
            
            // Show current image with slight delay for smooth transition
            if (this.images[index]) {
                setTimeout(() => {
                    this.images[index].style.opacity = this.options.opacity;
                    this.images[index].classList.add('active');
                }, 200);
            }
        }
        
        nextImage() {
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this.showImage(this.currentIndex);
        }
        
        start() {
            if (this.isRunning) return;
            
            this.isRunning = true;
            this.showImage(this.currentIndex);
            
            this.intervalId = setInterval(() => {
                this.nextImage();
            }, this.options.duration);
        }
        
        stop() {
            this.isRunning = false;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            // Hide all images
            this.images.forEach(img => {
                img.style.opacity = '0';
                img.classList.remove('active');
            });
        }
        
        pause() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.isRunning = false;
        }
        
        resume() {
            if (!this.isRunning) {
                this.start();
            }
        }
    }

    function initBackgroundAnimation() {
        const container = document.getElementById('backgroundAnimation');
        if (container) {
            window.portfolioAnimation = new BackgroundPortfolioAnimation(container, {
                duration: 6000,  // 6 seconds per image (slower for better viewing)
                opacity: 5,   // Very subtle - 5% opacity
                fadeTime: 3000   // 3 second fade transition
            });
        }
    }

    // Initialize background animation
    initBackgroundAnimation();

    // Handle initial page load with hash
    function handleInitialHash() {
        if (window.location.hash) {
            showContentByHash(window.location.hash);
        }
    }

    // Initialize with hash if present
    handleInitialHash();

    // Listen for hash changes (browser back/forward navigation)
    window.addEventListener("hashchange", function () {
        closeMainMenu();
        showContentByHash(window.location.hash);
    });

    // Handle browser back/forward buttons
    window.addEventListener("popstate", function () {
        closeMainMenu();
        if (window.location.hash) {
            showContentByHash(window.location.hash);
        } else {
            hideAllContent();
        }
    });

    // Close menu when clicking outside (but not on footer)
    document.addEventListener("click", function (event) {
        const isClickInsideMenu = event.target.closest(".mjc") || 
                                 event.target.closest(".main-navigation") ||
                                 event.target.closest(".content.container") || 
                                 event.target.closest(".gallery.container") ||
                                 event.target.closest("footer");
        
        if (!isClickInsideMenu) {
            closeMainMenu();
            hideAllContent();
            
            // Clear URL hash when closing everything
            if (window.location.hash) {
                history.pushState(null, null, window.location.pathname);
            }
        }
    });

    // Function to close sibling sublists at the same level
    function closeSiblingSubLists(clickedElement) {
        const parentUl = clickedElement.parentElement.parentElement;
        const siblingLinks = parentUl.querySelectorAll(':scope > li > a');

        siblingLinks.forEach(function (sibling) {
            if (sibling !== clickedElement) {
                sibling.classList.remove("active");
                const siblingSubmenu = sibling.parentElement.querySelector('.sublist, .subSublist');
                if (siblingSubmenu) {
                    siblingSubmenu.classList.remove("active");
                    // Also close any nested submenus
                    const nestedSubmenus = siblingSubmenu.querySelectorAll('.sublist, .subSublist');
                    nestedSubmenus.forEach(nested => {
                        nested.classList.remove("active");
                        const nestedLinks = nested.querySelectorAll('a');
                        nestedLinks.forEach(link => link.classList.remove("active"));
                    });
                }
            }
        });
    }

    // Function to close all sublists
    function closeAllSubLists() {
        document.querySelectorAll(".sublist, .subSublist").forEach(function (subList) {
            subList.classList.remove("active");
        });
        allMenuItems.forEach(function (menuItem) {
            menuItem.classList.remove("active");
        });
    }
});