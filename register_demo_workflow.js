/**
 * Register Demo Workflow Script
 * 
 * This script adds the demo workflow to ClaraVerse's sync directory
 * so it appears in the workflow list and can be imported/tested.
 * 
 * Run this in the ClaraVerse browser console to register the demo workflow.
 */

console.log('🚀 Registering Simple Data Processing Demo workflow...');

async function registerDemoWorkflow() {
  try {
    // Register both demo workflows
    const workflowFiles = [
      {
        file: '/workflow_sync/simple_demo_workflow.json',
        name: 'Simple Demo Workflow'
      },
      {
        file: '/workflow_sync/demo_weather_workflow.json', 
        name: 'Complex Demo Workflow'
      }
    ];
    
    for (const workflowInfo of workflowFiles) {
      console.log(`📁 Registering ${workflowInfo.name}...`);
      
      // Fetch the demo workflow file
      const response = await fetch(workflowInfo.file);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch ${workflowInfo.name}:`, response.status, response.statusText);
        continue;
      }
      
      const demoWorkflow = await response.json();
    
      
      console.log(`📄 Loaded ${workflowInfo.name}:`, {
        id: demoWorkflow.id,
        name: demoWorkflow.name,
        description: demoWorkflow.description,
        nodeCount: demoWorkflow.nodes?.length || 0,
        connectionCount: demoWorkflow.connections?.length || 0,
        tags: demoWorkflow.metadata?.tags || demoWorkflow.tags || []
      });
    
    // Get the sync directory from localStorage
    const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
    const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
    
    console.log('💾 Current sync directory status:', {
      totalEntries: Object.keys(syncDir).length,
      existingWorkflows: Object.keys(syncDir).map(id => syncDir[id].name),
      hasDemoWorkflow: !!syncDir[demoWorkflow.id]
    });
    
    // Add required fields for ClaraVerse compatibility
    const enhancedWorkflow = {
      ...demoWorkflow,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: demoWorkflow.metadata?.version || "1.0.0",
      tags: demoWorkflow.metadata?.tags || ["demo", "simple"],
      // Ensure nodes have outputs array for ClaraVerse compatibility
      nodes: demoWorkflow.nodes.map(node => ({
        ...node,
        inputs: node.inputs || [],
        outputs: node.outputs || [
          {
            id: "output",
            name: "Output", 
            type: "output",
            dataType: "any",
            description: "Node output"
          }
        ],
        metadata: node.metadata || {
          tags: [node.type],
          documentation: node.data?.description || `${node.type} node`
        }
      })),
      // Add variables and settings if missing
      variables: demoWorkflow.variables || [],
      settings: demoWorkflow.settings || {
        name: demoWorkflow.name,
        version: demoWorkflow.metadata?.version || "1.0.0"
      }
    };
    
    // Register in sync directory
    syncDir[demoWorkflow.id] = {
      name: demoWorkflow.name,
      lastSync: new Date().toISOString(),
      workflow: enhancedWorkflow
    };
    
    // Save back to localStorage
    localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
    
    console.log('✅ Demo workflow successfully registered!');
    console.log('📊 Updated sync directory:', {
      totalEntries: Object.keys(syncDir).length,
      newWorkflowId: demoWorkflow.id,
      newWorkflowName: demoWorkflow.name
    });
    
    // Also try to add to the main workflow storage (agentWorkflowStorage)
    console.log('💾 Attempting to add to main workflow storage...');
    
    // Check if we can access the workflow storage service
    if (typeof window !== 'undefined' && window.agentWorkflowStorage) {
      try {
        const saveResult = await window.agentWorkflowStorage.saveWorkflow(enhancedWorkflow);
        if (saveResult.success) {
          console.log('✅ Also saved to main workflow storage!');
        } else {
          console.log('⚠️ Could not save to main storage:', saveResult.errors);
        }
      } catch (storageError) {
        console.log('⚠️ Main storage not accessible:', storageError.message);
      }
    } else {
      console.log('💡 Main workflow storage not accessible - workflow available in sync directory only');
    }
    
    console.log(`
🎉 REGISTRATION COMPLETE!

📋 What to do next:
1. 🔄 Refresh the ClaraVerse application or reload the page
2. 📂 Go to the Workflow Manager
3. 🔍 Look for "Simple Data Processing Demo" in the workflow list
4. ⚡ Import/open the workflow to test it
5. 🎮 Test the workflow with different name/age inputs

📝 Workflow Features:
• Uses only built-in ClaraVerse node types
• Demonstrates data input, processing, and conditional logic
• Shows JSON building and formatting
• Adult/Minor classification based on age
• Ready for testing with the enhanced logging system

🔧 If the workflow doesn't appear immediately:
• Try switching tabs and coming back
• Check the browser console for any errors
• Verify the workflow appears in the sync directory
    `);
    
  } catch (error) {
    console.error('❌ Registration failed:', error);
    console.log('💡 Make sure you are in the ClaraVerse browser tab and the demo workflow file exists');
  }
}

// Run the registration
registerDemoWorkflow();
