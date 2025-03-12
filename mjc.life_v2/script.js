document.addEventListener("DOMContentLoaded", function () {
    const mjcButton = document.getElementById("mjc");
    const mainMenu = document.querySelector(".mainMenu");
    const allMenuItems = document.querySelectorAll(".mainMenu a");
    const contentContainers = document.querySelectorAll(".content.container");
    const galleryContainers = document.querySelectorAll(".gallery.container");

    // Hide all content and gallery containers on load
    contentContainers.forEach(container => container.style.display = "none");
    galleryContainers.forEach(container => container.style.display = "none");

    // Toggle menu visibility when mjcButton is clicked
    mjcButton.addEventListener("click", function () {
        mainMenu.classList.toggle("active");
        mjcButton.classList.toggle("open");

        // Hide all content and gallery containers when mjcButton is clicked
        contentContainers.forEach(container => container.style.display = "none");
        galleryContainers.forEach(container => container.style.display = "none");
    });

    // Add click event listeners to all menu items
    allMenuItems.forEach(function (item) {
        item.addEventListener("click", function (event) {
            event.preventDefault();

            const sublist = this.nextElementSibling;
            const isActive = this.classList.contains("active");

            // Close all sublists and remove active class from all menu items at the same level
            closeSiblingSubLists(this);

            // Add active class to the clicked menu item and its sublist if it wasn't active
            if (!isActive) {
                this.classList.add("active");
                if (sublist && (sublist.classList.contains("sublist") || sublist.classList.contains("subSublist"))) {
                    sublist.classList.add("active");
                }
            }

            // Hide all content and gallery containers
            contentContainers.forEach(container => container.style.display = "none");
            galleryContainers.forEach(container => container.style.display = "none");

            // Show content container and gallery for Mangosalad if clicked
            if (this.id === "mangosaladLink") {
                document.getElementById("mangosalad").style.display = "block";
                document.getElementById("mangosaladGallery").style.display = "flex";
            }

            // Show content container and gallery for Design if clicked
            if (this.id === "designLink") {
                document.getElementById("design").style.display = "block";
                document.getElementById("designGallery").style.display = "flex";
            }

            // Show content container and gallery for Tattoos if clicked
            if (this.id === "tattoosLink") {
                document.getElementById("tattoos").style.display = "block";
                document.getElementById("tattoosGallery").style.display = "flex";
            }

            // Show content container and gallery for Art if clicked
            if (this.id === "artLink") {
                document.getElementById("artGallery").style.display = "flex";
            }

            // Show content container and gallery for Weirdworld if clicked
            if (this.id === "weirdworldLink") {
                document.getElementById("weirdworld").style.display = "block";
                document.getElementById("weirdworldGallery").style.display = "flex"; // Corrected ID here
            }
        });
    });

    // Function to close sibling sublists
    function closeSiblingSubLists(element) {
        const parent = element.parentElement.parentElement;
        const siblings = parent.querySelectorAll(':scope > li > a');

        siblings.forEach(function (sibling) {
            if (sibling !== element) {
                sibling.classList.remove("active");
                const siblingSublist = sibling.nextElementSibling;
                if (siblingSublist && (siblingSublist.classList.contains("sublist") || siblingSublist.classList.contains("subSublist"))) {
                    siblingSublist.classList.remove("active");
                }
            }
        });
    }

    // Close all lists if clicked outside the menu
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".mjc") && !event.target.closest(".content.container") && !event.target.closest(".gallery.container")) {
            mainMenu.classList.remove("active");
            mjcButton.classList.remove("open");
            closeAllSubLists();

            // Hide all content and gallery containers
            contentContainers.forEach(container => container.style.display = "none");
            galleryContainers.forEach(container => container.style.display = "none");
        }
    });

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
