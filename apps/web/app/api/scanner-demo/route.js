import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const root = process.cwd();
    const scannerPath = path.join(root, "..", "..", "services", "opportunity-scanner", "scanner.py");

    const { stdout, stderr } = await execFileAsync("python", [scannerPath], {
      cwd: path.dirname(scannerPath),
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });

    if (stderr && stderr.trim()) {
      console.error(stderr);
    }

    const data = JSON.parse(stdout);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        error: "Scanner demo failed",
        detail: String(error?.message || error)
      },
      { status: 500 }
    );
  }
}