#!/usr/bin/env node

/**
 * Environment Switcher for Passport Photo Frontend
 * 
 * Usage:
 *   node switch-env.js dev     # Switch to development (local backend)
 *   node switch-env.js prod    # Switch to production (AWS backend)
 *   node switch-env.js status  # Show current environment
 */

const fs = require('fs');
const path = require('path');

const envFiles = {
  dev: '.env.development',
  prod: '.env.production'
};

const targetFile = '.env';

function getCurrentEnv() {
  try {
    const content = fs.readFileSync(targetFile, 'utf8');
    if (content.includes('localhost')) {
      return 'development (local backend)';
    } else if (content.includes('elasticbeanstalk')) {
      return 'production (AWS backend)';
    } else {
      return 'unknown';
    }
  } catch (error) {
    return 'not found';
  }
}

function switchEnvironment(env) {
  const sourceFile = envFiles[env];
  
  if (!sourceFile) {
    console.error('❌ Invalid environment. Use "dev" or "prod"');
    process.exit(1);
  }
  
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Environment file ${sourceFile} not found`);
    process.exit(1);
  }
  
  try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✅ Switched to ${env === 'dev' ? 'development' : 'production'} environment`);
    console.log(`📁 Using configuration from ${sourceFile}`);
    
    // Show the API URL being used
    const content = fs.readFileSync(targetFile, 'utf8');
    const apiUrlMatch = content.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      console.log(`🔗 API URL: ${apiUrlMatch[1]}`);
    }
    
    console.log('\n💡 Remember to restart the development server for changes to take effect!');
  } catch (error) {
    console.error('❌ Failed to switch environment:', error.message);
    process.exit(1);
  }
}

function showStatus() {
  const current = getCurrentEnv();
  console.log(`📊 Current environment: ${current}`);
  
  if (fs.existsSync(targetFile)) {
    const content = fs.readFileSync(targetFile, 'utf8');
    const apiUrlMatch = content.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      console.log(`🔗 API URL: ${apiUrlMatch[1]}`);
    }
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'dev':
  case 'development':
    switchEnvironment('dev');
    break;
  case 'prod':
  case 'production':
    switchEnvironment('prod');
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('🔧 Environment Switcher for Passport Photo Frontend\n');
    console.log('Usage:');
    console.log('  node switch-env.js dev     # Switch to development (local backend)');
    console.log('  node switch-env.js prod    # Switch to production (AWS backend)');
    console.log('  node switch-env.js status  # Show current environment\n');
    showStatus();
}