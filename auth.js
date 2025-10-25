import jwt from "jsonwebtoken";

// === JWT Authentication Middleware ===
export function verifyToken(req, res, next) {
    const header = req.headers["authorization"];
    if (!header) return res.status(401).json({ error: "Missing Authorization header" });

    const token = header.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
}