#!/usr/bin/env node

// Debug script to test Docker health checks exactly as ClaraVerse does
const http = require('http');

console.log('=== ClaraVerse Docker Health Debug ===\n');

// Test Python health check exactly as dockerSetup.cjs does
async function testPythonHealth() {
  console.log('🐍 Testing Python Health Check...');
  
  const pythonPort = 5001;
  console.log(`Checking Python health at http://localhost:${pythonPort}/health`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${pythonPort}/health`, (res) => {
        console.log(`Python health check status code: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => {
            data += chunk;
          });
          res.on('end', () => {
            console.log('Python health check response:', data);
            try {
              const jsonResponse = JSON.parse(data);
              const isHealthy = jsonResponse.status === 'healthy' || jsonResponse.status === 'ok';
              console.log(`Python health parsed result: ${isHealthy}`);
              resolve(isHealthy);
            } catch (e) {
              console.error('Failed to parse health check JSON:', e);
              resolve(false);
            }
          });
        } else {
          reject(new Error(`Python health check failed with status ${res.statusCode}`));
        }
      });

      req.on('error', (error) => {
        console.error('Python health check request error:', error);
        resolve(false);
      });

      req.setTimeout(5000, () => {
        console.error('Python health check timeout');
        req.destroy();
        resolve(false);
      });
    });

    console.log(`✅ Python health check result: ${response}\n`);
    return response;
  } catch (error) {
    console.error('❌ Python health check error:', error);
    console.log('');
    return false;
  }
}

// Test n8n health check exactly as dockerSetup.cjs does
async function testN8nHealth() {
  console.log('🔄 Testing n8n Health Check...');
  
  const n8nPort = 5678;
  console.log(`Checking n8n health at http://localhost:${n8nPort}`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${n8nPort}`, (res) => {
        console.log(`n8n health check status code: ${res.statusCode}`);
        
        // n8n returns 200 on the root path when healthy
        if (res.statusCode === 200) {
          console.log('n8n health check: SUCCESS');
          resolve({ success: true });
        } else {
          reject(new Error(`N8N health check failed with status ${res.statusCode}`));
        }
      });
      
      req.on('error', (error) => {
        console.error('n8n health check request error:', error);
        reject(error);
      });
      
      req.setTimeout(5000, () => {
        console.error('n8n health check timeout');
        req.destroy();
        reject(new Error('N8N health check timeout'));
      });
    });
    
    console.log(`✅ n8n health check result: ${response.success}\n`);
    return response;
  } catch (error) {
    console.error('❌ n8n health check error:', error);
    console.log('');
    return { success: false, error: error.message };
  }
}

// Test Docker ping exactly as dockerSetup.cjs does
async function testDockerPing() {
  console.log('🐳 Testing Docker Connectivity...');
  
  try {
    const Docker = require('dockerode');
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    
    // Try to find working Docker socket (same logic as dockerSetup.cjs)
    const socketPaths = [
      process.env.DOCKER_HOST ? process.env.DOCKER_HOST.replace('unix://', '') : null,
      path.join(os.homedir(), '.docker', 'run', 'docker.sock'),
      path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
      path.join(os.homedir(), '.docker', 'docker.sock'),
      '/var/run/docker.sock',
      '/run/docker.sock',
      '/mnt/wsl/docker-desktop/docker.sock',
      path.join(os.homedir(), '.colima', 'docker.sock'),
      path.join(os.homedir(), '.rd', 'docker.sock')
    ].filter(Boolean);
    
    let workingSocket = null;
    let docker = null;
    
    for (const socketPath of socketPaths) {
      if (fs.existsSync(socketPath)) {
        try {
          docker = new Docker({ socketPath });
          await docker.ping();
          workingSocket = socketPath;
          console.log(`✅ Found working Docker socket: ${socketPath}`);
          break;
        } catch (error) {
          console.log(`❌ Socket not working: ${socketPath} - ${error.message}`);
        }
      } else {
        console.log(`❌ Socket not found: ${socketPath}`);
      }
    }
    
    if (workingSocket) {
      console.log('✅ Docker is running and accessible\n');
      return true;
    } else {
      console.log('❌ No working Docker socket found\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Docker test error:', error);
    console.log('');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Running the same health checks that ClaraVerse uses...\n');
  
  const dockerRunning = await testDockerPing();
  
  if (!dockerRunning) {
    console.log('🚨 Docker is not running - no point testing services');
    return;
  }
  
  const pythonHealth = await testPythonHealth();
  const n8nHealth = await testN8nHealth();
  
  console.log('=== SUMMARY ===');
  console.log(`🐳 Docker: ${dockerRunning ? '✅ Running' : '❌ Not Running'}`);
  console.log(`🐍 Python API: ${pythonHealth ? '✅ Healthy' : '❌ Unhealthy'}`);
  console.log(`🔄 n8n: ${n8nHealth.success ? '✅ Healthy' : '❌ Unhealthy'}`);
  
  console.log('\n=== EXPECTED CLARAVERSE RESULT ===');
  console.log({
    dockerAvailable: dockerRunning,
    pythonAvailable: pythonHealth,
    n8nAvailable: n8nHealth.success,
    ports: {
      python: 5001,
      n8n: 5678,
      ollama: 11434
    }
  });
}

runAllTests().catch(console.error);
