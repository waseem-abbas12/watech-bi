import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.resolve('reports/prompt-10/SCREENSHOTS');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const targets = [
  {
    name: '01_integrations_hub.png',
    url: 'http://localhost:3000/integrations',
  },
  {
    name: '02_automations_management.png',
    url: 'http://localhost:3000/automations',
  },
  {
    name: '03_background_jobs_queue.png',
    url: 'http://localhost:3000/jobs',
  },
  {
    name: '04_notifications_feed.png',
    url: 'http://localhost:3000/notifications',
  },
];

console.log('Capturing Prompt 10 Integrations & Automations Screenshots...');

for (const target of targets) {
  const outputPath = path.join(screenshotsDir, target.name);
  console.log(`Capturing: ${target.url} -> ${outputPath}`);
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --screenshot="${outputPath}" "${target.url}"`;
    execSync(cmd, { stdio: 'pipe', timeout: 35000 });
    console.log(`  [OK] Saved ${target.name} (${fs.statSync(outputPath).size} bytes)`);
  } catch (err) {
    console.error(`  [FAIL] ${target.name}:`, err.message);
  }
}

console.log('Screenshot capture complete.');
