import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.resolve('reports/prompt-12/SCREENSHOTS');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const targets = [
  {
    name: '01_customer_activation_journey.png',
    url: 'http://localhost:3000/onboarding',
  },
  {
    name: '02_lead_pipeline_and_dossier.png',
    url: 'http://localhost:3000/?module=lead_intelligence',
  },
  {
    name: '03_unified_crm_pipeline_board.png',
    url: 'http://localhost:3000/?module=lead_crm',
  },
  {
    name: '04_integrations_and_jobs_console.png',
    url: 'http://localhost:3000/integrations',
  },
  {
    name: '05_ceo_command_and_financials.png',
    url: 'http://localhost:3000/command-center',
  },
];

console.log('Capturing Prompt 12 Final Release Audit Screenshots...');

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
