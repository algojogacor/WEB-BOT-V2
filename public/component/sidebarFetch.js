/**
 * sidebarFetch.js
 * Fetches the sidebar component HTML and injects it into #sidebar-container.
 * After injection, it initialises user info (username, avatar, role)
 * and shows admin-only nav items when appropriate.
 *
 * Usage: add <script src="/component/sidebarFetch.js"></script> after api.js
 * and ensure the page has <div id="sidebar-container"></div>.
 */

(function () {
  const container = document.getElementById("sidebar-container");
  if (!container) {
    console.warn("[sidebarFetch] #sidebar-container not found on this page.");
    return;
  }

  fetch("/component/sidebar.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load sidebar: " + res.status);
      return res.text();
    })
    .then((html) => {
      container.innerHTML = html;

      // --- Initialise sidebar user info ---
      if (typeof getUser === "function") {
        const me = getUser();
        if (me) {
          const usernameEl = document.getElementById("sidebar-username");
          const avatarEl = document.getElementById("sidebar-avatar");
          const roleEl = document.getElementById("sidebar-role");

          if (usernameEl) usernameEl.textContent = me.username;
          if (avatarEl) avatarEl.textContent = me.username[0].toUpperCase();
          if (roleEl) roleEl.textContent = me.role || "user";

          // Show admin-only items
          if (me.role === "admin" || me.role === "developer") {
            document
              .querySelectorAll(".admin-only")
              .forEach((el) => el.classList.remove("hidden"));
          }
        }
      }

      // --- Highlight active nav item based on current path ---
      const currentPath = window.location.pathname;
      document.querySelectorAll("#sidebar .nav-item").forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href") === currentPath) {
          link.classList.add("active");
        }
      });
    })
    .catch((err) => {
      console.error("[sidebarFetch]", err);
    });
})();
