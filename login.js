(function () {
  "use strict";

  // ---------- Config ----------
  const ADMIN_PASSWORD = "gsk2026";
  const SESSION_KEY = "gsk_admin_auth";
  const ORDERS_KEY = "gsk_orders";

  const BUNDLE_PRICES = {
    "1 Box - ₱1,300": 1300,
    "2 Boxes - ₱2,400": 2400,
    "3 Boxes - ₱3,300": 3300,
  };

  const STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

  // ---------- Elements ----------
  const loginSection = document.getElementById("loginSection");
  const adminSection = document.getElementById("adminSection");
  const loginForm = document.getElementById("loginForm");
  const loginInput = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");
  const logoutBtn = document.getElementById("logoutBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const exportBtn = document.getElementById("exportBtn");
  const ordersBody = document.getElementById("ordersBody");
  const ordersEmpty = document.getElementById("ordersEmpty");
  const ordersTable = document.getElementById("ordersTable");
  const statTotal = document.getElementById("statTotal");
  const statPending = document.getElementById("statPending");
  const statShipped = document.getElementById("statShipped");
  const statRevenue = document.getElementById("statRevenue");
  const searchInput = document.getElementById("searchInput");
  const filterStatus = document.getElementById("filterStatus");
  const filterPayment = document.getElementById("filterPayment");
  const filterBundle = document.getElementById("filterBundle");

  // ---------- Auth ----------
  function isAuthenticated() {
    try { return sessionStorage.getItem(SESSION_KEY) === "true"; }
    catch (e) { return false; }
  }

  function setAuthenticated(value) {
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, "true");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  function showLogin() {
    loginSection.hidden = false;
    adminSection.hidden = true;
    setTimeout(() => loginInput && loginInput.focus(), 50);
  }

  function showAdmin() {
    loginSection.hidden = true;
    adminSection.hidden = false;
    renderOrders();
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = (loginInput.value || "").trim();
    if (value === ADMIN_PASSWORD) {
      setAuthenticated(true);
      loginError.hidden = true;
      loginInput.value = "";
      showAdmin();
    } else {
      loginError.hidden = false;
      loginInput.classList.add("input-error");
      setTimeout(() => loginInput.classList.remove("input-error"), 600);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      setAuthenticated(false);
      showLogin();
    });
  }

  // ---------- Orders storage ----------
  function loadOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(orders)) return [];
      // Backfill default status for legacy orders
      let mutated = false;
      orders.forEach((o) => {
        if (!o.status) { o.status = "Pending"; mutated = true; }
      });
      if (mutated) saveOrders(orders);
      return orders;
    } catch (e) { return []; }
  }

  function saveOrders(orders) {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); }
    catch (e) { /* ignore */ }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function priceFor(bundle) { return BUNDLE_PRICES[bundle] || 0; }

  // ---------- Rendering ----------
  function makeCell(className, text) {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = text == null ? "" : String(text);
    return td;
  }

  function buildCustomerCell(order) {
    const td = document.createElement("td");
    td.className = "cell-customer";
    const name = document.createElement("div");
    name.className = "cell-customer-name";
    name.textContent = order.fullName || "";
    const contact = document.createElement("a");
    contact.className = "cell-customer-contact";
    contact.href = "tel:" + (order.contact || "");
    contact.textContent = order.contact || "";
    td.appendChild(name);
    td.appendChild(contact);
    return td;
  }

  function buildPaymentCell(order) {
    const td = document.createElement("td");
    td.className = "cell-payment";
    const pill = document.createElement("span");
    const map = { "COD": "cod", "GCash": "gcash", "Credit Card": "card" };
    const cls = map[order.payment] || "cod";
    pill.className = "payment-pill payment-" + cls;
    pill.textContent = order.payment || "";
    td.appendChild(pill);
    return td;
  }

  function buildStatusCell(order, realIdx) {
    const td = document.createElement("td");
    td.className = "cell-status";
    const status = order.status || "Pending";
    const wrap = document.createElement("div");
    wrap.className = "status-pill status-" + status.toLowerCase();
    const select = document.createElement("select");
    select.className = "status-select";
    STATUSES.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      if (s === status) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      const list = loadOrders();
      if (list[realIdx]) {
        list[realIdx].status = select.value;
        saveOrders(list);
        renderOrders();
      }
    });
    wrap.appendChild(select);
    td.appendChild(wrap);
    return td;
  }

  function buildAddressCell(order) {
    const td = document.createElement("td");
    td.className = "cell-address";
    const text = order.address || "";
    if (text.length > 60) {
      const short = document.createElement("span");
      short.className = "cell-address-short";
      short.textContent = text.slice(0, 60) + "…";
      const full = document.createElement("span");
      full.className = "cell-address-full";
      full.textContent = text;
      full.hidden = true;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "cell-address-toggle";
      toggle.textContent = "More";
      toggle.addEventListener("click", () => {
        const showing = !full.hidden;
        full.hidden = showing;
        short.hidden = !showing;
        toggle.textContent = showing ? "More" : "Less";
      });
      td.appendChild(short);
      td.appendChild(full);
      td.appendChild(toggle);
    } else {
      td.textContent = text;
    }
    return td;
  }

  function applyFilters(orders) {
    const q = (searchInput.value || "").trim().toLowerCase();
    const s = filterStatus.value;
    const p = filterPayment.value;
    const b = filterBundle.value;
    return orders.filter((o) => {
      if (s && (o.status || "Pending") !== s) return false;
      if (p && o.payment !== p) return false;
      if (b && o.bundle !== b) return false;
      if (q) {
        const haystack = [o.fullName, o.contact, o.address]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function renderOrders() {
    const all = loadOrders();
    const sortedAll = [...all].sort((a, b) => {
      const ta = new Date(a.submittedAt || 0).getTime();
      const tb = new Date(b.submittedAt || 0).getTime();
      return tb - ta;
    });
    const filtered = applyFilters(sortedAll);

    // Stats are based on ALL orders (not filtered)
    statTotal.textContent = String(all.length);
    const pendingCount = all.filter((o) => (o.status || "Pending") === "Pending").length;
    const shippedCount = all.filter((o) => {
      const s = o.status || "Pending";
      return s === "Confirmed" || s === "Shipped";
    }).length;
    statPending.textContent = String(pendingCount);
    statShipped.textContent = String(shippedCount);
    const revenue = all
      .filter((o) => (o.status || "Pending") !== "Cancelled")
      .reduce((sum, o) => sum + priceFor(o.bundle), 0);
    statRevenue.textContent = "₱" + revenue.toLocaleString("en-PH");

    while (ordersBody.firstChild) ordersBody.removeChild(ordersBody.firstChild);

    if (filtered.length === 0) {
      ordersEmpty.hidden = false;
      ordersTable.style.display = "none";
      return;
    }
    ordersEmpty.hidden = true;
    ordersTable.style.display = "";

    filtered.forEach((order) => {
      const realIdx = all.indexOf(order);
      const tr = document.createElement("tr");

      tr.appendChild(makeCell("cell-date", formatDate(order.submittedAt)));
      tr.appendChild(buildCustomerCell(order));
      tr.appendChild(makeCell("cell-bundle", (order.bundle || "").split(" - ")[0]));
      tr.appendChild(buildPaymentCell(order));
      tr.appendChild(buildAddressCell(order));
      tr.appendChild(buildStatusCell(order, realIdx));

      const actionsTd = document.createElement("td");
      actionsTd.className = "cell-actions";
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-icon-delete";
      delBtn.textContent = "✕";
      delBtn.setAttribute("aria-label", "Delete order");
      delBtn.title = "Delete order";
      delBtn.addEventListener("click", () => {
        if (!confirm("Burahin ang order na ito?")) return;
        const list = loadOrders();
        list.splice(realIdx, 1);
        saveOrders(list);
        renderOrders();
      });
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);

      ordersBody.appendChild(tr);
    });
  }

  if (refreshBtn) refreshBtn.addEventListener("click", renderOrders);
  if (searchInput) searchInput.addEventListener("input", renderOrders);
  if (filterStatus) filterStatus.addEventListener("change", renderOrders);
  if (filterPayment) filterPayment.addEventListener("change", renderOrders);
  if (filterBundle) filterBundle.addEventListener("change", renderOrders);

  // ---------- CSV Export ----------
  function toCsv(orders) {
    const headers = ["Date", "Full Name", "Contact", "Bundle", "Payment", "Status", "Address"];
    const rows = orders.map((o) => [
      o.submittedAt || "",
      o.fullName || "",
      o.contact || "",
      o.bundle || "",
      o.payment || "",
      o.status || "Pending",
      (o.address || "").replace(/\r?\n/g, " "),
    ]);
    const escape = (val) => {
      const s = String(val == null ? "" : val);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const orders = loadOrders();
      if (orders.length === 0) {
        alert("Wala pang orders to export.");
        return;
      }
      const csv = "﻿" + toCsv(orders);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = "gsk-orders-" + stamp + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // ---------- Init ----------
  if (isAuthenticated()) showAdmin();
  else showLogin();
})();
