document.addEventListener("DOMContentLoaded", function () {
  // Select all level 1 menu items and sublists
  const mainMenuItems = document.querySelectorAll(".mainMenu .Level_1");
  const subLists = document.querySelectorAll(".sublist");

  // Add click event listener to each level 1 menu item
  mainMenuItems.forEach(function (item) {
      item.addEventListener("click", function (event) {
          event.preventDefault();

          // Toggle active class for the clicked menu item
          mainMenuItems.forEach(function (menuItem) {
              menuItem.classList.remove("active");
          });
          this.classList.add("active");

          // Toggle active class for the corresponding sublist
          subLists.forEach(function (subList) {
              subList.classList.remove("active");
          });
          const sublist = this.nextElementSibling;
          if (sublist && sublist.classList.contains("sublist")) {
              sublist.classList.add("active");
          }
      });
  });

  // Toggle main menu visibility when mjc button is clicked
  const mjcButton = document.getElementById("mjc");
  const mainMenu = document.querySelector(".mainMenu");
  const nav = document.querySelector("nav");

  mjcButton.addEventListener("click", function () {
      mainMenu.classList.toggle("active");
      // mjcButton.classList.toggle("top-left");
      // nav.classList.toggle("menu-active");
  });

  // Close all lists if clicked outside the menu
  document.addEventListener("click", function (event) {
      if (!event.target.closest(".mjc")) {
          mainMenu.classList.remove("active");
          subLists.forEach(function (subList) {
              subList.classList.remove("active");
          });
      }
  });
});
