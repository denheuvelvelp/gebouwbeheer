/**
 * Den Heuvel Gebouw- en Verenigingsbeheer
 * Frontend App met echte Gateway- en Testadministratie-koppeling
 * Versie 2.1
 */

// ========================================================
// 1. APPLICATIESTATUS (GEKOPPELD AAN BACKEND API)
// ========================================================

const COLUMNS = [
  { id: "todo", title: "Te doen" },
  { id: "in_progress", title: "In uitvoering" },
  { id: "waiting", title: "Wacht" },
  { id: "done", title: "Gereed" }
];

let state = {
  activeView: "actielijst", // "actielijst" | "storingen" | "storingDetail" | "publiek"
  selectedStoringId: "M-2026-0042",
  actions: [],
  storingen: [],
  currentActor: null,
  isAllowed: true,

  // Filters Kanban
  kanbanFilterView: "alle",
  kanbanFilterOwner: "alle",
  kanbanFilterPriority: "alle",
  kanbanFilterDeadline: "alle",
  kanbanSearchQuery: "",
  mobileActiveColumn: "todo",
  draggedCardId: null,
  editingCardId: null,

  // Filters Storingen
  storingFilterStatus: "alle",
  storingFilterGebouw: "alle",
  storingFilterPrioriteit: "alle",
  storingFilterCategorie: "alle",
  storingSearchQuery: ""
};

// ========================================================
// 2. API CLIENT (GATEWAY COMMUNICATIE)
// ========================================================

async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(endpoint, options);
    const json = await res.json();
    return { ok: res.ok, status: res.status, data: json.data !== undefined ? json.data : json, raw: json };
  } catch (err) {
    console.error("Netwerkfout bij aanroep", endpoint, err);
    return { ok: false, status: 0, error: err.message, raw: null };
  }
}

// Data inladen vanaf backend
async function loadBackendData() {
  const connPill = document.getElementById("connectionPill");
  const connText = document.getElementById("connectionText");

  // 1. Sessie ophalen
  const sessionRes = await apiRequest("/api/session");
  if (sessionRes.ok) {
    state.currentActor = sessionRes.data.actor;
    state.isAllowed = sessionRes.data.allowed;
    updateSessionUI(state.currentActor, state.isAllowed);
  }

  // 2. Acties ophalen
  const actiesRes = await apiRequest("/api/acties");
  if (actiesRes.ok) {
    state.actions = actiesRes.data || [];
    renderKanbanBoard();
  } else if (actiesRes.status === 403) {
    state.actions = [];
    renderKanbanBoard();
  }

  // 3. Storingen ophalen
  const storingenRes = await apiRequest("/api/storingen");
  if (storingenRes.ok) {
    state.storingen = storingenRes.data || [];
    renderStoringenTable();
    updateSidebarBadges();
  } else if (storingenRes.status === 403) {
    state.storingen = [];
    renderStoringenTable();
    updateSidebarBadges();
  }

  // 4. Verbindingsstatus pill
  if (sessionRes.ok && (actiesRes.ok || actiesRes.status === 403)) {
    connPill?.classList.remove("offline");
    if (connText) connText.textContent = "Testadministratie verbonden";
  } else {
    connPill?.classList.add("offline");
    if (connText) connText.textContent = "Offline / Server niet bereikbaar";
    showToast("⚠️ Kon niet verbinden met de Gateway-server. Controleer of de server draait.");
  }
}

function updateSessionUI(actor, isAllowed) {
  const nameEl = document.getElementById("topbarUserName");
  const roleEl = document.getElementById("topbarUserRole");
  const avatarEl = document.getElementById("topbarUserAvatar");
  const selectEl = document.getElementById("sessionUserSelect");

  if (actor) {
    if (nameEl) nameEl.textContent = actor.naam || actor.email;
    if (roleEl) roleEl.textContent = isAllowed ? `Rol: ${actor.rol}` : "⛔ Toegang geweigerd";
    if (avatarEl) {
      avatarEl.textContent = actor.naam ? actor.naam.substring(0, 2).toUpperCase() : "??";
      avatarEl.style.background = isAllowed ? "var(--color-primary-light)" : "#fee2e2";
      avatarEl.style.color = isAllowed ? "var(--color-primary-dark)" : "#b91c1c";
    }
    if (selectEl) {
      if (!isAllowed) {
        selectEl.value = "onbevoegd";
      } else {
        selectEl.value = actor.email;
      }
    }
  }
}

// Sessiewisselaar (voor testen van rollen en autorisatie)
document.getElementById("sessionUserSelect")?.addEventListener("change", async (e) => {
  const email = e.target.value;
  showToast(`Sessie wisselen naar <strong>${email}</strong>...`);
  const res = await apiRequest("/api/session/switch", "POST", { email });
  if (res.ok) {
    await loadBackendData();
    if (!state.isAllowed) {
      showToast("⛔ Ingelogd als Onbevoegd: server weigert inzage in interne acties en meldingen (403).");
    } else {
      showToast(`Ingelogd als <strong>${state.currentActor.naam}</strong> met actieve rechten.`);
    }
  }
});

// Verbindingsproef knop (HMAC Relay Test)
document.getElementById("btnTestVerbindingsproef")?.addEventListener("click", async () => {
  showToast("⚡ Cryptografische verbindingsproef uitvoeren...");
  const res = await apiRequest("/api/relay/probe", "POST", {});
  if (res.ok && res.data && res.data.pong) {
    alert(
      "✅ VERBINDINGSPROEF GESLAAGD!\n\n" +
      "• Protocol: HMAC-SHA256 Signed Envelope v2.1\n" +
      "• Storage Engine: " + res.data.engine + "\n" +
      "• Database: " + res.data.spreadsheetName + "\n" +
      "• SchemaVersie: " + res.data.schemaVersion + "\n" +
      "• Actieve Actor: " + (res.data.actor ? res.data.actor.naam : "onbekend") + "\n" +
      "• Server Tijd (UTC): " + res.data.serverTimeUtc
    );
  } else {
    alert("❌ Verbindingsproef mislukt:\n" + (res.raw ? res.raw.message : "Geen reactie van de server."));
  }
});

// ========================================================
// 3. NAVIGATIE & VIEW SWITCHING
// ========================================================

function switchView(viewName, param = null) {
  state.activeView = viewName;
  if (param && viewName === "storingDetail") {
    state.selectedStoringId = param;
  }

  document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active-view"));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

  if (viewName === "actielijst") {
    document.getElementById("viewActielijst").classList.add("active-view");
    document.querySelector('.nav-item[data-view="actielijst"]')?.classList.add("active");
    renderKanbanBoard();
  } else if (viewName === "storingen") {
    document.getElementById("viewStoringen").classList.add("active-view");
    document.querySelector('.nav-item[data-view="storingen"]')?.classList.add("active");
    renderStoringenTable();
  } else if (viewName === "storingDetail") {
    document.getElementById("viewStoringDetail").classList.add("active-view");
    document.querySelector('.nav-item[data-view="storingen"]')?.classList.add("active");
    renderStoringDetail(state.selectedStoringId);
  } else if (viewName === "publiek") {
    document.getElementById("viewPubliek").classList.add("active-view");
    document.querySelector('.nav-item[data-view="publiek"]')?.classList.add("active");
  }

  updateSidebarBadges();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateSidebarBadges() {
  const openCount = state.storingen.filter(s => s.status !== "Gesloten" && s.status !== "Opgelost").length;
  const badge = document.getElementById("sidebarStoringenBadge");
  if (badge) {
    badge.textContent = state.isAllowed ? `${openCount} open` : "Afgeschermd";
  }
}

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const targetView = item.getAttribute("data-view");
    if (targetView === "dashboard") {
      showToast("📊 Dashboard is onderdeel van Release 1B/2. Huidige actieve modules: <strong>Actielijst</strong> en <strong>Storingen</strong>.");
      return;
    }
    switchView(targetView);
  });
});

document.getElementById("btnNaarPubliekMeldformulier")?.addEventListener("click", () => switchView("publiek"));
document.getElementById("btnTerugVanPubliekNaarBeheer")?.addEventListener("click", () => switchView("storingen"));
document.getElementById("btnTerugNaarStoringen")?.addEventListener("click", () => switchView("storingen"));

// ========================================================
// 4. HULPFUNCTIES & TOASTS
// ========================================================

const toastContainer = document.getElementById("toastContainer");

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const parts = String(isoStr).split("T")[0].split("-");
  if (parts.length !== 3) return isoStr;
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

function isOverdue(isoStr) {
  if (!isoStr) return false;
  const deadlineDate = new Date(isoStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

// ========================================================
// 5. MODULE 1: KANBAN ACTIELIJST
// ========================================================

const kanbanBoard = document.getElementById("kanbanBoard");
const mobileTabsContainer = document.getElementById("mobileColumnTabs");

function getFilteredActions() {
  if (!state.isAllowed) return [];

  return state.actions.filter(action => {
    if (state.kanbanSearchQuery) {
      const q = state.kanbanSearchQuery.toLowerCase();
      const match = (action.title || "").toLowerCase().includes(q) ||
                    (action.owner || "").toLowerCase().includes(q) ||
                    (action.label || "").toLowerCase().includes(q) ||
                    (action.description || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    if (state.kanbanFilterView === "mijn" && action.owner !== (state.currentActor?.naam || "Huismeester 1")) return false;
    if (state.kanbanFilterOwner !== "alle" && action.owner !== state.kanbanFilterOwner) return false;
    if (state.kanbanFilterPriority !== "alle" && action.priority !== state.kanbanFilterPriority) return false;

    if (state.kanbanFilterDeadline !== "alle") {
      const past = isOverdue(action.deadline);
      if (state.kanbanFilterDeadline === "overdue" && !past) return false;
      if (state.kanbanFilterDeadline === "this_week") {
        const today = new Date();
        const d = new Date(action.deadline);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        if (diff < 0 || diff > 7) return false;
      }
      if (state.kanbanFilterDeadline === "later") {
        const today = new Date();
        const d = new Date(action.deadline);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        if (diff <= 7) return false;
      }
    }

    return true;
  });
}

function renderKanbanBoard() {
  if (!state.isAllowed) {
    kanbanBoard.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fee2e2; border: 1px solid #fecaca; border-radius: var(--radius-lg); padding: 40px; text-align: center; color: #991b1b;">
        <h2 style="font-size: 18px; margin-bottom: 8px;">⛔ Toegang geweigerd: Geen bevoegde rol</h2>
        <p style="font-size: 13px;">Je huidige gebruikersaccount (${state.currentActor?.email || 'onbekend'}) heeft geen toelating voor interne beheertaken in Den Heuvel.</p>
        <p style="font-size: 12px; margin-top: 10px; color: #7f1d1d;">Kies in de topbar een geautoriseerde rol (bijv. Huismeester 1 of Bestuur) om toegang te verkrijgen.</p>
      </div>
    `;
    mobileTabsContainer.innerHTML = "";
    return;
  }

  const filtered = getFilteredActions();

  const counts = {
    todo: filtered.filter(a => a.status === "todo").length,
    in_progress: filtered.filter(a => a.status === "in_progress").length,
    waiting: filtered.filter(a => a.status === "waiting").length,
    done: filtered.filter(a => a.status === "done").length
  };

  mobileTabsContainer.innerHTML = COLUMNS.map(col => `
    <button class="mobile-tab-btn ${state.mobileActiveColumn === col.id ? "active" : ""}" data-col="${col.id}">
      <span>${col.title}</span>
      <span class="tab-count">${counts[col.id]}</span>
    </button>
  `).join("");

  mobileTabsContainer.querySelectorAll(".mobile-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.mobileActiveColumn = btn.getAttribute("data-col");
      renderKanbanBoard();
    });
  });

  kanbanBoard.innerHTML = COLUMNS.map(col => {
    const colActions = filtered.filter(a => a.status === col.id);
    const isMobileActive = state.mobileActiveColumn === col.id;

    return `
      <section class="kanban-column ${isMobileActive ? "mobile-active-column" : ""}" data-column="${col.id}" id="col-${col.id}">
        <header class="column-header">
          <div class="column-title-wrap">
            <h2 class="column-title">${col.title}</h2>
            <span class="column-count">${colActions.length}</span>
          </div>
          <button class="column-quick-add" title="Nieuwe actie in deze kolom" data-column="${col.id}">+</button>
        </header>

        <div class="card-list" data-column="${col.id}">
          ${colActions.length === 0 ? `
            <div class="column-empty-state" style="display:block;">Geen acties in deze kolom</div>
          ` : colActions.map(action => renderKanbanCard(action)).join("")}
        </div>
      </section>
    `;
  }).join("");

  attachCardEvents();
  attachColumnEvents();
}

function renderKanbanCard(action) {
  const prioClass = action.priority === "Hoog" ? "prio-hoog" : action.priority === "Normaal" ? "prio-normaal" : "prio-laag";
  const overdue = isOverdue(action.deadline) && action.status !== "done";

  const totalCheck = action.checklist ? action.checklist.length : 0;
  const completedCheck = action.checklist ? action.checklist.filter(i => i.done).length : 0;
  const hasSource = action.sourceType === "Storing" && action.sourceId;

  return `
    <article class="kanban-card" draggable="true" data-id="${action.id}" tabindex="0">
      <div class="card-top-row">
        <div class="card-badges-wrap">
          <span class="card-label">${escapeHtml(action.label || "Algemeen")}</span>
          ${hasSource ? `
            <span class="card-link-badge" data-storing-id="${action.sourceId}" title="Gekoppeld aan storing ${action.sourceId}. Klik om te openen.">
              🔗 ${action.sourceId}
            </span>
          ` : ""}
        </div>
        <button class="card-more-btn" title="Bewerken" data-id="${action.id}">···</button>
      </div>

      <div class="card-title">${escapeHtml(action.title)}</div>

      <div class="card-meta-row">
        <span class="card-owner">👤 ${escapeHtml(action.owner)}</span>
        ${totalCheck > 0 ? `
          <span class="card-checklist-indicator" title="Checklist voortgang: ${completedCheck}/${totalCheck}">
            ✓ ${completedCheck}/${totalCheck}
          </span>
        ` : ""}
      </div>

      <div class="card-footer-row">
        <span class="card-prio-badge ${prioClass}">
          ${action.priority === "Hoog" ? "▲ " : ""}${action.priority}
        </span>
        <span class="card-deadline ${overdue ? "overdue" : ""}">
          📅 ${formatDate(action.deadline)}
        </span>
      </div>

      <div class="card-move-wrapper" onclick="event.stopPropagation();">
        <label class="card-move-label">Verplaats naar:</label>
        <select class="card-move-select" data-id="${action.id}">
          <option value="" disabled selected>Kies...</option>
          ${COLUMNS.map(c => `
            <option value="${c.id}" ${action.status === c.id ? "disabled" : ""}>
              ${c.title} ${action.status === c.id ? "(huidig)" : ""}
            </option>
          `).join("")}
        </select>
      </div>
    </article>
  `;
}

function attachCardEvents() {
  document.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-move-wrapper")) return;
      if (e.target.closest(".card-link-badge")) {
        const storingId = e.target.closest(".card-link-badge").getAttribute("data-storing-id");
        switchView("storingDetail", storingId);
        return;
      }
      const id = card.getAttribute("data-id");
      openActionModal(id);
    });

    card.addEventListener("dragstart", (e) => {
      state.draggedCardId = card.getAttribute("data-id");
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", state.draggedCardId);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      state.draggedCardId = null;
      document.querySelectorAll(".kanban-column").forEach(c => c.classList.remove("drag-over"));
    });
  });

  document.querySelectorAll(".card-move-select").forEach(select => {
    select.addEventListener("change", () => {
      const cardId = select.getAttribute("data-id");
      const targetColumn = select.value;
      moveCardToColumn(cardId, targetColumn);
    });
  });

  document.querySelectorAll(".column-quick-add").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openActionModal(null, btn.getAttribute("data-column"));
    });
  });
}

function attachColumnEvents() {
  document.querySelectorAll(".kanban-column").forEach(column => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", (e) => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove("drag-over");
      }
    });

    column.addEventListener("drop", (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");
      const cardId = e.dataTransfer.getData("text/plain") || state.draggedCardId;
      const targetColumn = column.getAttribute("data-column");
      if (cardId && targetColumn) {
        moveCardToColumn(cardId, targetColumn);
      }
    });
  });
}

// Kaart verplaatsen met echte backend-mutatie en conflict-rollback
async function moveCardToColumn(cardId, targetColumnId) {
  const action = state.actions.find(a => a.id === cardId);
  if (!action || action.status === targetColumnId) return;

  const previousStatus = action.status;
  const clientVersion = action.recordVersion || 1;

  // Optimistische UI-update
  action.status = targetColumnId;
  action.kolom_id = targetColumnId;
  renderKanbanBoard();

  // Roep Gateway API aan
  const res = await apiRequest("/api/acties/move", "POST", {
    cardId: cardId,
    targetColumnId: targetColumnId,
    recordVersion: clientVersion
  });

  if (res.ok) {
    action.recordVersion = res.data.recordVersion;
    action.updatedAt = res.data.updatedAt;
    const targetColName = COLUMNS.find(c => c.id === targetColumnId)?.title || targetColumnId;
    let extraNotice = "";
    if (action.sourceType === "Storing" && action.sourceId) {
      extraNotice = ` (Gekoppelde storing ${action.sourceId} blijft ongewijzigd)`;
    }
    showToast(`"${action.title}" verplaatst naar <strong>${targetColName}</strong>${extraNotice}`);
  } else {
    // ROLLBACK BIJ FOUT OF VERSIECONFLICT
    action.status = previousStatus;
    action.kolom_id = previousStatus;
    renderKanbanBoard();
    if (res.status === 409) {
      alert("⚠️ VERSIECONFLICT: Deze kaart is inmiddels gewijzigd door een andere beheerder. De kaart is teruggeplaatst. Herlaad de pagina voor de actuele stand.");
    } else {
      showToast(`❌ Opslagfout (${res.status}): Kaart teruggeplaatst naar oorspronkelijke kolom.`);
    }
    // Herlaad actuele stand
    const actiesRes = await apiRequest("/api/acties");
    if (actiesRes.ok) {
      state.actions = actiesRes.data;
      renderKanbanBoard();
    }
  }
}

// Filter Listeners
document.getElementById("filterPillAlle")?.addEventListener("click", () => {
  state.kanbanFilterView = "alle";
  document.getElementById("filterPillAlle").classList.add("active");
  document.getElementById("filterPillMijn").classList.remove("active");
  renderKanbanBoard();
});

document.getElementById("filterPillMijn")?.addEventListener("click", () => {
  state.kanbanFilterView = "mijn";
  document.getElementById("filterPillMijn").classList.add("active");
  document.getElementById("filterPillAlle").classList.remove("active");
  renderKanbanBoard();
});

document.getElementById("filterOwner")?.addEventListener("change", (e) => {
  state.kanbanFilterOwner = e.target.value;
  renderKanbanBoard();
});

document.getElementById("filterPriority")?.addEventListener("change", (e) => {
  state.kanbanFilterPriority = e.target.value;
  renderKanbanBoard();
});

document.getElementById("filterDeadline")?.addEventListener("change", (e) => {
  state.kanbanFilterDeadline = e.target.value;
  renderKanbanBoard();
});

document.getElementById("resetFiltersBtn")?.addEventListener("click", () => {
  state.kanbanFilterView = "alle";
  state.kanbanFilterOwner = "alle";
  state.kanbanFilterPriority = "alle";
  state.kanbanFilterDeadline = "alle";
  state.kanbanSearchQuery = "";
  document.getElementById("filterOwner").value = "alle";
  document.getElementById("filterPriority").value = "alle";
  document.getElementById("filterDeadline").value = "alle";
  document.getElementById("filterPillAlle").classList.add("active");
  document.getElementById("filterPillMijn").classList.remove("active");
  renderKanbanBoard();
  showToast("Kanban-filters hersteld");
});

document.getElementById("searchInput")?.addEventListener("input", (e) => {
  const val = e.target.value;
  state.kanbanSearchQuery = val;
  state.storingSearchQuery = val;
  if (state.activeView === "actielijst") {
    renderKanbanBoard();
  } else if (state.activeView === "storingen") {
    renderStoringenTable();
  }
});

// ========================================================
// 6. KANBAN MODAL (ACTIES TOEVOEGEN / WIJZIGEN)
// ========================================================

const actionModal = document.getElementById("actionModal");
const actionForm = document.getElementById("actionForm");
const modalTitle = document.getElementById("modalTitle");
const modalDeleteBtn = document.getElementById("modalDeleteBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const checklistItemsContainer = document.getElementById("checklistItems");
const newChecklistInput = document.getElementById("newChecklistInput");
const addChecklistBtn = document.getElementById("addChecklistBtn");

let currentChecklist = [];

function openActionModal(actionId = null, preferredColumn = "todo") {
  state.editingCardId = actionId;

  if (actionId) {
    const action = state.actions.find(a => a.id === actionId);
    if (!action) return;
    modalTitle.textContent = `Actie bewerken: ${action.id}`;
    document.getElementById("formRecordVersion").value = action.recordVersion || 1;
    document.getElementById("formTitle").value = action.title || "";
    document.getElementById("formDescription").value = action.description || "";
    document.getElementById("formOwner").value = action.owner || "Huismeester 1";
    document.getElementById("formColumn").value = action.status || "todo";
    document.getElementById("formPriority").value = action.priority || "Normaal";
    document.getElementById("formDeadline").value = action.deadline ? action.deadline.split("T")[0] : "";
    document.getElementById("formLabel").value = action.label || "";
    renderChecklistItems(action.checklist || []);
    modalDeleteBtn.style.display = "block";
  } else {
    modalTitle.textContent = "Nieuwe actie toevoegen";
    actionForm.reset();
    document.getElementById("formRecordVersion").value = "1";
    document.getElementById("formColumn").value = preferredColumn;
    document.getElementById("formPriority").value = "Normaal";
    document.getElementById("formOwner").value = state.currentActor?.naam || "Huismeester 1";
    const d = new Date(); d.setDate(d.getDate() + 7);
    document.getElementById("formDeadline").value = d.toISOString().split("T")[0];
    renderChecklistItems([]);
    modalDeleteBtn.style.display = "none";
  }

  actionModal.classList.add("open");
}

function renderChecklistItems(items) {
  currentChecklist = items ? JSON.parse(JSON.stringify(items)) : [];
  checklistItemsContainer.innerHTML = "";

  currentChecklist.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `checklist-row ${item.done ? "completed" : ""}`;
    row.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} data-index="${index}">
      <input type="text" value="${escapeHtml(item.text)}" data-index="${index}">
      <button type="button" class="remove-check-btn" title="Verwijderen" data-index="${index}">✕</button>
    `;
    checklistItemsContainer.appendChild(row);
  });

  checklistItemsContainer.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      const idx = parseInt(cb.getAttribute("data-index"), 10);
      currentChecklist[idx].done = cb.checked;
      cb.closest(".checklist-row").classList.toggle("completed", cb.checked);
    });
  });

  checklistItemsContainer.querySelectorAll("input[type='text']").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = parseInt(inp.getAttribute("data-index"), 10);
      currentChecklist[idx].text = inp.value;
    });
  });

  checklistItemsContainer.querySelectorAll(".remove-check-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      currentChecklist.splice(idx, 1);
      renderChecklistItems(currentChecklist);
    });
  });
}

addChecklistBtn?.addEventListener("click", () => {
  const text = newChecklistInput.value.trim();
  if (!text) return;
  currentChecklist.push({ text, done: false });
  newChecklistInput.value = "";
  renderChecklistItems(currentChecklist);
});

// Actie opslaan met dubbelklik-beveiliging en backend API aanroep
actionForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  modalSaveBtn.disabled = true;
  modalSaveBtn.textContent = "Bezig met opslaan...";

  const title = document.getElementById("formTitle").value.trim();
  const description = document.getElementById("formDescription").value.trim();
  const owner = document.getElementById("formOwner").value;
  const status = document.getElementById("formColumn").value;
  const priority = document.getElementById("formPriority").value;
  const deadline = document.getElementById("formDeadline").value;
  const label = document.getElementById("formLabel").value.trim() || "Algemeen";
  const recordVersion = parseInt(document.getElementById("formRecordVersion").value, 10) || 1;

  const payload = {
    title,
    description,
    owner,
    status,
    kolom_id: status,
    priority,
    deadline,
    label,
    checklist: currentChecklist,
    recordVersion
  };

  if (state.editingCardId) {
    payload.id = state.editingCardId;
  }

  const res = await apiRequest("/api/acties", "POST", payload);

  modalSaveBtn.disabled = false;
  modalSaveBtn.textContent = "Opslaan in administratie";

  if (res.ok) {
    showToast(`Actie <strong>${res.data.id}</strong> succesvol opgeslagen!`);
    actionModal.classList.remove("open");
    // Herlaad acties
    const actiesRes = await apiRequest("/api/acties");
    if (actiesRes.ok) {
      state.actions = actiesRes.data;
      renderKanbanBoard();
    }
  } else if (res.status === 409) {
    alert("⚠️ CONFLICT: Dit item is zojuist gewijzigd door een andere beheerder. De nieuwste versie wordt ingeladen.");
    actionModal.classList.remove("open");
    const actiesRes = await apiRequest("/api/acties");
    if (actiesRes.ok) {
      state.actions = actiesRes.data;
      renderKanbanBoard();
    }
  } else {
    alert("❌ Opslaan mislukt: " + (res.raw?.message || "Serverfout"));
  }
});

modalDeleteBtn?.addEventListener("click", async () => {
  if (!state.editingCardId) return;
  if (confirm("Weet je zeker dat je deze actie wilt archiveren?")) {
    const actie = state.actions.find(a => a.id === state.editingCardId);
    if (actie) {
      actie.archivedAt = new Date().toISOString();
      await apiRequest("/api/acties", "POST", actie);
      showToast("Actie gearchiveerd");
      actionModal.classList.remove("open");
      const actiesRes = await apiRequest("/api/acties");
      if (actiesRes.ok) {
        state.actions = actiesRes.data;
        renderKanbanBoard();
      }
    }
  }
});

document.getElementById("btnNewAction")?.addEventListener("click", () => openActionModal());
document.getElementById("modalCloseBtn")?.addEventListener("click", () => actionModal.classList.remove("open"));
document.getElementById("modalCancelBtn")?.addEventListener("click", () => actionModal.classList.remove("open"));

// ========================================================
// 7. MODULE 2: STORINGEN OVERZICHT (SCHERM 1)
// ========================================================

const storingenTableBody = document.getElementById("storingenTableBody");

function getFilteredStoringen() {
  if (!state.isAllowed) return [];

  return state.storingen.filter(storing => {
    if (state.storingSearchQuery) {
      const q = state.storingSearchQuery.toLowerCase();
      const match = (storing.id || "").toLowerCase().includes(q) ||
                    (storing.title || "").toLowerCase().includes(q) ||
                    (storing.location || "").toLowerCase().includes(q) ||
                    (storing.reporter || "").toLowerCase().includes(q) ||
                    (storing.category || "").toLowerCase().includes(q);
      if (!match) return false;
    }

    if (state.storingFilterStatus !== "alle") {
      if (state.storingFilterStatus === "met_wacht") {
        if (!storing.waitingReason) return false;
      } else if (storing.status !== state.storingFilterStatus) {
        return false;
      }
    }

    if (state.storingFilterGebouw !== "alle") {
      if (!(storing.location || "").toLowerCase().includes(state.storingFilterGebouw.toLowerCase())) {
        return false;
      }
    }

    if (state.storingFilterPrioriteit !== "alle" && storing.priority !== state.storingFilterPrioriteit) {
      return false;
    }

    if (state.storingFilterCategorie !== "alle" && storing.category !== state.storingFilterCategorie) {
      return false;
    }

    return true;
  });
}

function renderStoringenTable() {
  if (!state.isAllowed) {
    storingenTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: #991b1b; background: #fee2e2;">
          ⛔ Toegang geweigerd: Je huidige account heeft geen rechten voor interne storingsregistraties.
        </td>
      </tr>
    `;
    return;
  }

  const filtered = getFilteredStoringen();

  const openCount = state.storingen.filter(s => s.status !== "Gesloten" && s.status !== "Opgelost").length;
  const inUitvoeringCount = state.storingen.filter(s => s.status === "In uitvoering").length;
  const wachtCount = state.storingen.filter(s => s.waitingReason && s.status !== "Gesloten").length;

  document.getElementById("kpiOpenMeldingen").textContent = openCount;
  document.getElementById("kpiInUitvoering").textContent = inUitvoeringCount;
  document.getElementById("kpiWachtOpActie").textContent = wachtCount;

  if (filtered.length === 0) {
    storingenTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px; color: var(--color-text-subtle); font-style: italic;">
          Geen meldingen gevonden met de geselecteerde filters.
        </td>
      </tr>
    `;
    return;
  }

  storingenTableBody.innerHTML = filtered.map(storing => {
    const statusClass = `status-${(storing.status || "nieuw").toLowerCase().replace(" ", "_")}`;
    const prioClass = storing.priority === "Hoog" ? "prio-hoog" : storing.priority === "Normaal" ? "prio-normaal" : "prio-laag";

    return `
      <tr data-id="${storing.id}">
        <td class="cell-id">${storing.id}</td>
        <td>
          <div class="cell-title-block">
            <span class="cell-title">${escapeHtml(storing.title)}</span>
            <span class="cell-category">${escapeHtml(storing.category)}</span>
          </div>
        </td>
        <td>
          <div class="cell-location">
            <span>📍</span>
            <span>${escapeHtml(storing.location)}</span>
          </div>
        </td>
        <td>
          <div style="font-size: 12.5px; font-weight: 500;">${escapeHtml(storing.reporter)}</div>
          <div style="font-size: 11px; color: var(--color-text-muted);">via ${escapeHtml(storing.channel || 'Portaal')}</div>
        </td>
        <td>
          <span class="card-prio-badge ${prioClass}">
            ${storing.priority === "Hoog" ? "▲ " : ""}${storing.priority}
          </span>
        </td>
        <td>
          <div>
            <span class="status-badge ${statusClass}">
              ● ${storing.status}
            </span>
          </div>
          ${storing.waitingReason ? `
            <div>
              <span class="wacht-pill">⏳ ${escapeHtml(storing.waitingReason)}</span>
            </div>
          ` : ""}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm btn-open-detail" data-id="${storing.id}">
            Bekijk detail →
          </button>
        </td>
      </tr>
    `;
  }).join("");

  storingenTableBody.querySelectorAll("tr").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-id");
      if (id) switchView("storingDetail", id);
    });
  });

  storingenTableBody.querySelectorAll(".btn-open-detail").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      switchView("storingDetail", id);
    });
  });
}

// Storingen Filter Listeners
document.getElementById("filterStoringStatus")?.addEventListener("change", (e) => {
  state.storingFilterStatus = e.target.value;
  renderStoringenTable();
});

document.getElementById("filterStoringGebouw")?.addEventListener("change", (e) => {
  state.storingFilterGebouw = e.target.value;
  renderStoringenTable();
});

document.getElementById("filterStoringPrioriteit")?.addEventListener("change", (e) => {
  state.storingFilterPrioriteit = e.target.value;
  renderStoringenTable();
});

document.getElementById("filterStoringCategorie")?.addEventListener("change", (e) => {
  state.storingFilterCategorie = e.target.value;
  renderStoringenTable();
});

document.getElementById("resetStoringFiltersBtn")?.addEventListener("click", () => {
  state.storingFilterStatus = "alle";
  state.storingFilterGebouw = "alle";
  state.storingFilterPrioriteit = "alle";
  state.storingFilterCategorie = "alle";
  state.storingSearchQuery = "";
  document.getElementById("filterStoringStatus").value = "alle";
  document.getElementById("filterStoringGebouw").value = "alle";
  document.getElementById("filterStoringPrioriteit").value = "alle";
  document.getElementById("filterStoringCategorie").value = "alle";
  renderStoringenTable();
  showToast("Storingen-filters hersteld");
});

// ========================================================
// 8. FORMULIER INTERNE NIEUWE STORING (SCHERM 2)
// ========================================================

const storingModal = document.getElementById("storingModal");
const storingForm = document.getElementById("storingForm");
const btnStoringOpslaan = document.getElementById("btnStoringOpslaan");

document.getElementById("btnNieuweStoring")?.addEventListener("click", () => {
  storingForm.reset();
  storingModal.classList.add("open");
});

document.getElementById("storingModalCloseBtn")?.addEventListener("click", () => storingModal.classList.remove("open"));
document.getElementById("storingModalCancelBtn")?.addEventListener("click", () => storingModal.classList.remove("open"));

document.getElementById("btnKiesFotoStoring")?.addEventListener("click", () => {
  document.getElementById("storingFormFotoInput").click();
});

document.getElementById("storingFormFotoInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("storingFotoLabel").textContent = `📷 ${file.name} (${Math.round(file.size / 1024)} KB)`;
  }
});

storingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  btnStoringOpslaan.disabled = true;
  btnStoringOpslaan.textContent = "Bezig met opslaan...";

  const title = document.getElementById("storingFormTitel").value.trim();
  const location = document.getElementById("storingFormLocatie").value;
  const category = document.getElementById("storingFormCategorie").value;
  const description = document.getElementById("storingFormOmschrijving").value.trim();
  const priority = document.getElementById("storingFormPrioriteit").value;
  const channel = document.getElementById("storingFormKanaal").value;
  const melder = document.getElementById("storingFormMelder").value.trim() || "Mondeling gemeld";
  const contact = document.getElementById("storingFormContact").value.trim() || "Geen contactgegevens";

  const payload = {
    title,
    location,
    category,
    description,
    priority,
    channel,
    reporter: melder,
    contact,
    photo: "storing_bijlage.jpg"
  };

  const res = await apiRequest("/api/storingen", "POST", payload);

  btnStoringOpslaan.disabled = false;
  btnStoringOpslaan.textContent = "Storing opslaan in administratie";

  if (res.ok) {
    showToast(`Storing <strong>${res.data.id}</strong> geregistreerd in de administratie!`);
    storingModal.classList.remove("open");
    await loadBackendData();
    switchView("storingDetail", res.data.id);
  } else {
    alert("❌ Opslaan van storing mislukt: " + (res.raw?.message || "Serverfout"));
  }
});

// ========================================================
// 9. STORING DETAILPAGINA (SCHERM 3 & 4)
// ========================================================

function renderStoringDetail(storingId) {
  const storing = state.storingen.find(s => s.id === storingId);
  if (!storing) {
    switchView("storingen");
    return;
  }

  document.getElementById("detailBadgeId").textContent = storing.id;
  document.getElementById("detailTitel").textContent = storing.title;
  document.getElementById("detailSubtitel").textContent = `Gemeld op ${storing.createdAt || 'Onbekend'} · Kanaal: ${storing.channel || 'Portaal'}`;

  const prioClass = storing.priority === "Hoog" ? "prio-hoog" : storing.priority === "Normaal" ? "prio-normaal" : "prio-laag";
  document.getElementById("detailPrioPill").innerHTML = `
    <span class="card-prio-badge ${prioClass}">
      ${storing.priority === "Hoog" ? "▲ " : ""}${storing.priority}
    </span>
  `;

  document.getElementById("detailLocatie").textContent = storing.location || "Onbekend";
  document.getElementById("detailCategorie").textContent = storing.category || "Algemeen";
  document.getElementById("detailMelder").textContent = storing.reporter || "Onbekend";
  document.getElementById("detailContact").textContent = storing.contact || "-";
  document.getElementById("detailOmschrijving").textContent = storing.description || "";

  const fotoNaamEl = document.getElementById("detailFotoNaam");
  if (storing.photo) {
    fotoNaamEl.textContent = storing.photo;
  } else {
    fotoNaamEl.textContent = "Geen foto bijgevoegd";
  }

  document.getElementById("detailSelectStatus").value = storing.status || "Nieuw";
  document.getElementById("detailSelectWachtreden").value = storing.waitingReason || "";
  document.getElementById("detailSelectEigenaar").value = storing.owner || "Huismeester 1";
  document.getElementById("detailInputStreefdatum").value = storing.deadline ? storing.deadline.split("T")[0] : "";

  // Tijdlijn renderen
  const timelineEl = document.getElementById("detailTimeline");
  timelineEl.innerHTML = (storing.history || [
    { time: storing.createdAt || "Vandaag", actor: storing.reporter || "Melder", text: "Melding geregistreerd in administratie." }
  ]).map(h => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-time">${h.time} · <span class="timeline-actor">${escapeHtml(h.actor)}</span></div>
      <div class="timeline-text">${escapeHtml(h.text)}</div>
    </div>
  `).join("");

  // Gekoppelde Actie (Kanban)
  const actieContainer = document.getElementById("detailGekoppeldeActieInhoud");
  const linkedAction = state.actions.find(a => a.id === storing.linkedActionId || (a.sourceType === "Storing" && a.sourceId === storing.id));

  if (linkedAction) {
    const colName = COLUMNS.find(c => c.id === linkedAction.status)?.title || linkedAction.status;
    actieContainer.innerHTML = `
      <div class="linked-action-box">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <strong style="font-size: 13.5px; color: #166534;">${linkedAction.id}: ${escapeHtml(linkedAction.title)}</strong>
            <div style="font-size: 11px; color: #15803d; margin-top: 3px;">
              Bordstatus: <strong>${colName}</strong> · Eigenaar: ${escapeHtml(linkedAction.owner)}
            </div>
          </div>
          <span class="badge" style="background:#dcfce7; color:#15803d;">Kanban</span>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <button class="btn btn-secondary btn-sm" id="btnGaNaarKanbanBord" style="font-size: 11px; padding: 4px 8px;">
            Bekijk op Kanban-bord →
          </button>
        </div>
      </div>
    `;

    document.getElementById("btnGaNaarKanbanBord")?.addEventListener("click", () => {
      switchView("actielijst");
      showToast(`Navigatie naar actie <strong>${linkedAction.id}</strong> op het bord`);
    });
  } else {
    actieContainer.innerHTML = `
      <div style="font-size: 12.5px; color: var(--color-text-muted); padding: 8px 0;">
        Er is nog geen vervolgactie op de Kanban-actielijst gekoppeld aan deze storing.
      </div>
      <button class="btn btn-secondary btn-sm" id="btnKoppelDirectKanban" style="width: 100%;">
        + Koppel aan Kanban-actielijst
      </button>
    `;

    document.getElementById("btnKoppelDirectKanban")?.addEventListener("click", () => {
      maakGekoppeldeKanbanActie(storing);
    });
  }

  // Werkorder Box
  const woContainer = document.getElementById("detailWerkorderInhoud");
  if (storing.workorder) {
    woContainer.innerHTML = `
      <div class="workorder-box">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <strong style="font-size: 13.5px; color: var(--color-text-main);">${storing.workorder.leverancier}</strong>
            <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">
              Werkorder ${storing.workorder.id} · Gepland: ${formatDate(storing.workorder.datum || storing.workorder.geplande_datum)}
            </div>
          </div>
          <span class="badge" style="background:#e0f2fe; color:#0369a1;">€ ${storing.workorder.kosten || storing.workorder.geschatte_kosten || 0}</span>
        </div>
        <div style="font-size: 12px; color: #334155; margin-top: 4px; background: #ffffff; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
          <strong>Instructie:</strong> ${escapeHtml(storing.workorder.instructie || "Geen instructie opgegeven")}
        </div>
      </div>
    `;
  } else {
    woContainer.innerHTML = `
      <div style="font-size: 12.5px; color: var(--color-text-muted); padding: 8px 0;">
        Nog geen werkorder uitgezet naar een externe monteur of leverancier.
      </div>
      <button class="btn btn-secondary btn-sm" id="btnOpenWerkorderModal" style="width: 100%;">
        + Werkorder aanmaken
      </button>
    `;

    document.getElementById("btnOpenWerkorderModal")?.addEventListener("click", () => {
      openWerkorderModal(storing);
    });
  }
}

// Status & planning bijwerken in detailpagina met API
document.getElementById("btnOpslaanStatusWijziging")?.addEventListener("click", async () => {
  const storing = state.storingen.find(s => s.id === state.selectedStoringId);
  if (!storing) return;

  const newStatus = document.getElementById("detailSelectStatus").value;
  const newWacht = document.getElementById("detailSelectWachtreden").value;
  const recordVersion = storing.recordVersion || 1;

  const res = await apiRequest("/api/storingen/status", "POST", {
    storingId: storing.id,
    newStatus,
    waitingReason: newWacht,
    recordVersion
  });

  if (res.ok) {
    showToast(`Storing <strong>${storing.id}</strong> bijgewerkt naar status <strong>${newStatus}</strong>`);
    await loadBackendData();
    renderStoringDetail(storing.id);
  } else if (res.status === 409) {
    alert("⚠️ CONFLICT: Deze melding is zojuist bewerkt door een andere beheerder.");
    await loadBackendData();
    renderStoringDetail(storing.id);
  } else {
    alert("❌ Status bijwerken mislukt: " + (res.raw?.message || "Serverfout"));
  }
});

// Interne notitie toevoegen
document.getElementById("btnVoegNotitieToe")?.addEventListener("click", () => {
  const input = document.getElementById("nieuweNotitieInput");
  const text = input.value.trim();
  if (!text) return;

  const storing = state.storingen.find(s => s.id === state.selectedStoringId);
  if (!storing) return;

  if (!storing.history) storing.history = [];
  const now = new Date();
  const timeStr = `${now.getDate()} okt 2026 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  storing.history.push({
    time: timeStr,
    actor: state.currentActor?.naam || "Huismeester 1",
    text: text
  });

  input.value = "";
  showToast("Notitie toegevoegd aan de historie");
  renderStoringDetail(storing.id);
});

// Koppel actie aan Kanban via API
async function maakGekoppeldeKanbanActie(storing) {
  const bestaand = state.actions.find(a => a.sourceType === "Storing" && a.sourceId === storing.id);
  if (bestaand) {
    showToast(`Er is al een actie gekoppeld (${bestaand.id})`);
    return;
  }

  const payload = {
    title: storing.title,
    description: `Storing ${storing.id} (${storing.location}): ${storing.description}`,
    owner: storing.owner || state.currentActor?.naam || "Huismeester 1",
    status: "in_progress",
    kolom_id: "in_progress",
    priority: storing.priority || "Normaal",
    deadline: storing.deadline || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    label: storing.category || "Onderhoud",
    checklist: [
      { text: "Locatie en schade beoordelen", done: true },
      { text: "Herstel uitvoeren of leverancier begeleiden", done: false },
      { text: "Terugkoppelen aan melder", done: false }
    ],
    sourceType: "Storing",
    sourceId: storing.id
  };

  const res = await apiRequest("/api/acties", "POST", payload);
  if (res.ok) {
    storing.linkedActionId = res.data.id;
    showToast(`Actie <strong>${res.data.id}</strong> aangemaakt op het centrale Kanban-bord!`);
    await loadBackendData();
    renderStoringDetail(storing.id);
  } else {
    alert("❌ Koppelactie mislukt: " + (res.raw?.message || "Serverfout"));
  }
}

document.getElementById("btnDetailKoppelKanban")?.addEventListener("click", () => {
  const storing = state.storingen.find(s => s.id === state.selectedStoringId);
  if (storing) maakGekoppeldeKanbanActie(storing);
});

// Werkorder Modal Logica met API
const werkorderModal = document.getElementById("werkorderModal");
const werkorderForm = document.getElementById("werkorderForm");
const btnWerkorderOpslaan = document.getElementById("btnWerkorderOpslaan");

function openWerkorderModal(storing) {
  werkorderForm.reset();
  const d = new Date(); d.setDate(d.getDate() + 3);
  document.getElementById("woDatum").value = d.toISOString().split("T")[0];
  werkorderModal.classList.add("open");
}

document.getElementById("btnDetailNieuweWerkorder")?.addEventListener("click", () => {
  const storing = state.storingen.find(s => s.id === state.selectedStoringId);
  if (storing) openWerkorderModal(storing);
});

document.getElementById("werkorderModalCloseBtn")?.addEventListener("click", () => werkorderModal.classList.remove("open"));
document.getElementById("werkorderModalCancelBtn")?.addEventListener("click", () => werkorderModal.classList.remove("open"));

werkorderForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const storing = state.storingen.find(s => s.id === state.selectedStoringId);
  if (!storing) return;

  btnWerkorderOpslaan.disabled = true;
  btnWerkorderOpslaan.textContent = "Bezig met opslaan...";

  const leverancier = document.getElementById("woLeverancier").value.trim();
  const datum = document.getElementById("woDatum").value;
  const kosten = parseInt(document.getElementById("woKosten").value, 10) || 0;
  const instructie = document.getElementById("woInstructie").value.trim();

  const payload = {
    melding_id: storing.id,
    leverancier,
    geplande_datum: datum,
    geschatte_kosten: kosten,
    instructie,
    status: "Ingepland"
  };

  const res = await apiRequest("/api/storingen/werkorder", "POST", payload);

  btnWerkorderOpslaan.disabled = false;
  btnWerkorderOpslaan.textContent = "Werkorder opslaan";

  if (res.ok) {
    showToast(`Werkorder <strong>${res.data.id}</strong> succesvol opgeslagen!`);
    werkorderModal.classList.remove("open");
    // Update storing status naar Ingepland
    await apiRequest("/api/storingen/status", "POST", {
      storingId: storing.id,
      newStatus: "Ingepland",
      recordVersion: storing.recordVersion
    });
    await loadBackendData();
    renderStoringDetail(storing.id);
  } else {
    alert("❌ Opslaan van werkorder mislukt: " + (res.raw?.message || "Serverfout"));
  }
});

// ========================================================
// 10. PUBLIEK BEWONERSFORMULIER (/MELDEN - SCHERM 5)
// ========================================================

const publicReportForm = document.getElementById("publicReportForm");
const publicFormCard = document.getElementById("publicFormCard");
const publicSuccessCard = document.getElementById("publicSuccessCard");
const btnVerzendPubliekMelding = document.getElementById("btnVerzendPubliekMelding");

document.getElementById("pubFotoUploadBox")?.addEventListener("click", () => {
  document.getElementById("pubFotoInput").click();
});

document.getElementById("pubFotoInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("pubFotoTekst").textContent = `✓ Foto geselecteerd: ${file.name}`;
  }
});

publicReportForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  btnVerzendPubliekMelding.disabled = true;
  btnVerzendPubliekMelding.textContent = "Bezig met verzenden...";

  const locatie = document.getElementById("pubLocatie").value;
  const categorie = document.getElementById("pubCategorie").value;
  const probleem = document.getElementById("pubProbleem").value.trim();
  const naam = document.getElementById("pubNaam").value.trim();
  const huisnr = document.getElementById("pubHuisnummer").value.trim();
  const contact = document.getElementById("pubContact").value.trim();

  const payload = {
    title: probleem.length > 40 ? probleem.substring(0, 37) + "…" : probleem,
    location: locatie,
    category: categorie,
    description: probleem,
    channel: "Publiek portaal",
    reporter: `${naam} (Appartement ${huisnr})`,
    contact: contact,
    photo: "bewonersfoto_upload.jpg"
  };

  const res = await apiRequest("/api/public/melden", "POST", payload);

  btnVerzendPubliekMelding.disabled = false;
  btnVerzendPubliekMelding.textContent = "Storing verzenden";

  if (res.ok) {
    const newId = res.data.id;
    document.getElementById("publicSuccessMeldingId").textContent = newId;
    publicFormCard.style.display = "none";
    publicSuccessCard.style.display = "flex";
    showToast(`Je melding <strong>${newId}</strong> is geregistreerd in de administratie!`);
    await loadBackendData();
  } else {
    alert("❌ Verzenden mislukt: " + (res.raw?.message || "Serverfout"));
  }
});

document.getElementById("btnNogEenMelding")?.addEventListener("click", () => {
  publicReportForm.reset();
  document.getElementById("pubFotoTekst").textContent = "+ Selecteer of maak een foto";
  publicSuccessCard.style.display = "none";
  publicFormCard.style.display = "flex";
});

document.getElementById("btnTerugNaarPortaalNaMelding")?.addEventListener("click", () => {
  publicSuccessCard.style.display = "none";
  publicFormCard.style.display = "flex";
  switchView("storingen");
});

document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("mobile-open");
});

// ========================================================
// 11. INITIALISATIE BIJ OPSTARTEN
// ========================================================

loadBackendData();
