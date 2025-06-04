// Script to clear Next.js cache and restart development server
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Stopping any running Next.js processes...');
try {
  // This might fail if no processes are running, which is fine
  execSync('npx kill-port 3000 3001 3002 3003 3004 3005', { stdio: 'inherit' });
} catch (e) {
  console.log('No processes to kill or kill-port not available');
}

// Path to the .next directory
const nextDir = path.join(__dirname, '.next');

console.log('Checking if .next directory exists...');
if (fs.existsSync(nextDir)) {
  console.log('Removing .next directory...');
  
  try {
    // On Windows, we need to handle read-only files
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('.next directory removed successfully');
  } catch (err) {
    console.error('Error removing .next directory:', err.message);
    console.log('Trying an alternative approach...');
    
    try {
      // Use rimraf as a fallback
      execSync('npx rimraf .next', { stdio: 'inherit' });
      console.log('Used rimraf to remove .next directory');
    } catch (rimrafErr) {
      console.error('Failed to remove .next directory with rimraf:', rimrafErr.message);
      console.log('Please manually delete the .next directory and try again');
    }
  }
} else {
  console.log('.next directory does not exist, no need to remove');
}

console.log('Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('npm cache cleared');
} catch (err) {
  console.error('Error clearing npm cache:', err.message);
}

console.log('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Dependencies installed successfully');
} catch (err) {
  console.error('Error installing dependencies:', err.message);
}

console.log('Starting development server...');
console.log('Run "npm run dev" to start the server'); 