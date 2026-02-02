const APP_KEY = "311ef1927d984c058669e4debeff3af8";
const USER_TOKEN = "LHEeLqzfp8K4m6KgqJzu";

async function test() {
  const url = "https://runrun.it/api/v1.0/tasks/1982";
  const headers = {
    "App-Key": APP_KEY,
    "User-Token": USER_TOKEN,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, { headers });
  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Data:", JSON.stringify(data).substring(0, 100) + "...");
}

test().catch(console.error);
