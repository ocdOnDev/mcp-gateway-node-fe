import fs from "fs";
import os from "os";
import path from "path";

/**
 * Safely updates or creates a key=value entry in a .env-style file.
 * If the file doesn't exist, it's created with secure permissions (0600).
 * If the key exists, it is replaced in-place.
 *
 * @param {string} key - The variable name (e.g. "JWT_TOKEN").
 * @param {string} value - The value to store.
 * @param {string} [filePath] - Optional custom path (defaults to ~/.local_env_vars.env).
 */
export function updateEnvVar(key, value, filePath) {
    const targetPath =
        filePath || path.join(os.homedir(), ".local_env_vars.env");

    let content = "";
    if (fs.existsSync(targetPath)) {
        content = fs.readFileSync(targetPath, "utf-8");
    }

    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        if (!content.endsWith("\n") && content.length > 0) content += "\n";
        content += `${key}=${value}\n`;
    }

    fs.writeFileSync(targetPath, content, { mode: 0o600 });
    console.log(`✅ ${key} updated in ${targetPath}`);
}