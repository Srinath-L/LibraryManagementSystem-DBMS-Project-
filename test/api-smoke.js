import assert from "node:assert/strict";

const base = process.env.LMS_BASE_URL || "http://localhost:3000";
const health = await fetch(`${base}/api/health`);
assert.equal(health.status, 200, "Health endpoint must respond");

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@library.edu", password: "admin123" })
});
assert.equal(login.status, 200, "Seeded administrator must be able to log in");
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Login must set an authentication cookie");

for (const endpoint of ["/api/books?limit=5", "/api/members", "/api/analytics/dashboard", "/api/analytics/reports"]) {
  const response = await fetch(`${base}${endpoint}`, { headers: { cookie } });
  assert.equal(response.status, 200, `${endpoint} must respond`);
  const body = await response.json();
  assert.equal(body.status, "success");
}

console.log("API smoke checks passed: health, login, books, members, dashboard and reports");
