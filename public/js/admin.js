document.addEventListener("DOMContentLoaded", () => {
    const openModalBtns = document.querySelectorAll("[data-open-modal]");
    const closeModalBtns = document.querySelectorAll("[data-close-modal]");
    const overlays = document.querySelectorAll(".modal-overlay");

    openModalBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute("data-open-modal");
            const targetModal = document.getElementById(modalId);
            if (targetModal) {
                targetModal.classList.add("active");
            }
        });
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal-overlay");
            if (modal) {
                modal.classList.remove("active");
            }
        });
    });

    overlays.forEach(overlay => {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                overlay.classList.remove("active");
            }
        });
    });

    const liveSearchInput = document.getElementById("tableLiveSearch");
    if (liveSearchInput) {
        liveSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll(".data-table tbody tr");
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });
    }

    const confirmActions = document.querySelectorAll("[data-confirm]");
    confirmActions.forEach(element => {
        element.addEventListener("click", (e) => {
            const message = element.getAttribute("data-confirm") || "Êtes-vous sûr de vouloir effectuer cette action ?";
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
});
