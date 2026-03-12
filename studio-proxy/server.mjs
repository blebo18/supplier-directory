import http from "node:http";
import { spawn } from "node:child_process";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const APP_ORIGIN = process.env.APP_ORIGIN || "http://app:3000";
const STUDIO_PORT = 5556;
const PROXY_PORT = 5555;

// ── Start Prisma Studio on internal port ──
const studio = spawn(
  "node",
  ["node_modules/prisma/build/index.js", "studio", "--port", String(STUDIO_PORT), "--browser", "none"],
  { stdio: "inherit", env: { ...process.env } }
);
studio.on("exit", (code) => {
  console.error(`Prisma Studio exited with code ${code}`);
  process.exit(1);
});

// Wait for Studio to be ready
await new Promise((r) => setTimeout(r, 2000));

// ── Helpers ──
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    cookies[k] = v.join("=");
  }
  return cookies;
}

async function validateAdmin(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.studio_token;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Login page HTML ──
function loginPage(error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Prisma Studio - Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border-radius: 12px; padding: 2rem; width: 100%; max-width: 380px; box-shadow: 0 1px 3px rgba(0,0,0,.1); border: 1px solid #e5e7eb; }
    h1 { font-size: 1.25rem; color: #111827; margin-bottom: .25rem; }
    p.sub { font-size: .875rem; color: #6b7280; margin-bottom: 1.5rem; }
    label { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .25rem; }
    input[type=email], input[type=password] { width: 100%; padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: .875rem; margin-bottom: .75rem; outline: none; transition: border-color .15s; }
    input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
    button { width: 100%; padding: .625rem; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: .875rem; font-weight: 500; cursor: pointer; transition: background .15s; }
    button:hover { background: #1d4ed8; }
    .error { background: #fef2f2; color: #dc2626; padding: .5rem .75rem; border-radius: 8px; font-size: .875rem; margin-bottom: .75rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Prisma Studio</h1>
    <p class="sub">Sign in with your admin account</p>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="POST" action="/auth/login">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="email" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required />
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;
}

// ── Read POST body ──
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}

// ── Proxy request to Studio ──
function proxyToStudio(req, res) {
  const proxyReq = http.request(
    { hostname: "127.0.0.1", port: STUDIO_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Prisma Studio unavailable");
  });
  req.pipe(proxyReq);
}

// ── Auth proxy server ──
const server = http.createServer(async (req, res) => {
  // Handle login POST
  if (req.method === "POST" && req.url === "/auth/login") {
    const body = await readBody(req);
    const params = new URLSearchParams(body);
    const email = params.get("email");
    const password = params.get("password");

    try {
      // Forward credentials to the main app's login API
      const loginRes = await fetch(`${APP_ORIGIN}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(loginPage("Invalid email or password."));
        return;
      }

      const data = await loginRes.json();

      if (data.user.role !== "ADMIN") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(loginPage("Admin access required."));
        return;
      }

      // Set the access token as a cookie and redirect to Studio
      res.writeHead(302, {
        "Set-Cookie": `studio_token=${data.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
        Location: "/",
      });
      res.end();
    } catch {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(loginPage("Unable to reach authentication service."));
    }
    return;
  }

  // Handle logout
  if (req.url === "/auth/logout") {
    res.writeHead(302, {
      "Set-Cookie": "studio_token=; Path=/; HttpOnly; Max-Age=0",
      Location: "/",
    });
    res.end();
    return;
  }

  // All other requests: check auth then proxy
  const user = await validateAdmin(req);
  if (!user) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(loginPage());
    return;
  }

  proxyToStudio(req, res);
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Studio auth proxy listening on port ${PROXY_PORT}`);
});
