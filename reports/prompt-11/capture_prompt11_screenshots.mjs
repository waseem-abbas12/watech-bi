import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.resolve('reports/prompt-11/SCREENSHOTS');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const targets = [
  {
    name: '01_production_health_check.png',
    url: 'http://localhost:3000/api/health',
  },
  {
    name: '02_platform_admin_overview.png',
    url: 'http://localhost:3000/platform-admin',
  },
  {
    name: '03_operational_command_center.png',
    url: 'http://localhost:3000/command-center',
  },
  {
    name: '04_system_jobs_and_workers.png',
    url: 'http://localhost:3000/jobs',
  },
];

console.log('Capturing Prompt 11 Production Infrastructure Screenshots...');

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
