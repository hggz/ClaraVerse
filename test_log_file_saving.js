#!/usr/bin/env node

/**
 * Test script to verify enhanced logging with file saving
 */

const { FlowExecutor } = require('./dist/shared/FlowEngine/FlowExecutor.js');
const { NodeRegistry } = require('./dist/shared/FlowEngine/NodeRegistry.js');
const fs = require('fs');
const path = require('path');

async function testLogFileSaving() {
  console.log('🧪 Testing Enhanced Logging with File Saving');
  console.log('=' .repeat(50));

  try {
    // Check if execution_logs directory exists
    const logsDir = path.join(__dirname, 'execution_logs');
    console.log(`📁 Logs directory: ${logsDir}`);
    
    if (!fs.existsSync(logsDir)) {
      console.log('📁 Creating logs directory...');
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // List existing files before test
    const filesBefore = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
    console.log(`📊 Existing log files: ${filesBefore.length}`);

    // Create a simple test workflow
    const testFlow = {
      id: 'test-log-saving-workflow',
      name: 'Test Log File Saving',
      nodes: [
        {
          id: 'input1',
          name: 'Test Input',
          type: 'input',
          data: { value: 'Hello World' }
        },
        {
          id: 'output1',
          name: 'Test Output',
          type: 'output',
          data: {}
        }
      ],
      connections: []
    };

    const nodeRegistry = new NodeRegistry();
    
    // Initialize FlowExecutor with enhanced logging enabled
    const executor = new FlowExecutor(nodeRegistry, {
      workflowId: testFlow.id,
      workflowName: testFlow.name,
      enableEnhancedLogging: true,
      onWorkflowLog: (log) => {
        console.log('🔔 Workflow log callback received:', {
          workflowName: log.workflowName,
          status: log.status,
          duration: log.duration,
          nodeCount: log.nodeCount,
          logEntries: log.logs.length
        });
      }
    });

    console.log('\n🚀 Executing test workflow...');
    
    // Execute the workflow
    const result = await executor.executeFlow(testFlow, { input1: 'Hello World' });
    
    console.log('✅ Workflow execution completed');
    console.log('📤 Result:', result);

    // Wait a moment for file writing to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for new log files
    const filesAfter = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
    console.log(`📊 Log files after test: ${filesAfter.length}`);
    
    const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
    
    if (newFiles.length > 0) {
      console.log('🎉 SUCCESS: New log file(s) created:');
      newFiles.forEach(file => {
        console.log(`  📄 ${file}`);
        
        // Read and validate the log file
        const filePath = path.join(logsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const logData = JSON.parse(content);
        
        console.log(`  📋 Workflow: ${logData.workflowName}`);
        console.log(`  📊 Status: ${logData.status}`);
        console.log(`  ⏱️  Duration: ${logData.duration}ms`);
        console.log(`  📝 Log entries: ${logData.logs.length}`);
        console.log(`  📁 File size: ${(content.length / 1024).toFixed(2)} KB`);
      });
    } else {
      console.log('❌ FAILED: No new log files were created');
      console.log('💡 This suggests the file saving functionality is not working');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📄 Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testLogFileSaving().catch(console.error);
}

module.exports = { testLogFileSaving };
