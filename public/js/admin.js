// ==========================================================
// HosBank - Admin Core Interactivity & Custom UI System
// ==========================================================

(function () {
    let confirmOverlay = null;
    let toastContainer = null;
    let currentResolver = null;

    function initConfirmationModal() {
        if (confirmOverlay) return;

        confirmOverlay = document.createElement("div");
        confirmOverlay.className = "hos-confirm-overlay";
        confirmOverlay.innerHTML = `
            <div class="hos-confirm-card" role="dialog" aria-modal="true">
                <div class="hos-confirm-header">
                    <div class="hos-confirm-icon-box type-primary" id="hosConfirmIconBox">
                        <span id="hosConfirmIcon"></span>
                    </div>
                    <div class="hos-confirm-content">
                        <div class="hos-confirm-title" id="hosConfirmTitle">Confirmation</div>
                        <div class="hos-confirm-message" id="hosConfirmMsg">Êtes-vous sûr de vouloir effectuer cette action ?</div>
                    </div>
                </div>
                <div class="hos-confirm-footer">
                    <button type="button" class="hos-btn-cancel" id="hosConfirmCancel">Annuler</button>
                    <button type="button" class="hos-btn-confirm" id="hosConfirmOk">Confirmer</button>
                </div>
            </div>
        `;

        document.body.appendChild(confirmOverlay);

        const cancelBtn = document.getElementById("hosConfirmCancel");
        const okBtn = document.getElementById("hosConfirmOk");

        const closeDialog = (result) => {
            confirmOverlay.classList.remove("active");
            if (currentResolver) {
                currentResolver(result);
                currentResolver = null;
            }
        };

        cancelBtn.addEventListener("click", () => closeDialog(false));
        okBtn.addEventListener("click", () => closeDialog(true));

        confirmOverlay.addEventListener("click", (e) => {
            if (e.target === confirmOverlay) {
                closeDialog(false);
            }
        });

        document.addEventListener("keydown", (e) => {
            if (!confirmOverlay.classList.contains("active")) return;
            if (e.key === "Escape") {
                closeDialog(false);
            } else if (e.key === "Enter") {
                closeDialog(true);
            }
        });
    }

    window.hosConfirm = function (options) {
        initConfirmationModal();

        const opts = typeof options === "string" ? { message: options } : (options || {});
        const title = opts.title || "Confirmation";
        const message = opts.message || "Veuillez confirmer cette opération.";
        const confirmText = opts.confirmText || "Confirmer";
        const cancelText = opts.cancelText || "Annuler";
        const type = opts.type || "primary";

        document.getElementById("hosConfirmTitle").textContent = title;
        document.getElementById("hosConfirmMsg").textContent = message;

        const okBtn = document.getElementById("hosConfirmOk");
        const cancelBtn = document.getElementById("hosConfirmCancel");
        const iconBox = document.getElementById("hosConfirmIconBox");
        const iconSpan = document.getElementById("hosConfirmIcon");

        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        iconBox.className = "hos-confirm-icon-box";
        okBtn.className = "hos-btn-confirm";

        if (type === "danger") {
            iconBox.classList.add("type-danger");
            okBtn.classList.add("danger");
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else if (type === "warning") {
            iconBox.classList.add("type-warning");
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else if (type === "success") {
            iconBox.classList.add("type-success");
            okBtn.classList.add("success");
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else {
            iconBox.classList.add("type-primary");
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        }

        confirmOverlay.classList.add("active");

        return new Promise((resolve) => {
            currentResolver = resolve;
        });
    };

    window.hosToast = function (message, type = "info", duration = 3500) {
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.className = "hos-toast-container";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = "hos-toast";

        let iconSvg = "";
        let iconBg = "#EFEBFA";
        let iconColor = "#685E86";

        if (type === "success") {
            iconBg = "#ECFDF5";
            iconColor = "#10B981";
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === "danger" || type === "error") {
            iconBg = "#FEE2E2";
            iconColor = "#EF4444";
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            <div class="hos-toast-icon" style="background: ${iconBg};">
                ${iconSvg}
            </div>
            <div class="hos-toast-text">${message}</div>
            <button class="hos-toast-close">&times;</button>
        `;

        const closeBtn = toast.querySelector(".hos-toast-close");
        const removeToast = () => {
            toast.classList.add("hiding");
            setTimeout(() => toast.remove(), 250);
        };

        closeBtn.addEventListener("click", removeToast);
        toastContainer.appendChild(toast);

        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    };

    window.hosAlert = function (message) {
        window.hosToast(message, "info", 4000);
    };

    // Override default alert
    window.alert = function (message) {
        window.hosToast(message, "info", 4000);
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    // 1. Modales standards
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

    // 2. Recherche en direct sur les tables
    const liveSearchInput = document.getElementById("tableLiveSearch");
    if (liveSearchInput) {
        liveSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll(".data-table tbody tr, .user-card");
            
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

    // 3. Interception moderne des actions de confirmation [data-confirm]
    document.addEventListener("click", async (e) => {
        const target = e.target.closest("[data-confirm]");
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        const message = target.getAttribute("data-confirm") || "Êtes-vous sûr de vouloir effectuer cette action ?";
        const isDestructive = /désactiver|bloquer|rejeter|supprimer|opposition/i.test(message);
        const isApproval = /approuver|valider|résoudre/i.test(message);

        let type = "primary";
        let confirmText = "Confirmer";
        let title = "Confirmation";

        if (isDestructive) {
            type = "danger";
            confirmText = "Confirmer";
            title = "Action requise";
        } else if (isApproval) {
            type = "success";
            confirmText = "Valider";
            title = "Validation requise";
        }

        const confirmed = await window.hosConfirm({
            title: title,
            message: message,
            confirmText: confirmText,
            cancelText: "Annuler",
            type: type
        });

        if (confirmed) {
            const form = target.closest("form");
            if (form) {
                HTMLFormElement.prototype.submit.call(form);
            } else if (target.tagName === "A" && target.href) {
                window.location.href = target.href;
            }
        }
    }, true);

    // 4. Interception des selects de confirmation [data-confirm-change]
    document.addEventListener("focusin", (e) => {
        const select = e.target.closest(".hos-confirm-select, [data-confirm-change]");
        if (select) {
            select.dataset.prevValue = select.value;
        }
    });

    document.addEventListener("change", async (e) => {
        const select = e.target.closest(".hos-confirm-select, [data-confirm-change]");
        if (!select) return;

        const message = select.getAttribute("data-confirm-change") || "Confirmer cette modification ?";
        const prevVal = select.dataset.prevValue !== undefined ? select.dataset.prevValue : select.value;
        const newVal = select.value;

        const confirmed = await window.hosConfirm({
            title: "Confirmation de mise à jour",
            message: message,
            confirmText: "Appliquer",
            cancelText: "Annuler",
            type: "primary"
        });

        if (confirmed) {
            select.dataset.prevValue = newVal;
            const form = select.closest("form");
            if (form) {
                HTMLFormElement.prototype.submit.call(form);
            }
        } else {
            select.value = prevVal;
        }
    });

    // =========================================================================
    // 5. GESTION DU MENU MOBILE (DRAWER) - CODE JUNIOR CLAIR ET COMMENTÉ
    // =========================================================================

    // Étape 1 : Récupérer les éléments du DOM
    const boutonMenuMobile = document.getElementById("mobileMenuToggle");
    const sidebar = document.querySelector(".admin-sidebar");
    const boutonFermer = document.getElementById("sidebarMobileClose");
    let voileFond = document.getElementById("sidebarMobileOverlay");

    // Étape 2 : Créer le fond semi-transparent s'il n'existe pas encore
    if (!voileFond) {
        voileFond = document.createElement("div");
        voileFond.id = "sidebarMobileOverlay";
        voileFond.className = "sidebar-mobile-overlay";
        document.body.appendChild(voileFond);
    }

    // Étape 3 : Fonction simple pour ouvrir le menu
    function ouvrirMenu() {
        if (sidebar) {
            sidebar.classList.add("mobile-open");
        }
        if (voileFond) {
            voileFond.classList.add("active");
        }
        // Empêcher le scroll de la page quand le menu est ouvert
        document.body.style.overflow = "hidden";
    }

    // Étape 4 : Fonction simple pour fermer le menu
    function fermerMenu() {
        if (sidebar) {
            sidebar.classList.remove("mobile-open");
        }
        if (voileFond) {
            voileFond.classList.remove("active");
        }
        // Réactiver le scroll normal
        document.body.style.overflow = "";
    }

    // Étape 5 : Écouteurs d'événements (clic sur le bouton, la croix ou le fond)
    if (boutonMenuMobile) {
        boutonMenuMobile.addEventListener("click", function(event) {
            event.stopPropagation();
            ouvrirMenu();
        });
    }

    if (boutonFermer) {
        boutonFermer.addEventListener("click", fermerMenu);
    }

    if (voileFond) {
        voileFond.addEventListener("click", fermerMenu);
    }

    // Étape 6 : Fermer le menu automatiquement quand l'utilisateur clique sur un lien de navigation
    const liensMenu = document.querySelectorAll(".sidebar-nav .nav-item");
    liensMenu.forEach(function(lien) {
        lien.addEventListener("click", function() {
            // Si on est sur un petit écran (mobile ou tablette), on ferme le menu
            if (window.innerWidth <= 1024) {
                fermerMenu();
            }
        });
    });
});

