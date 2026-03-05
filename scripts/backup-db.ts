// Database Backup Script
// Usage: npx tsx scripts/backup-db.ts
// Auto backup: add to Windows Task Scheduler or cron

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const execAsync = promisify(exec);

function parseDbUrl(url: string) {
    const u = new URL(url);
    return {
        host: u.hostname,
        port: u.port || "3306",
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: u.pathname.slice(1),
    };
}

async function backup() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set in .env.local");

    const { host, port, user, password, database } = parseDbUrl(dbUrl);

    // Create backups directory
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_${database}_${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);

    console.log(`📦 Backing up database: ${database}`);
    console.log(`📁 Output: ${filepath}`);

    // Run mysqldump — password via env var (not visible in process list)
    const cmd = `mysqldump -h ${host} -P ${port} -u ${user} --single-transaction --routines --triggers ${database} > "${filepath}"`;
    const execEnv = { ...process.env, MYSQL_PWD: password };

    try {
        await execAsync(cmd, { env: execEnv });
        const stats = fs.statSync(filepath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ Backup complete! Size: ${sizeMB} MB`);

        // Auto-cleanup: keep only last 7 backups
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith("backup_") && f.endsWith(".sql"))
            .sort()
            .reverse();

        if (files.length > 7) {
            const toDelete = files.slice(7);
            for (const f of toDelete) {
                fs.unlinkSync(path.join(backupDir, f));
                console.log(`🗑️  Deleted old backup: ${f}`);
            }
        }

        console.log(`\n📋 Available backups (${Math.min(files.length, 7)}):`);
        files.slice(0, 7).forEach(f => console.log(`   - ${f}`));

    } catch (error) {
        console.error("❌ Backup failed:", error instanceof Error ? error.message : error);
        console.error("💡 Make sure 'mysqldump' is installed and in your PATH");
        process.exit(1);
    }
}

backup();
