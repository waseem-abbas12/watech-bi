import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotsDir = path.resolve('reports/prompt-07/SCREENSHOTS');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const targets = [
  {
    name: '01_customer_onboarding_wizard.png',
    url: 'http://localhost:3000/onboarding',
    windowSize: '1440,900',
  },
  {
    name: '02_dashboard_activation_checklist.png',
    url: 'http://localhost:3000/',
    windowSize: '1440,900',
  },
  {
    name: '03_pipeline_workflow_empty_state.png',
    url: 'http://localhost:3000/?module=lead_pipeline',
    windowSize: '1440,900',
  },
];

console.log('Capturing screenshots for Prompt 07 validation...');

for (const target of targets) {
  const outputPath = path.join(screenshotsDir, target.name);
  console.log(`Capturing: ${target.url} -> ${outputPath}`);
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --window-size=${target.windowSize} --screenshot="${outputPath}" "${target.url}"`;
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    console.log(`  [OK] Saved ${target.name} (${fs.statSync(outputPath).size} bytes)`);
  } catch (err) {
    console.error(`  [FAIL] Could not capture ${target.name}:`, err.message);
  }
}

console.log('Screenshot capture finished.');
