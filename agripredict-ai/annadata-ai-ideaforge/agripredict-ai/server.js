// Local development server for AgriPredict AI.
// It serves the frontend and proxies the model request to the deployed Hatchable API.
// No npm packages are required. Requires Node.js 20+.
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const UPSTREAM_BASE =
  process.env.AGRIPREDICT_API_BASE || "https://agripredict-ai.hatchable.site";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function readRequestBody(req, maxBytes = 32 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function proxyPrediction(req, res) {
  try {
    const body = await readRequestBody(req);
    const response = await fetch(`${UPSTREAM_BASE}/api/hybrid-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    const responseText = await response.text();
    send(
      res,
      response.status,
      response.headers.get("content-type") || "application/json; charset=utf-8",
      responseText
    );
  } catch (error) {
    const status = error.statusCode || 502;
    send(
      res,
      status,
      "application/json; charset=utf-8",
      JSON.stringify({
        error: "Could not reach the AgriPredict AI prediction service.",
        detail: error.message
      })
    );
  }
}

function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, "text/plain; charset=utf-8", "Invalid URL path.");
  }

  const requestedPath = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, "index.html")) {
    return send(res, 403, "text/plain; charset=utf-8", "Forbidden.");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      return send(res, 404, "text/plain; charset=utf-8", "File not found.");
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    send(res, 200, contentType, data);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/api/hybrid-predict" && req.method === "POST") {
    return proxyPrediction(req, res);
  }

  if (requestUrl.pathname === "/api/hybrid-predict" && req.method !== "POST") {
    return send(res, 405, "application/json; charset=utf-8", JSON.stringify({
      error: "Use POST for the yield prediction endpoint."
    }));
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, "text/plain; charset=utf-8", "Method not allowed.");
  }

  return serveStatic(req, res, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`AgriPredict AI is running at http://localhost:${PORT}`);
  console.log(`Prediction API proxy: ${UPSTREAM_BASE}/api/hybrid-predict`);
});
