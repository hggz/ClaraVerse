/**
 * Test script for the enhanced logging system in FlowExecutor
 */

import { FlowExecutor } from '../src/shared/FlowEngine/FlowExecutor.js';
import { workflowLogger } from '../src/services/workflowLogger.js';

// Mock workflow data for testing
const testWorkflow = {
  nodes: [
    {
      id: 'input-1',
      name: 'Input Node',
      type: 'input',
      position: { x: 100, y: 100 },
      data: { value: 'Hello World' },
      inputs: [],
      outputs: [{ id: 'output', name: 'output', type: 'string' }]
    },
    {
      id: 'process-1',
      name: 'Process Node',
      type: 'text-transform',
      position: { x: 300, y: 100 },
      data: { operation: 'uppercase' },
      inputs: [{ id: 'input', name: 'input', type: 'string' }],
      outputs: [{ id: 'output', name: 'output', type: 'string' }]
    },
    {
      id: 'output-1',
      name: 'Output Node',
      type: 'output',
      position: { x: 500, y: 100 },
      data: {},
      inputs: [{ id: 'input', name: 'input', type: 'string' }],
      outputs: []
    }
  ],
  connections: [
    {
      id: 'conn-1',
      sourceNodeId: 'input-1',
      sourcePortId: 'output',
      targetNodeId: 'process-1',
      targetPortId: 'input'
    },
    {
      id: 'conn-2',
      sourceNodeId: 'process-1',
      sourcePortId: 'output',
      targetNodeId: 'output-1',
      targetPortId: 'input'
    }
  ]
};

async function testEnhancedLogging() {
  console.log('🧪 Testing Enhanced Logging System');
  console.log('=' .repeat(50));

  // Test 1: Basic execution with enhanced logging
  console.log('\n📝 Test 1: Enhanced Logging Enabled');
  const executor = new FlowExecutor({
    workflowId: 'test-workflow-1',
    workflowName: 'Enhanced Logging Test',
    enableEnhancedLogging: true,
    onWorkflowLog: (log) => {
      console.log('\n📊 Workflow Log Received:', {
        status: log.status,
        duration: log.duration,
        nodeCount: log.nodeCount,
        successfulNodes: log.successfulNodes,
        failedNodes: log.failedNodes
      });
    }
  });

  try {
    const result = await executor.executeFlow(
      testWorkflow.nodes,
      testWorkflow.connections,
      { 'Input Node': 'test input' }
    );
    console.log('✅ Execution completed:', result);
  } catch (error) {
    console.error('❌ Execution failed:', error.message);
  }

  // Test 2: Log export functionality
  console.log('\n📝 Test 2: Log Export');
  const currentLog = executor.getCurrentWorkflowLog();
  if (currentLog) {
    console.log('\n📄 Summary Report:');
    console.log(workflowLogger.generateSummaryReport(currentLog));
    
    // Try to export the log
    try {
      await executor.exportCurrentLog();
      console.log('📁 Log export initiated');
    } catch (error) {
      console.error('❌ Log export failed:', error.message);
    }
  }

  // Test 3: Traditional logging (for comparison)
  console.log('\n📝 Test 3: Traditional Logging');
  const traditionalExecutor = new FlowExecutor({
    workflowId: 'test-workflow-2',
    workflowName: 'Traditional Logging Test',
    enableEnhancedLogging: false,
    enableLogging: true
  });

  try {
    const result = await traditionalExecutor.executeFlow(
      testWorkflow.nodes,
      testWorkflow.connections,
      { 'Input Node': 'traditional test' }
    );
    console.log('✅ Traditional execution completed:', result);
    console.log('📜 Traditional logs:', traditionalExecutor.getLogs());
  } catch (error) {
    console.error('❌ Traditional execution failed:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
testEnhancedLogging().catch(console.error);
