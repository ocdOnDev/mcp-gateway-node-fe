// registerTool.js
import proxy from "express-http-proxy";
import { verifyToken } from "./auth.js";

/**
 * Dynamically registers a proxy route and OpenAPI schema for a given tool.
 * @param {Express.Application} app - Express application.
 * @param {string} name - Tool name.
 * @param {object} cfg - Tool configuration from tools.config.json.
 * @param {object} openapi - OpenAPI specification object to extend.
 */
export function registerTool(app, name, cfg, openapi) {
    console.log(`Registering /tool/${name} → ${cfg.target}`);

    // Create proxy middleware with body transformation
    const proxyMiddleware = proxy(cfg.target, {
        // Path rewriting
        proxyReqPathResolver: (req) => {
            const pathRewrite = cfg.pathRewrite || {};
            const rewriteRule = Object.entries(pathRewrite)[0];

            if (rewriteRule) {
                const [pattern, replacement] = rewriteRule;
                const newPath = req.path.replace(new RegExp(pattern), replacement);
                console.log(`[${name}] Path rewrite: ${req.path} → ${newPath}`);
                return newPath;
            }

            return req.path;
        },

        // Transform the request body
        proxyReqBodyDecorator: (bodyContent, srcReq) => {
            try {
                // Parse the incoming body
                const body = typeof bodyContent === 'string'
                    ? JSON.parse(bodyContent)
                    : bodyContent;

                console.log(`[${name}] Original body:`, body);

                // Transform to MCP format
                const transformedBody = {
                    tool: `get_${name}`,
                    args: body
                };

                console.log(`[${name}] Transformed body:`, transformedBody);

                return JSON.stringify(transformedBody);
            } catch (err) {
                console.error(`[${name}] Body transformation error:`, err.message);
                return bodyContent; // Return original if parsing fails
            }
        },

        // Modify request options/headers
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            console.log(`[${name}] Forwarding to: ${cfg.target}${proxyReqOpts.path}`);

            // Add custom headers
            proxyReqOpts.headers['Content-Type'] = 'application/json';
            proxyReqOpts.headers['x-user-id'] = srcReq.user?.id || 'anonymous';

            return proxyReqOpts;
        },

        // Handle response
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            console.log(`[${name}] ✓ Response from backend:`, proxyRes.statusCode);
            return proxyResData;
        },

        // Error handling
        proxyErrorHandler: (err, res, next) => {
            console.error(`[${name}] ❌ Proxy error:`, err.message);

            if (!res.headersSent) {
                res.status(502).json({
                    error: "Gateway proxy error",
                    detail: err.message,
                    target: cfg.target
                });
            }
        }
    });

    // Register the route with JWT verification + proxy
    app.use(`/tool/${name}`, verifyToken, proxyMiddleware);

    // Extend OpenAPI documentation
    openapi.paths[`/tool/${name}`] = {
        post: {
            summary: cfg.description || `Tool ${name}`,
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: cfg.schema || { type: "object" },
                    },
                },
            },
            responses: {
                200: { description: "Successful response" },
                400: { description: "Bad request" },
                401: { description: "Unauthorized" },
                500: { description: "Internal error" },
            },
        },
    };
}
