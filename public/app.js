const state = { user: null, view: "dashboard", books: [], members: [], loans: [], reservations: [], reports: null };
const $ = (selector, root = document) => root.querySelector(selector);
const content = $("#content");
const modal = $("#modal");
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "-";
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const isOverdue = (value) => value && new Date(value).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);

modal.addEventListener("click", (event) => {
  if (event.target === modal || event.target.closest("[data-modal-close]")) modal.close();
});

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body.data;
}

function flash(message, error = false) {
  const node = $("#flash");
  node.textContent = message;
  node.style.borderLeftColor = error ? "#9f2f2f" : "#2e765b";
  node.hidden = false;
  setTimeout(() => { node.hidden = true; }, 3500);
}

function loading() { content.innerHTML = '<div class="loading">Loading library records...</div>'; }
function status(text, overdue = false) {
  const cls = overdue ? "overdue" : String(text).toLowerCase();
  return `<span class="status ${esc(cls)}">${esc(text)}</span>`;
}

function openForm({ title, submit = "Save", fields, onSubmit }) {
  $("#modal-title").textContent = title;
  $("#modal-submit").textContent = submit;
  $("#modal-body").innerHTML = fields;
  const form = $("#modal-form");
  form.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await onSubmit(new FormData(form));
      modal.close();
    } catch (error) { flash(error.message, true); }
  };
  modal.showModal();
}

function field(name, label, value = "", type = "text", extra = "") {
  return `<label>${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></label>`;
}

async function renderDashboard() {
  loading();
  const [stats, reports, loans] = await Promise.all([
    api("/analytics/dashboard"),
    api("/analytics/reports"),
    api("/circulation/loans?status=Issued")
  ]);
  state.reports = reports;
  state.loans = loans;
  const maxCategory = Math.max(1, ...reports.inventory.map((row) => row.totalCopies));
  content.innerHTML = `
    <div class="metric-row">
      ${metric("Catalog titles", stats.books)}${metric("Active members", stats.members)}${metric("Books issued", stats.activeLoans)}
      ${metric("Overdue", stats.overdue, stats.overdue > 0)}${metric("Reservation queue", stats.activeReservations)}${metric("Fines recorded", money(stats.fines))}
    </div>
    <div class="grid-two">
      <article class="panel"><div class="panel-head"><h2>Current loans</h2><button class="button" data-action="issue">Issue a book</button></div>
        <div class="ledger-list">${loans.slice(0, 7).map((loan) => {
          const overdue = isOverdue(loan.dueDate);
          return `<div class="ledger-item"><div><strong>${esc(loan.title)}</strong><small>${esc(loan.memberName)} - due ${date(loan.dueDate)}</small></div>${status(overdue ? "Overdue" : "Issued", overdue)}</div>`;
        }).join("") || '<div class="empty">No active loans.</div>'}</div>
      </article>
      <article class="panel"><h2>Inventory by category</h2><div class="chart-list">${reports.inventory.map((row) => `<div class="bar-row"><span>${esc(row._id)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.totalCopies / maxCategory * 100)}%"></div></div><strong>${row.totalCopies}</strong></div>`).join("")}</div></article>
    </div>`;
}

function metric(label, value, alert = false) {
  return `<article class="metric ${alert ? "alert" : ""}"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
}

async function renderBooks(search = "") {
  loading();
  state.books = await api(`/books?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`);
  content.innerHTML = `
    <div class="toolbar"><input id="book-search" type="search" value="${esc(search)}" placeholder="Search by title, ISBN or publisher"><button class="button primary" data-action="add-book">Add book</button></div>
    <div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th><th>Category</th><th>ISBN</th><th>Copies</th><th>Actions</th></tr></thead><tbody>
    ${state.books.map((book) => `<tr><td>${esc(book._id)}</td><td><strong>${esc(book.title)}</strong><br><small>${esc(book.publisher)}</small></td><td>${esc(book.category)}</td><td>${esc(book.isbn)}</td><td>${book.copies.available} / ${book.copies.total}</td><td><div class="row-actions"><button data-action="edit-book" data-id="${book._id}">Edit</button>${book.copies.available ? `<button data-action="issue" data-book="${book._id}">Issue</button>` : `<button data-action="reserve" data-book="${book._id}">Reserve</button>`}</div></td></tr>`).join("")}
    </tbody></table></div>`;
  $("#book-search").addEventListener("change", (event) => renderBooks(event.target.value));
}

function bookForm(book = {}) {
  openForm({
    title: book._id ? "Edit catalog record" : "Add catalog record",
    fields: [
      field("_id", "Book ID", book._id || nextLocalId(state.books, "B"), "text", book._id ? "readonly" : "required pattern='B[0-9]{3}'"),
      field("isbn", "ISBN", book.isbn || "", "text", "required"),
      field("title", "Title", book.title || "", "text", "required class='full'"),
      field("authors", "Author IDs (comma separated)", (book.authors || ["A001"]).join(", "), "text", "required"),
      field("category", "Category", book.category || "Database", "text", "required"),
      field("publisher", "Publisher", book.publisher || "", "text", "required"),
      field("edition", "Edition", book.edition || 1, "number", "required min='1'"),
      field("year", "Publication year", book.year || new Date().getFullYear(), "number", "required min='1900' max='2100'"),
      field("total", "Total copies", book.copies?.total ?? 1, "number", "required min='0'"),
      field("available", "Available copies", book.copies?.available ?? 1, "number", "required min='0'")
    ].join(""),
    onSubmit: async (data) => {
      const payload = {
        _id: data.get("_id"), isbn: data.get("isbn"), title: data.get("title"),
        authors: data.get("authors").split(",").map((x) => x.trim()).filter(Boolean),
        category: data.get("category"), publisher: data.get("publisher"),
        edition: Number(data.get("edition")), year: Number(data.get("year")),
        copies: { total: Number(data.get("total")), available: Number(data.get("available")) }
      };
      await api(book._id ? `/books/${book._id}` : "/books", { method: book._id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      flash(book._id ? "Book updated" : "Book added");
      await renderBooks();
    }
  });
}

async function renderMembers(search = "") {
  loading();
  state.members = await api(`/members${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  content.innerHTML = `
    <div class="toolbar"><input id="member-search" type="search" value="${esc(search)}" placeholder="Search members"><button class="button primary" data-action="add-member">Register member</button></div>
    <div class="table-wrap"><table><thead><tr><th>ID</th><th>Member</th><th>Department</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${state.members.map((member) => `<tr><td>${member._id}</td><td><strong>${esc(member.name)}</strong><br><small>${esc(member.email)}</small></td><td>${esc(member.department)}</td><td>${esc(member.membershipType)}</td><td>${status(member.active ? "Active" : "Inactive")}</td><td><div class="row-actions"><button data-action="edit-member" data-id="${member._id}">Edit</button><button data-action="issue" data-member="${member._id}">Issue book</button></div></td></tr>`).join("")}
    </tbody></table></div>`;
  $("#member-search").addEventListener("change", (event) => renderMembers(event.target.value));
}

function memberForm(member = {}) {
  openForm({
    title: member._id ? "Edit member" : "Register member",
    fields: [
      field("_id", "Member ID", member._id || nextLocalId(state.members, "M"), "text", member._id ? "readonly" : "required pattern='M[0-9]{3}'"),
      field("name", "Full name", member.name || "", "text", "required"),
      field("department", "Department", member.department || "Computer Science", "text", "required"),
      field("email", "Email", member.email || "", "email", "required"),
      field("phone", "Phone", member.phone || "", "tel", "required pattern='[0-9]{10}'"),
      `<label>Membership type<select name="membershipType"><option ${member.membershipType === "Faculty" ? "selected" : ""}>Faculty</option><option ${member.membershipType !== "Faculty" ? "selected" : ""}>Student</option></select></label>`,
      `<label>Status<select name="active"><option value="true" ${member.active !== false ? "selected" : ""}>Active</option><option value="false" ${member.active === false ? "selected" : ""}>Inactive</option></select></label>`
    ].join(""),
    onSubmit: async (data) => {
      const payload = Object.fromEntries(data.entries());
      payload.active = payload.active === "true";
      await api(member._id ? `/members/${member._id}` : "/members", { method: member._id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      flash(member._id ? "Member updated" : "Member registered");
      await renderMembers();
    }
  });
}

async function renderCirculation() {
  loading();
  state.loans = await api("/circulation/loans");
  content.innerHTML = `
    <div class="toolbar"><div><button class="button primary" data-action="issue">Issue book</button> <button class="button" data-action="reserve">Create reservation</button></div><span class="muted">${state.loans.filter((loan) => loan.status === "Issued").length} active loans</span></div>
    <div class="table-wrap"><table><thead><tr><th>Loan</th><th>Book</th><th>Member</th><th>Issued</th><th>Due / Returned</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${state.loans.map((loan) => { const overdue = loan.status === "Issued" && isOverdue(loan.dueDate); return `<tr><td>${loan._id}</td><td>${esc(loan.title || loan.bookId)}</td><td>${esc(loan.memberName || loan.memberId)}</td><td>${date(loan.issueDate)}</td><td>${date(loan.returnDate || loan.dueDate)}${loan.status === "Issued" ? `<br><small>${loan.renewals || 0}/2 renewals used</small>` : ""}</td><td>${status(overdue ? "Overdue" : loan.status, overdue)}</td><td>${loan.status === "Issued" ? `<button class="button" data-action="renew" data-id="${loan._id}" ${overdue || (loan.renewals || 0) >= 2 ? "disabled" : ""}>Renew</button> <button class="button" data-action="return" data-id="${loan._id}">Return</button>` : money(loan.fine)}</td></tr>`; }).join("")}
    </tbody></table></div>`;
}

async function loadBookMemberOptions() {
  const [books, members] = await Promise.all([api("/books?limit=100"), api("/members")]);
  state.books = books; state.members = members;
}

async function circulationForm(mode, defaults = {}) {
  await loadBookMemberOptions();
  const books = state.books.filter((book) => mode === "issue" ? book.copies.available > 0 : book.copies.available === 0);
  openForm({
    title: mode === "issue" ? "Issue a book" : "Reserve an unavailable book",
    submit: mode === "issue" ? "Issue book" : "Create reservation",
    fields: `
      <label class="full">Book<select name="bookId" required>${books.map((book) => `<option value="${book._id}" ${defaults.book === book._id ? "selected" : ""}>${esc(book._id)} - ${esc(book.title)}</option>`).join("")}</select></label>
      <label class="full">Member<select name="memberId" required>${state.members.filter((member) => member.active).map((member) => `<option value="${member._id}" ${defaults.member === member._id ? "selected" : ""}>${esc(member._id)} - ${esc(member.name)}</option>`).join("")}</select></label>
      ${mode === "issue" ? field("loanDays", "Loan period in days", 14, "number", "min='1' max='60'") : ""}`,
    onSubmit: async (data) => {
      await api(mode === "issue" ? "/circulation/issue" : "/circulation/reserve", {
        method: "POST",
        body: JSON.stringify({ bookId: data.get("bookId"), memberId: data.get("memberId"), ...(mode === "issue" ? { loanDays: Number(data.get("loanDays")) } : {}) })
      });
      flash(mode === "issue" ? "Book issued" : "Reservation created");
      await (state.view === "dashboard" ? renderDashboard() : state.view === "books" ? renderBooks() : state.view === "members" ? renderMembers() : state.view === "reservations" ? renderReservations() : renderCirculation());
    }
  });
}

async function renderReservations() {
  loading();
  state.reservations = await api("/circulation/reservations");
  content.innerHTML = `<div class="toolbar"><span class="muted">Oldest active request appears first</span><button class="button primary" data-action="reserve">Create reservation</button></div><div class="table-wrap"><table><thead><tr><th>Reservation</th><th>Book</th><th>Member</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.reservations.map((item) => `<tr><td>${item._id}</td><td>${esc(item.title || item.bookId)}</td><td>${esc(item.memberName || item.memberId)}</td><td>${date(item.reservationDate)}</td><td>${status(item.status)}</td><td>${item.status === "Active" ? `<button class="button" data-action="cancel-reservation" data-id="${item._id}">Cancel</button>` : "-"}</td></tr>`).join("")}</tbody></table></div>`;
}

async function renderAnalytics() {
  loading();
  const reports = await api("/analytics/reports");
  state.reports = reports;
  const maxBorrow = Math.max(1, ...reports.popularBooks.map((row) => row.borrowCount));
  content.innerHTML = `<div class="toolbar"><p class="muted">Live MongoDB aggregation results</p><a class="button" href="/api/analytics/export/overdue.csv">Export overdue CSV</a></div><div class="report-grid">
    <article class="panel"><h2>Most borrowed books</h2><div class="chart-list">${reports.popularBooks.map((row) => `<div class="bar-row"><span>${esc(row.title)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(row.borrowCount / maxBorrow * 100)}%"></div></div><strong>${row.borrowCount}</strong></div>`).join("")}</div></article>
    <article class="panel"><h2>Inventory summary</h2><div class="table-wrap"><table><thead><tr><th>Category</th><th>Titles</th><th>Available</th><th>Issued</th></tr></thead><tbody>${reports.inventory.map((row) => `<tr><td>${esc(row._id)}</td><td>${row.titles}</td><td>${row.availableCopies}</td><td>${row.issuedCopies}</td></tr>`).join("")}</tbody></table></div></article>
    <article class="panel"><h2>Overdue loans</h2><div class="ledger-list">${reports.overdueLoans.slice(0, 8).map((row) => `<div class="ledger-item"><div><strong>${esc(row.title)}</strong><small>${esc(row.memberName)} - ${row.overdueDays} days</small></div><strong>${money(row.calculatedFine)}</strong></div>`).join("") || '<div class="empty">No overdue loans.</div>'}</div></article>
    <article class="panel"><h2>Member activity</h2><div class="table-wrap"><table><thead><tr><th>Member</th><th>Total</th><th>Active</th><th>Fine</th></tr></thead><tbody>${reports.memberActivity.map((row) => `<tr><td>${esc(row.name)}</td><td>${row.totalLoans}</td><td>${row.activeLoans}</td><td>${money(row.totalFine)}</td></tr>`).join("")}</tbody></table></div></article>
    <article class="panel"><h2>Monthly circulation</h2><div class="ledger-list">${reports.monthlyCirculation.map((row) => `<div class="ledger-item"><div><strong>${esc(row._id)}</strong><small>${row.returns} returned</small></div><strong>${row.loans} loans</strong></div>`).join("")}</div></article>
    <article class="panel"><h2>Reservation queues</h2><div class="ledger-list">${reports.reservationQueues.map((row) => `<div class="ledger-item"><div><strong>${esc(row.title)}</strong><small>Next: ${esc(row.nextMember)}</small></div><strong>${row.queueLength}</strong></div>`).join("") || '<div class="empty">No active queues.</div>'}</div></article>
  </div>`;
}

function nextLocalId(items, prefix) {
  const max = Math.max(0, ...items.map((item) => Number(String(item._id).slice(1))).filter(Number.isFinite));
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

const viewMeta = {
  dashboard: ["Library operations", "Overview"], books: ["Catalog", "Books"], members: ["People", "Members"],
  circulation: ["Issue and return", "Circulation"], reservations: ["Hold queue", "Reservations"], analytics: ["MongoDB aggregations", "Reports"]
};
const renderers = { dashboard: renderDashboard, books: renderBooks, members: renderMembers, circulation: renderCirculation, reservations: renderReservations, analytics: renderAnalytics };

async function navigate(view) {
  state.view = view;
  $("#section-kicker").textContent = viewMeta[view][0];
  $("#section-title").textContent = viewMeta[view][1];
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $(".sidebar").classList.remove("open");
  try { await renderers[view](); } catch (error) { content.innerHTML = `<div class="empty">${esc(error.message)}</div>`; }
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) return navigate(nav.dataset.view);
  const action = event.target.closest("[data-action]");
  if (!action) return;
  try {
    if (action.dataset.action === "add-book") bookForm();
    if (action.dataset.action === "edit-book") bookForm(state.books.find((book) => book._id === action.dataset.id));
    if (action.dataset.action === "add-member") memberForm();
    if (action.dataset.action === "edit-member") memberForm(state.members.find((member) => member._id === action.dataset.id));
    if (action.dataset.action === "issue") await circulationForm("issue", { book: action.dataset.book, member: action.dataset.member });
    if (action.dataset.action === "reserve") await circulationForm("reserve", { book: action.dataset.book, member: action.dataset.member });
    if (action.dataset.action === "return" && confirm(`Return loan ${action.dataset.id}?`)) {
      const result = await api(`/circulation/return/${action.dataset.id}`, { method: "POST" });
      flash(`Book returned. Fine: ${money(result.fine)}`); await renderCirculation();
    }
    if (action.dataset.action === "renew") {
      const result = await api(`/circulation/renew/${action.dataset.id}`, { method: "POST" });
      flash(`Loan renewed through ${date(result.dueDate)} (${result.renewals}/2)`);
      await renderCirculation();
    }
    if (action.dataset.action === "cancel-reservation" && confirm(`Cancel reservation ${action.dataset.id}?`)) {
      await api(`/circulation/reservations/${action.dataset.id}/cancel`, { method: "PATCH" });
      flash("Reservation cancelled"); await renderReservations();
    }
  } catch (error) { flash(error.message, true); }
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").textContent = "";
  try {
    state.user = await api("/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    $("#user-name").textContent = state.user.name;
    $("#login-view").hidden = true; $("#app-view").hidden = false;
    await navigate("dashboard");
  } catch (error) { $("#login-error").textContent = error.message; }
});

$("#logout-button").addEventListener("click", async () => {
  await api("/auth/logout", { method: "POST" });
  location.reload();
});
$("#menu-button").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#today").textContent = new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date());

try {
  state.user = await api("/auth/me");
  $("#user-name").textContent = state.user.name;
  $("#login-view").hidden = true; $("#app-view").hidden = false;
  await navigate("dashboard");
} catch { /* Login screen remains visible. */ }
