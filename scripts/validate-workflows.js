#!/usr/bin/env node

/**
 * GitHub Actions 工作流验证脚本
 * 验证工作流配置的正确性和必需的 secrets
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = '.github/workflows';
const REQUIRED_SECRETS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'VITE_API_BASE_URL',
  'FRONTEND_URL'
];

const OPTIONAL_SECRETS = [
  'API_URL'
];

const REQUIRED_VARIABLES = [
  'DEPLOY_WORKERS'
];

function validateWorkflowFile(filePath) {
  console.log(`\n验证工作流: ${filePath}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = yaml.load(content);
    
    // 验证基本结构
    if (!workflow.name) {
      console.error('❌ 缺少工作流名称');
      return false;
    }
    
    if (!workflow.on) {
      console.error('❌ 缺少触发条件');
      return false;
    }
    
    if (!workflow.jobs) {
      console.error('❌ 缺少作业定义');
      return false;
    }
    
    console.log(`✅ 工作流名称: ${workflow.name}`);
    console.log(`✅ 作业数量: ${Object.keys(workflow.jobs).length}`);
    
    // 检查 secrets 使用
    const workflowContent = content.toLowerCase();
    const usedSecrets = [];
    
    REQUIRED_SECRETS.forEach(secret => {
      if (workflowContent.includes(secret.toLowerCase())) {
        usedSecrets.push(secret);
      }
    });
    
    console.log(`✅ 使用的 secrets: ${usedSecrets.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error(`❌ 解析工作流失败: ${error.message}`);
    return false;
  }
}

function checkWorkflowsDirectory() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`❌ 工作流目录不存在: ${WORKFLOWS_DIR}`);
    return false;
  }
  
  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
  
  if (files.length === 0) {
    console.error('❌ 未找到工作流文件');
    return false;
  }
  
  console.log(`✅ 找到 ${files.length} 个工作流文件`);
  return files;
}

function validatePackageScripts() {
  console.log('\n验证 package.json 脚本...');
  
  const frontendPackage = path.join('frontend', 'package.json');
  const backendPackage = path.join('backend', 'package.json');
  
  // 验证前端脚本
  if (fs.existsSync(frontendPackage)) {
    const pkg = JSON.parse(fs.readFileSync(frontendPackage, 'utf8'));
    const requiredScripts = ['build', 'test', 'lint'];
    
    requiredScripts.forEach(script => {
      if (pkg.scripts && pkg.scripts[script]) {
        console.log(`✅ 前端脚本 '${script}' 存在`);
      } else {
        console.error(`❌ 前端缺少脚本 '${script}'`);
      }
    });
  }
  
  // 验证后端脚本
  if (fs.existsSync(backendPackage)) {
    const pkg = JSON.parse(fs.readFileSync(backendPackage, 'utf8'));
    const requiredScripts = ['build', 'test', 'lint'];
    
    requiredScripts.forEach(script => {
      if (pkg.scripts && pkg.scripts[script]) {
        console.log(`✅ 后端脚本 '${script}' 存在`);
      } else {
        console.error(`❌ 后端缺少脚本 '${script}'`);
      }
    });
  }
}

function printSecretsGuide() {
  console.log('\n📋 必需的 GitHub Secrets 配置:');
  console.log('=====================================');
  
  REQUIRED_SECRETS.forEach(secret => {
    console.log(`- ${secret}`);
  });
  
  console.log('\n📋 可选的 GitHub Secrets:');
  console.log('=========================');
  
  OPTIONAL_SECRETS.forEach(secret => {
    console.log(`- ${secret}`);
  });
  
  console.log('\n📋 可选的 GitHub Variables:');
  console.log('===========================');
  
  REQUIRED_VARIABLES.forEach(variable => {
    console.log(`- ${variable}`);
  });
  
  console.log('\n🔧 配置步骤:');
  console.log('1. 转到 GitHub 仓库 > Settings > Secrets and variables > Actions');
  console.log('2. 添加上述 secrets 和 variables');
  console.log('3. 确保 Cloudflare API 令牌具有正确权限');
  console.log('4. 在 Cloudflare 控制台创建 Pages 项目');
}

function main() {
  console.log('🔍 GitHub Actions 工作流验证');
  console.log('==============================');
  
  // 检查工作流目录和文件
  const workflowFiles = checkWorkflowsDirectory();
  if (!workflowFiles) {
    process.exit(1);
  }
  
  // 验证每个工作流文件
  let allValid = true;
  workflowFiles.forEach(file => {
    const filePath = path.join(WORKFLOWS_DIR, file);
    if (!validateWorkflowFile(filePath)) {
      allValid = false;
    }
  });
  
  // 验证 package.json 脚本
  validatePackageScripts();
  
  // 打印配置指南
  printSecretsGuide();
  
  if (allValid) {
    console.log('\n✅ 所有工作流验证通过!');
    console.log('现在可以推送代码触发自动部署。');
  } else {
    console.log('\n❌ 工作流验证失败，请修复上述问题。');
    process.exit(1);
  }
}

// 检查是否安装了 js-yaml
try {
  require('js-yaml');
} catch (error) {
  console.error('❌ 缺少依赖: js-yaml');
  console.log('请运行: npm install js-yaml');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateWorkflowFile,
  checkWorkflowsDirectory,
  validatePackageScripts
};