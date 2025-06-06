#!/usr/bin/env node

/**
 * Test script for the Simple Data Processing Demo workflow
 * Tests data transformation using only built-in node types
 */

const fs = require('fs');
const path = require('path');

// For now, we'll simulate the ClaraVerse execution environment
// In actual usage, you would import the FlowExecutor from ClaraVerse

class SimpleWorkflowTester {
  constructor() {
    this.workflow = null;
  }

  loadWorkflow(filePath) {
    try {
      const workflowData = fs.readFileSync(filePath, 'utf8');
      this.workflow = JSON.parse(workflowData);
      console.log(`✅ Loaded workflow: ${this.workflow.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to load workflow: ${error.message}`);
      return false;
    }
  }

  // Simulate workflow execution logic
  simulateExecution(inputs = {}) {
    if (!this.workflow) {
      console.error('❌ No workflow loaded');
      return;
    }

    console.log('\n🚀 Starting workflow execution simulation...\n');

    // Default test data
    const testData = {
      name: inputs.name || 'Alice Johnson',
      age: inputs.age || 25
    };

    console.log('📥 Input Data:', testData);

    // Simulate node execution
    const results = this.simulateNodeExecution(testData);

    console.log('\n📊 Execution Results:');
    console.log(JSON.stringify(results, null, 2));

    return results;
  }

  simulateNodeExecution(data) {
    // Simulate the workflow logic
    const { name, age } = data;
    const isAdult = age >= 18;

    // JSON Builder simulation
    const jsonObject = {
      name: name,
      age: age,
      timestamp: new Date().toISOString(),
      isAdult: isAdult
    };

    console.log('\n🔧 JSON Builder Output:', jsonObject);

    // If-else logic simulation
    console.log(`\n🔀 Age Check: ${age} >= 18 = ${isAdult}`);

    // Format based on age
    let finalProfile;
    if (isAdult) {
      finalProfile = {
        profile: `${name} - Adult Profile`,
        age: age,
        status: 'verified_adult',
        permissions: ['full_access', 'voting', 'contracts']
      };
      console.log('✅ Routing to Adult Formatter');
    } else {
      finalProfile = {
        profile: `${name} - Minor Profile`,
        age: age,
        status: 'minor',
        permissions: ['limited_access', 'parental_supervision']
      };
      console.log('⚠️ Routing to Minor Formatter');
    }

    return finalProfile;
  }

  analyzeWorkflow() {
    if (!this.workflow) {
      console.error('❌ No workflow loaded');
      return;
    }

    console.log('\n📋 Workflow Analysis:');
    console.log(`Name: ${this.workflow.name}`);
    console.log(`Description: ${this.workflow.description}`);
    console.log(`Nodes: ${this.workflow.nodes.length}`);
    console.log(`Connections: ${this.workflow.connections.length}`);

    console.log('\n🔧 Node Types Used:');
    const nodeTypes = [...new Set(this.workflow.nodes.map(node => node.type))];
    nodeTypes.forEach(type => {
      const count = this.workflow.nodes.filter(node => node.type === type).length;
      console.log(`  - ${type}: ${count} node(s)`);
    });

    console.log('\n🗂️ Node Details:');
    this.workflow.nodes.forEach(node => {
      console.log(`  ${node.id} (${node.type}): ${node.name}`);
    });

    return {
      nodeCount: this.workflow.nodes.length,
      connectionCount: this.workflow.connections.length,
      nodeTypes: nodeTypes
    };
  }

  runTests() {
    console.log('🧪 Running Test Suite...\n');

    // Test 1: Adult user
    console.log('='.repeat(50));
    console.log('Test 1: Adult User (Age 25)');
    console.log('='.repeat(50));
    this.simulateExecution({ name: 'Alice Johnson', age: 25 });

    // Test 2: Minor user
    console.log('\n' + '='.repeat(50));
    console.log('Test 2: Minor User (Age 16)');
    console.log('='.repeat(50));
    this.simulateExecution({ name: 'Bobby Smith', age: 16 });

    // Test 3: Edge case - exactly 18
    console.log('\n' + '='.repeat(50));
    console.log('Test 3: Edge Case (Age 18)');
    console.log('='.repeat(50));
    this.simulateExecution({ name: 'Carol Davis', age: 18 });

    console.log('\n✅ All tests completed!');
  }
}

// Main execution
function main() {
  console.log('🎯 ClaraVerse Simple Data Processing Demo Tester\n');

  const tester = new SimpleWorkflowTester();
  const workflowPath = path.join(__dirname, 'demo_weather_workflow.json');

  if (tester.loadWorkflow(workflowPath)) {
    tester.analyzeWorkflow();
    tester.runTests();

    console.log('\n📝 Notes:');
    console.log('- This workflow uses only built-in node types');
    console.log('- Can be directly imported into ClaraVerse');
    console.log('- Demonstrates data transformation and conditional logic');
    console.log('- Shows JSON manipulation and output formatting');
  }
}

if (require.main === module) {
  main();
}
