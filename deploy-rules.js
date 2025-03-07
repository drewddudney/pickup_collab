// This script helps deploy Firebase rules
// Run with: node deploy-rules.js

const fs = require('fs');
const { execSync } = require('child_process');

console.log('Deploying Firebase rules...');

// Check if Firebase CLI is installed
try {
  execSync('firebase --version', { stdio: 'inherit' });
} catch (error) {
  console.error('Firebase CLI is not installed. Please install it with: npm install -g firebase-tools');
  process.exit(1);
}

// Check if user is logged in
try {
  execSync('firebase login:list', { stdio: 'inherit' });
} catch (error) {
  console.error('You are not logged in to Firebase. Please login with: firebase login');
  process.exit(1);
}

// Deploy Firestore rules
console.log('\nDeploying Firestore rules...');
try {
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('✅ Firestore rules deployed successfully!');
} catch (error) {
  console.error('❌ Failed to deploy Firestore rules:', error.message);
}

// Deploy Storage rules
console.log('\nDeploying Storage rules...');
try {
  execSync('firebase deploy --only storage:rules', { stdio: 'inherit' });
  console.log('✅ Storage rules deployed successfully!');
} catch (error) {
  console.error('❌ Failed to deploy Storage rules:', error.message);
}

console.log('\nAll rules deployed! Your application should now have the correct permissions.');
console.log('If you still encounter permission issues, please check:');
console.log('1. Your Firebase project configuration');
console.log('2. Authentication is working correctly');
console.log('3. The collections exist in your Firestore database'); 