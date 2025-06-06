/**
 * 🧪 BROWSER CONSOLE TEST for Workflow Sync
 * 
 * INSTRUCTIONS:
 * 1. Open your ClaraVerse application in browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Run it to test the workflow sync system
 * 
 * This will test the force update functionality directly in your ClaraVerse session
 */

console.log('🧪 Starting ClaraVerse Workflow Sync Test...');

// Test workflow data - this matches your workflow_sync file
const testWorkflow = {
  "id": "1749182392516-ju6lhmyge",
  "name": "my_awesome_workflow2",
  "nodes": [
    {
      "id": "input-1",
      "type": "input",
      "name": "Test Input",
      "position": {
        "x": 100,
        "y": 100
      },
      "data": {
        "inputType": "text",
        "value": "Hello from sync file - updated!"
      },
      "inputs": [],
      "outputs": [
        {
          "id": "output",
          "name": "Value",
          "type": "output",
          "dataType": "any"
        }
      ],
      "metadata": {
        "tags": ["input", "basic", "source"]
      }
    },
    {
      "id": "output-1",
      "type": "output",
      "name": "Test Output",
      "position": {
        "x": 400,
        "y": 100
      },
      "data": {},
      "inputs": [
        {
          "id": "input",
          "name": "Value",
          "type": "input",
          "dataType": "any",
          "required": true
        }
      ],
      "outputs": [],
      "metadata": {
        "tags": ["output", "basic", "sink"]
      }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "sourceNodeId": "input-1",
      "sourcePortId": "output",
      "targetNodeId": "output-1",
      "targetPortId": "input"
    }
  ],
  "variables": [],
  "settings": {
    "name": "my_awesome_workflow2",
    "version": "1.2.0",
    "description": "Test workflow with proper connection format - version 2"
  },
  "createdAt": "2025-06-06T04:00:00.191Z",
  "updatedAt": new Date().toISOString(),
  "version": "1.2.0",
  "tags": ["test", "sync", "simple", "v2"]
};

async function testWorkflowSync() {
  try {
    console.log('📊 Step 1: Checking current workflow in database...');
    
    // Open database
    const dbRequest = indexedDB.open('clara_db', 8);
    
    dbRequest.onsuccess = async function(event) {
      const db = event.target.result;
      const transaction = db.transaction(['agent_workflows'], 'readwrite');
      const store = transaction.objectStore('agent_workflows');
      
      // Get current workflow
      const getRequest = store.get(testWorkflow.id);
      
      getRequest.onsuccess = function(getEvent) {
        const currentWorkflow = getEvent.target.result;
        
        console.log('📋 CURRENT WORKFLOW:', {
          exists: !!currentWorkflow,
          name: currentWorkflow?.name || 'N/A',
          nodes: currentWorkflow?.nodes?.length || 0,
          connections: currentWorkflow?.connections?.length || 0,
          updatedAt: currentWorkflow?.updatedAt || 'N/A'
        });
        
        console.log('📊 Step 2: Testing connection validation...');
        
        // Test the connection format manually
        if (testWorkflow.connections && testWorkflow.connections.length > 0) {
          const conn = testWorkflow.connections[0];
          console.log('🔗 Test connection structure:', {
            id: conn.id,
            sourceNodeId: conn.sourceNodeId,
            sourcePortId: conn.sourcePortId,
            targetNodeId: conn.targetNodeId,
            targetPortId: conn.targetPortId,
            hasSourceNodeId: !!conn.sourceNodeId,
            hasTargetNodeId: !!conn.targetNodeId
          });
          
          // Check if nodes exist
          const sourceNode = testWorkflow.nodes.find(n => n.id === conn.sourceNodeId);
          const targetNode = testWorkflow.nodes.find(n => n.id === conn.targetNodeId);
          
          console.log('🎯 Node validation:', {
            sourceNodeExists: !!sourceNode,
            sourceNodeId: sourceNode?.id,
            targetNodeExists: !!targetNode,
            targetNodeId: targetNode?.id
          });
        }
        
        console.log('📊 Step 3: Attempting direct database update...');
        
        // Try to save the workflow directly
        const putRequest = store.put(testWorkflow);
        
        putRequest.onsuccess = function() {
          console.log('✅ Direct database update SUCCESS!');
          
          // Verify by re-reading
          const verifyRequest = store.get(testWorkflow.id);
          verifyRequest.onsuccess = function(verifyEvent) {
            const verifiedWorkflow = verifyEvent.target.result;
            
            console.log('🔍 VERIFICATION RESULT:', {
              name: verifiedWorkflow?.name,
              nodes: verifiedWorkflow?.nodes?.length,
              connections: verifiedWorkflow?.connections?.length,
              updatedAt: verifiedWorkflow?.updatedAt
            });
            
            if (verifiedWorkflow?.name === testWorkflow.name) {
              console.log('🎉 SUCCESS! Workflow was updated successfully!');
              console.log('💡 The force update should work. Try refreshing the ClaraVerse UI.');
            } else {
              console.log('❌ Update failed or data was corrupted');
            }
          };
        };
        
        putRequest.onerror = function(errorEvent) {
          console.log('❌ Direct database update FAILED:', errorEvent);
        };
      };
      
      getRequest.onerror = function() {
        console.log('❌ Failed to get current workflow');
      };
    };
    
    dbRequest.onerror = function() {
      console.log('❌ Failed to open database');
    };
    
  } catch (error) {
    console.log('❌ Test error:', error);
  }
}

// Also test sync directory update
function testSyncDirectory() {
  console.log('📁 Step 4: Testing sync directory...');
  
  try {
    const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
    const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
    
    // Update sync directory
    syncDir[testWorkflow.id] = {
      name: testWorkflow.name,
      lastSync: new Date().toISOString(),
      workflow: testWorkflow
    };
    
    localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
    
    console.log('✅ Sync directory updated successfully!');
    console.log('📋 Sync directory now contains:', Object.keys(syncDir));
    
    // Check if WorkflowSyncService exists and can be used
    if (typeof window !== 'undefined' && window.WorkflowSyncService) {
      console.log('🔧 WorkflowSyncService is available, testing force update...');
      
      window.WorkflowSyncService.forceUpdateFromSync(testWorkflow.id, `${testWorkflow.name}_${testWorkflow.id}.json`)
        .then(result => {
          console.log('🚀 WorkflowSyncService.forceUpdateFromSync result:', result);
        })
        .catch(error => {
          console.log('❌ WorkflowSyncService.forceUpdateFromSync error:', error);
        });
    } else {
      console.log('⚠️ WorkflowSyncService not available in global scope');
      console.log('💡 This is normal - try using the Force Update button in the UI instead');
    }
    
  } catch (error) {
    console.log('❌ Sync directory test error:', error);
  }
}

// Run the tests
console.log('🎬 Running workflow sync tests...');
testWorkflowSync();
setTimeout(testSyncDirectory, 1000);

console.log(`
🎯 WHAT TO EXPECT:
1. Direct database update should succeed
2. Sync directory should be updated  
3. Force Update button should appear in ClaraVerse UI
4. Clicking Force Update should apply the changes

📋 NEXT STEPS:
1. Check the console output above
2. Go to your ClaraVerse Workflow Manager
3. Find "my_awesome_workflow2" workflow
4. Click the three dots menu
5. Look for "Force Update" button
6. Click it to apply the changes
7. Open the workflow to verify the changes
`);
