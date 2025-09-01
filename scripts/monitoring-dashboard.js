#!/usr/bin/env node

/**
 * Monitoring Dashboard Script
 * Provides a simple CLI dashboard for monitoring deployment health and analytics
 */

const axios = require('axios')
const { readFileSync } = require('fs')

// Configuration
const config = {
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3000',
    timeout: 10000
  },
  refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000, // 30 seconds
  showAnalytics: process.env.SHOW_ANALYTICS !== 'false'
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

// Utility functions
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStatusColor(status) {
  switch (status) {
    case 'healthy':
    case 'pass':
      return 'green'
    case 'degraded':
    case 'warn':
      return 'yellow'
    case 'unhealthy':
    case 'fail':
      return 'red'
    default:
      return 'white'
  }
}

async function makeRequest(endpoint) {
  try {
    const response = await axios.get(`${config.backend.url}${endpoint}`, {
      timeout: config.timeout,
      validateStatus: () => true
    })
    return response
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message }
    }
  }
}

async function fetchHealthData() {
  const response = await makeRequest('/api/monitoring/health')
  return response.status === 200 ? response.data.data : null
}

async function fetchSystemData() {
  const response = await makeRequest('/api/monitoring/system')
  return response.status === 200 ? response.data.data : null
}

async function fetchDeploymentData() {
  const response = await makeRequest('/api/monitoring/deployment')
  return response.status === 200 ? response.data.data : null
}

async function fetchAnalyticsData() {
  if (!config.showAnalytics) return null
  
  const response = await makeRequest('/api/monitoring/metrics')
  return response.status === 200 ? response.data.data : null
}

function displayHeader() {
  console.clear()
  console.log(colorize('='.repeat(80), 'cyan'))
  console.log(colorize('                    CLOUDFLARE DEPLOYMENT MONITOR', 'cyan'))
  console.log(colorize('='.repeat(80), 'cyan'))
  console.log(colorize(`Backend: ${config.backend.url}`, 'blue'))
  console.log(colorize(`Last Updated: ${new Date().toLocaleString()}`, 'blue'))
  console.log('')
}

function displayHealthStatus(healthData) {
  console.log(colorize('🏥 HEALTH STATUS', 'bright'))
  console.log('-'.repeat(40))
  
  if (!healthData) {
    console.log(colorize('❌ Unable to fetch health data', 'red'))
    return
  }
  
  const statusColor = getStatusColor(healthData.status)
  console.log(`Overall Status: ${colorize(healthData.status.toUpperCase(), statusColor)}`)
  console.log(`Uptime: ${formatUptime(healthData.uptime)}`)
  console.log(`Version: ${healthData.version}`)
  console.log(`Environment: ${healthData.environment}`)
  
  if (healthData.build_info) {
    console.log(`Build: ${healthData.build_info.commit || 'unknown'} (${healthData.build_info.build_time || 'unknown'})`)
  }
  
  console.log('')
  console.log('Component Health:')
  
  Object.entries(healthData.checks || {}).forEach(([component, check]) => {
    const statusColor = getStatusColor(check.status)
    const statusIcon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'
    console.log(`  ${statusIcon} ${component}: ${colorize(check.status, statusColor)} - ${check.message}`)
    
    if (check.response_time_ms) {
      console.log(`     Response Time: ${check.response_time_ms}ms`)
    }
  })
  
  console.log('')
}

function displaySystemInfo(systemData) {
  console.log(colorize('💻 SYSTEM INFORMATION', 'bright'))
  console.log('-'.repeat(40))
  
  if (!systemData) {
    console.log(colorize('❌ Unable to fetch system data', 'red'))
    return
  }
  
  console.log(`Node.js: ${systemData.node_version}`)
  console.log(`Platform: ${systemData.platform} (${systemData.arch})`)
  console.log(`Uptime: ${formatUptime(systemData.uptime)}`)
  
  if (systemData.memory_usage) {
    const mem = systemData.memory_usage
    console.log(`Memory: ${formatBytes(mem.rss)} RSS, ${formatBytes(mem.heapUsed)}/${formatBytes(mem.heapTotal)} heap`)
  }
  
  console.log('')
}

function displayDeploymentInfo(deploymentData) {
  console.log(colorize('🚀 DEPLOYMENT INFORMATION', 'bright'))
  console.log('-'.repeat(40))
  
  if (!deploymentData) {
    console.log(colorize('❌ Unable to fetch deployment data', 'red'))
    return
  }
  
  console.log(`Version: ${deploymentData.version}`)
  console.log(`Environment: ${deploymentData.environment}`)
  console.log(`Git Commit: ${deploymentData.git_commit}`)
  console.log(`Build Time: ${deploymentData.build_time}`)
  console.log(`Deployed At: ${new Date(deploymentData.deployed_at).toLocaleString()}`)
  console.log(`Service Uptime: ${formatUptime(deploymentData.uptime_seconds)}`)
  
  console.log('')
}

function displayAnalytics(analyticsData) {
  if (!config.showAnalytics || !analyticsData) return
  
  console.log(colorize('📊 MONITORING METRICS', 'bright'))
  console.log('-'.repeat(40))
  
  console.log(`Uptime: ${analyticsData.uptime_percentage.toFixed(2)}%`)
  console.log(`Avg Response Time: ${analyticsData.avg_response_time}ms`)
  console.log(`Error Rate: ${analyticsData.error_rate}%`)
  console.log(`Total Requests: ${analyticsData.total_requests.toLocaleString()}`)
  console.log(`Last 24h Requests: ${analyticsData.last_24h_requests.toLocaleString()}`)
  
  console.log('')
}

function displayFooter() {
  console.log(colorize('='.repeat(80), 'cyan'))
  console.log(colorize('Press Ctrl+C to exit | Refreshes every 30 seconds', 'blue'))
  console.log(colorize('='.repeat(80), 'cyan'))
}

async function updateDashboard() {
  try {
    const [healthData, systemData, deploymentData, analyticsData] = await Promise.all([
      fetchHealthData(),
      fetchSystemData(),
      fetchDeploymentData(),
      fetchAnalyticsData()
    ])
    
    displayHeader()
    displayHealthStatus(healthData)
    displaySystemInfo(systemData)
    displayDeploymentInfo(deploymentData)
    displayAnalytics(analyticsData)
    displayFooter()
  } catch (error) {
    console.error(colorize(`Error updating dashboard: ${error.message}`, 'red'))
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Monitoring Dashboard

Usage: node monitoring-dashboard.js [options]

Environment Variables:
  BACKEND_URL         Backend URL to monitor (default: http://localhost:3000)
  REFRESH_INTERVAL    Refresh interval in milliseconds (default: 30000)
  SHOW_ANALYTICS      Show analytics data (default: true)

Options:
  --help, -h          Show this help message
  --once              Run once and exit (don't refresh)

Examples:
  # Monitor local development
  node monitoring-dashboard.js

  # Monitor production with custom refresh rate
  BACKEND_URL=https://api.myapp.com REFRESH_INTERVAL=10000 node monitoring-dashboard.js

  # Run once and exit
  node monitoring-dashboard.js --once
  `)
  process.exit(0)
}

// Handle single run mode
if (process.argv.includes('--once')) {
  updateDashboard().then(() => process.exit(0)).catch(error => {
    console.error(colorize(`Error: ${error.message}`, 'red'))
    process.exit(1)
  })
} else {
  // Continuous monitoring mode
  console.log(colorize('Starting monitoring dashboard...', 'green'))
  console.log(colorize(`Monitoring: ${config.backend.url}`, 'blue'))
  console.log(colorize(`Refresh interval: ${config.refreshInterval}ms`, 'blue'))
  console.log('')
  
  // Initial update
  updateDashboard()
  
  // Set up refresh interval
  const interval = setInterval(updateDashboard, config.refreshInterval)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval)
    console.log(colorize('\nMonitoring stopped.', 'yellow'))
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    clearInterval(interval)
    console.log(colorize('\nMonitoring stopped.', 'yellow'))
    process.exit(0)
  })
}