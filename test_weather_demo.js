#!/usr/bin/env node

/**
 * Test script for the Weather Data Processor Demo Workflow
 * Tests the actual ClaraVerse workflow execution with enhanced logging
 */

const path = require('path');
const fs = require('fs');

async function testWeatherWorkflow() {
  console.log('🧪 Testing Weather Data Processor Demo Workflow');
  console.log('=' .repeat(60));

  try {
    // Check if we can import the FlowExecutor (after build)
    let FlowExecutor, NodeRegistry;
    
    try {
      const flowModule = require('./dist/shared/FlowEngine/FlowExecutor.js');
      const registryModule = require('./dist/shared/FlowEngine/NodeRegistry.js');
      FlowExecutor = flowModule.FlowExecutor;
      NodeRegistry = registryModule.NodeRegistry;
    } catch (importError) {
      console.log('⚠️  Built modules not found. Testing with simulated workflow execution...');
      return simulateWorkflowTest();
    }

    // Load the demo workflow
    const workflowPath = path.join(__dirname, 'demo_weather_workflow.json');
    
    if (!fs.existsSync(workflowPath)) {
      throw new Error('Demo workflow file not found. Please ensure demo_weather_workflow.json exists.');
    }

    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    console.log(`📋 Loaded workflow: ${workflowData.name}`);
    console.log(`📄 Description: ${workflowData.description}`);
    console.log(`🎯 Nodes: ${workflowData.nodes.length}`);
    console.log(`🔗 Connections: ${workflowData.connections.length}`);

    // Create executor with enhanced logging
    const nodeRegistry = new NodeRegistry();
    const executor = new FlowExecutor(nodeRegistry, {
      workflowId: workflowData.id,
      workflowName: workflowData.name,
      enableEnhancedLogging: true,
      onWorkflowLog: (log) => {
        console.log('\n📊 Workflow Log Callback Received:');
        console.log(`  🏷️  Workflow: ${log.workflowName}`);
        console.log(`  📈 Status: ${log.status}`);
        console.log(`  ⏱️  Duration: ${log.duration}ms`);
        console.log(`  🎯 Nodes: ${log.successfulNodes}/${log.nodeCount}`);
        console.log(`  📝 Log entries: ${log.logs.length}`);
      }
    });

    console.log('\n🚀 Starting workflow execution...');
    
    // Test different input scenarios
    const testScenarios = [
      {
        name: 'San Francisco - Comfortable',
        inputs: {
          'input-city': 'San Francisco',
          'input-temperature': 22,
          'input-humidity': 65
        }
      },
      {
        name: 'Miami - Hot & Humid',
        inputs: {
          'input-city': 'Miami',
          'input-temperature': 32,
          'input-humidity': 85
        }
      },
      {
        name: 'Chicago - Cold & Dry',
        inputs: {
          'input-city': 'Chicago',
          'input-temperature': 5,
          'input-humidity': 25
        }
      }
    ];

    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(`\n📋 Test Scenario ${i + 1}: ${scenario.name}`);
      console.log('=' .repeat(40));

      try {
        const startTime = Date.now();
        const result = await executor.executeFlow(workflowData, scenario.inputs);
        const executionTime = Date.now() - startTime;

        console.log(`✅ Execution completed in ${executionTime}ms`);
        console.log('📤 Results:');
        console.log(JSON.stringify(result, null, 2));

      } catch (error) {
        console.error(`❌ Scenario ${i + 1} failed:`, error.message);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check log files
    console.log('\n📁 Checking for log files...');
    const logsDir = path.join(__dirname, 'execution_logs');
    
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
      console.log(`📊 Found ${logFiles.length} log files:`);
      logFiles.forEach(file => {
        console.log(`  📄 ${file}`);
      });
    } else {
      console.log('📁 No log files directory found');
    }

    console.log('\n🎉 Weather workflow demo test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📄 Stack trace:', error.stack);
  }
}

// Fallback simulation for when built modules aren't available
async function simulateWorkflowTest() {
  console.log('🎭 Running simulated workflow test...');
  
  const scenarios = [
    { city: 'San Francisco', temp: 22, humidity: 65 },
    { city: 'Miami', temp: 32, humidity: 85 },
    { city: 'Chicago', temp: 5, humidity: 25 }
  ];

  for (const scenario of scenarios) {
    console.log(`\n🏙️  Testing: ${scenario.city}`);
    
    // Simulate temperature conversion
    const fahrenheit = (scenario.temp * 9/5) + 32;
    const tempStatus = scenario.temp > 25 ? 'Hot' : scenario.temp > 15 ? 'Warm' : 'Cold';
    
    // Simulate weather analysis
    let comfort, recommendation;
    if (scenario.temp > 30) {
      comfort = 'Very Hot';
      recommendation = 'Stay hydrated and seek shade';
    } else if (scenario.temp > 25) {
      comfort = 'Comfortable';
      recommendation = 'Perfect weather for outdoor activities';
    } else if (scenario.temp > 15) {
      comfort = 'Cool';
      recommendation = 'Light jacket recommended';
    } else {
      comfort = 'Cold';
      recommendation = 'Dress warmly';
    }

    if (scenario.humidity > 80) {
      recommendation += '. High humidity - expect muggy conditions';
    } else if (scenario.humidity < 30) {
      recommendation += '. Low humidity - stay moisturized';
    }

    const result = {
      city: scenario.city,
      celsius: scenario.temp,
      fahrenheit: Math.round(fahrenheit * 100) / 100,
      humidity: scenario.humidity,
      temperature_status: tempStatus,
      comfort_level: comfort,
      recommendation,
      heat_index: scenario.temp + (scenario.humidity / 10),
      optimal_conditions: scenario.temp >= 18 && scenario.temp <= 26 && scenario.humidity >= 40 && scenario.humidity <= 60
    };

    console.log('✅ Result:', JSON.stringify(result, null, 2));
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎉 Simulated test completed!');
}

// Run the test
if (require.main === module) {
  testWeatherWorkflow().catch(console.error);
}

module.exports = { testWeatherWorkflow };
