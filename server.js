import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import rateLimit from "express-rate-limit";
import YAML from "yaml";
import { registerTool } from "./registerTool.js";
import swaggerUi from "swagger-ui-express";
import { createProxyMiddleware } from "http-proxy-middleware";
import bodyParser from 'body-parser';

dotenv.config();
const app = express();




// === Core Middleware ===
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));




// === Logging ===
if (!fs.existsSync("./logs")) fs.mkdirSync("./logs", { recursive: true });

// Write combined logs to file
app.use(
  morgan("combined", {
    stream: fs.createWriteStream("./logs/access.log", { flags: "a" })
  })
);

// Console-friendly colored output for development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// === Debug Middleware ===
if (process.env.DEBUG_GATEWAY === "true") {
  app.use((req, res, next) => {
    console.log("GATEWAY RECEIVED:", req.method, req.url);
    next();
  });
}

// === Rate Limiting ===
app.set("trust proxy", 1); // trust first proxy (needed for rateLimit + reverse proxy)

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 requests per IP per minute
  message: { error: "Rate limit exceeded." },
  standardHeaders: true, // adds `RateLimit-*` headers
  legacyHeaders: false   // disables `X-RateLimit-*` headers
});

app.use(limiter);


// === Load Tool Config ===
let tools;
try {
  tools = JSON.parse(fs.readFileSync("./tools.config.json", "utf8"));
} catch (err) {
  console.error("❌ Failed to load tools.config.json:", err.message);
  process.exit(1);
}

const openapi = {
  openapi: "3.0.3",
  info: { title: "AI Gateway Tool API", version: "1.0.0" },
  paths: {}
};

// === Register Tools Dynamically ===
Object.entries(tools).forEach(([name, cfg]) => {
  //registerTool(app, name, cfg, openapi);
});



  app.use("/tool/:name", async (req, res) => {
    const toolName = req.params.name;
    const args = req.body;

    // Normalize for weather
    if (args.city) {
      args.location = args.city;
      delete args.city;
    }

    const payload = { tool: `get_${toolName}`, args };

    try {
      const response = await fetch("http://localhost:8080/mcp/tools/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err) {
      console.error("❌ MCP bridge error:", err.message);
      res.status(500).json({ error: "MCP bridge failed", detail: err.message });
    }
  });



// === OpenAPI Spec ===
app.get("/openapi.json", (req, res) => res.json(openapi));
app.get("/openapi.yaml", (req, res) => res.type("text/yaml").send(YAML.stringify(openapi)));

// === Swagger UI ===
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

// === Health Check ===
app.get("/health", (req, res) => res.json({
    status: "ok",
    uptime: process.uptime(),
    version: openapi.info.version,
    time: new Date().toISOString()
  })
);

// === Error Handling ===
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error("Gateway error:", { path: req.path, msg: err.message });
  res.status(status).json({
    error: "Internal gateway error",
    detail: err.message
  });
});

// === HTTPS Setup ===
let server;
try {
  const key = fs.readFileSync(process.env.SSL_KEY_PATH);
  const cert = fs.readFileSync(process.env.SSL_CERT_PATH);
  server = https.createServer({ key, cert }, app);
} catch (err) {
  console.warn("⚠️ SSL certs not found, falling back to HTTP:", err.message);
  server = app;
}


// === Start Server ===
const PORT = process.env.PORT || 8443;
const HOST = process.env.HOST || "macboobies.local";
server.listen(PORT, HOST, () => {
  console.log(`🔐 HTTPS Gateway listening at https://${HOST}:${PORT}`);
});

