(function () {
  "use strict";

  // ---------- Config ----------
  // Change this password to secure the admin panel.
  // For real production, replace with proper backend auth (Supabase, Netlify Identity, etc.)
  const ADMIN_PASSWORD = "gsk2026";
  const SESSION_KEY = "gsk_admin_auth";
  const ORDERS_KEY = "gsk_orders";

  const BUNDLE_PRICES = {
    "1 Box - ₱1,300": 1300,
    "2 Boxes - ₱2,400": 2400,
    "3 Boxes - ₱3,300": 3300,
  };

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
  const statRevenue = document.getElementById("statRevenue");
  const statLatest = document.getElementById("statLatest");

  // ---------- Auth ----------
  function isAuthenticated() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function setAuthenticated(value) {
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, "true");
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      // sessionStorage may be unavailable
    }
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

  // ---------- Orders ----------
  function loadOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders = raw ? JSON.parse(raw) : [];
      return Array.isArray(orders) ? orders : [];
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      // ignore
    }
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

  function priceFor(bundle) {
    return BUNDLE_PRICES[bundle] || 0;
  }

  function makeCell(className, text) {
    const td = document.createElement("td");
    td.className = className;
    td.textContent = text == null ? "" : String(text);
    return td;
  }

  function renderOrders() {
    const orders = loadOrders();
    const sorted = [...orders].sort((a, b) => {
      const ta = new Date(a.submittedAt || 0).getTime();
      const tb = new Date(b.submittedAt || 0).getTime();
      return tb - ta;
    });

    statTotal.textContent = String(sorted.length);
    const revenue = sorted.reduce((sum, o) => sum + priceFor(o.bundle), 0);
    statRevenue.textContent = "₱" + revenue.toLocaleString("en-PH");
    statLatest.textContent = sorted.length ? formatDate(sorted[0].submittedAt) : "—";

    while (ordersBody.firstChild) ordersBody.removeChild(ordersBody.firstChild);

    if (sorted.length === 0) {
      ordersEmpty.hidden = false;
      ordersTable.style.display = "none";
      return;
    }
    ordersEmpty.hidden = true;
    ordersTable.style.display = "";

    sorted.forEach((order) => {
      const realIdx = orders.indexOf(order);
      const tr = document.createElement("tr");

      tr.appendChild(makeCell("cell-date", formatDate(order.submittedAt)));
      tr.appendChild(makeCell("cell-name", order.fullName));

      const contactTd = document.createElement("td");
      contactTd.className = "cell-contact";
      const contactLink = document.createElement("a");
      contactLink.href = "tel:" + (order.contact || "");
      contactLink.textContent = order.contact || "";
      contactTd.appendChild(contactLink);
      tr.appendChild(contactTd);

      tr.appendChild(makeCell("cell-bundle", order.bundle));

      const paymentTd = document.createElement("td");
      paymentTd.className = "cell-payment";
      const pill = document.createElement("span");
      pill.className = "payment-pill";
      pill.textContent = order.payment || "";
      paymentTd.appendChild(pill);
      tr.appendChild(paymentTd);

      tr.appendChild(makeCell("cell-address", order.address));

      const actionsTd = document.createElement("td");
      actionsTd.className = "cell-actions";
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-icon-delete";
      delBtn.textContent = "✕";
      delBtn.setAttribute("aria-label", "Delete order");
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

  // ---------- Export to CSV ----------
  function toCsv(orders) {
    const headers = ["Date", "Full Name", "Contact", "Bundle", "Payment", "Address"];
    const rows = orders.map((o) => [
      o.submittedAt || "",
      o.fullName || "",
      o.contact || "",
      o.bundle || "",
      o.payment || "",
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
  if (isAuthenticated()) {
    showAdmin();
  } else {
    showLogin();
  }
})();
