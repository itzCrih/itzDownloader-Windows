const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptPath = path.resolve(__dirname, 'sign.ps1');

if (!fs.existsSync(scriptPath)) {
  console.log('No signing script found.');
  process.exit(0);
}

try {
  console.log('Executing Authenticode code signing via pwsh...');
  execSync(`pwsh -File "${scriptPath}"`, { stdio: 'inherit' });
} catch (e1) {
  try {
    console.log('pwsh failed, falling back to powershell...');
    execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });
  } catch (e2) {
    console.warn('Code signing failed:', e2.message);
  }
}
