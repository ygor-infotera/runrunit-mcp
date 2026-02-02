import { spawn } from "child_process";
import "dotenv/config";

async function testTask() {
  const serverPath = "src/index.ts";
  const child = spawn("npx", ["tsx", serverPath], {
    env: { ...process.env },
    stdio: ["pipe", "pipe", "inherit"],
  });

  const sendRequest = (method: string, params: any = {}) => {
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    };
    child.stdin.write(JSON.stringify(request) + "\n");
  };

  return new Promise((resolve, reject) => {
    child.stdout.on("data", (data) => {
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
        child.kill();
      } catch (e) {
        // Might be the "Server running" message on stderr or some other stdout
        // console.error("Stdout parse error:", data.toString());
      }
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0 && code !== null)
        reject(new Error(`Server exited with code ${code}`));
    });

    // Wait a bit for server to start
    setTimeout(() => {
      sendRequest("tools/call", {
        name: "get_task",
        arguments: { id: 1924 },
      });
    }, 2000);
  });
}

testTask()
  .then((resp) => {
    console.log("Response:", JSON.stringify(resp, null, 2));
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
