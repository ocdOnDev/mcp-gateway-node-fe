#!/usr/bin/env node
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { updateEnvVar } from "./updateEnvVar.js"; 

dotenv.config();

const [,, userId, role] = process.argv;

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET not set in .env");
  process.exit(1);
}

/** optional to disallow no userid
 * if (!userId) {
  console.error("Usage: node generate-token.js <userId> [role]");
  process.exit(1);
}**/

const payload = {
  id: userId || "limited-agent",
  role: role || "agent",
  iat: Math.floor(Date.now() / 1000)
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

console.log(`✅ Generated JWT for ${payload.id}`);
// Store outside .secrets.env (e.g., ~/.local_env_vars.env)
const key = "JWT_TOKEN";
updateEnvVar(key, token);
