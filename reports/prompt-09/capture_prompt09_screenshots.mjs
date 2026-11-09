import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.resolve('reports/prompt-09/SCREENSHOTS');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const targets = [
  {
    name: '01_executive_overview_dashboard.png',
    url: 'http://localhost:3000/?module=overview',
  },
  {
    name: '02_projects_management_view.png',
    url: 'http://localhost:3000/?module=projects',
  },
  {
    name: '03_lead_intelligence_dossier.png',
    url: 'http://localhost:3000/?module=lead_intelligence',
  },
  {
    name: '04_followup_workspace.png',
    url: 'http://localhost:3000/?module=followups',
  },
  {
    name: '05_subscription_usage_view.png',
    url: 'http://localhost:3000/?module=billing',
  },
];

console.log('Capturing Prompt 09 SaaS Experience Screenshots...');

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
