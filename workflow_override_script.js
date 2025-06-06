/**
 * Test script to override workflow contents
 * This demonstrates how to use the sync functionality
 */

// Sample workflow content to override "basic_input"
const newBasicInputWorkflow = {
  "id": "1749181106265-6rs1e5uwq", // Your basic_input workflow ID
  "name": "basic_input_updated",
  "description": "Updated basic input workflow with new functionality",
  "nodes": [
    {
      "id": "start-node",
      "type": "Start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Start Node",
        "description": "This is the updated start node"
      }
    },
    {
      "id": "process-node",
      "type": "Process",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Process Input",
        "description": "Process the input data with new logic",
        "settings": {
          "operation": "transform",
          "parameters": {
            "field": "input_text",
            "transformation": "uppercase"
          }
        }
      }
    },
    {
      "id": "output-node",
      "type": "Output",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "Output Result",
        "description": "Output the processed result"
      }
    }
  ],
  "connections": [
    {
      "id": "connection-1",
      "source": "start-node",
      "target": "process-node"
    },
    {
      "id": "connection-2",
      "source": "process-node",
      "target": "output-node"
    }
  ],
  "tags": ["input", "basic", "updated"],
  "createdAt": "2024-12-08T00:00:00.000Z",
  "updatedAt": new Date().toISOString(),
  "metadata": {
    "version": "2.0",
    "lastModifiedBy": "sync-system"
  }
};

// Sample workflow content to override "my_awesome_workflow2"
const newAwesomeWorkflow = {
  "id": "1749182392516-ju6lhmyge", // Your my_awesome_workflow2 workflow ID
  "name": "my_awesome_workflow2_enhanced",
  "description": "Enhanced awesome workflow with additional features",
  "nodes": [
    {
      "id": "input-node",
      "type": "Input",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "Input Source",
        "description": "Enhanced input with validation"
      }
    },
    {
      "id": "validation-node",
      "type": "Validation",
      "position": { "x": 200, "y": 50 },
      "data": {
        "label": "Data Validation",
        "description": "Validate input data structure"
      }
    },
    {
      "id": "processing-node",
      "type": "Processing",
      "position": { "x": 350, "y": 50 },
      "data": {
        "label": "Advanced Processing",
        "description": "Process data with enhanced algorithms"
      }
    },
    {
      "id": "output-node",
      "type": "Output",
      "position": { "x": 500, "y": 50 },
      "data": {
        "label": "Enhanced Output",
        "description": "Output with formatting and validation"
      }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "source": "input-node",
      "target": "validation-node"
    },
    {
      "id": "conn-2",
      "source": "validation-node",
      "target": "processing-node"
    },
    {
      "id": "conn-3",
      "source": "processing-node",
      "target": "output-node"
    }
  ],
  "tags": ["awesome", "enhanced", "v2"],
  "createdAt": "2024-12-08T00:00:00.000Z",
  "updatedAt": new Date().toISOString(),
  "metadata": {
    "version": "2.1",
    "lastModifiedBy": "sync-system",
    "features": ["validation", "enhanced-processing", "formatted-output"]
  }
};

// Function to override a workflow via the browser console
function overrideWorkflow(workflowData) {
  // Open IndexedDB
  const request = indexedDB.open('clara_db', 8);
  
  request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['agent_workflows'], 'readwrite');
    const store = transaction.objectStore('agent_workflows');
    
    // Update the workflow
    const updateRequest = store.put(workflowData);
    
    updateRequest.onsuccess = function() {
      console.log(`✅ Successfully updated workflow: ${workflowData.name}`);
      console.log('📝 Updated workflow data:', workflowData);
      console.log('🔄 Refresh your ClaraVerse UI to see the changes');
    };
    
    updateRequest.onerror = function() {
      console.error(`❌ Failed to update workflow: ${workflowData.name}`);
    };
  };
  
  request.onerror = function() {
    console.error('❌ Failed to open database');
  };
}

// Instructions for use:
console.log(`
🚀 ClaraVerse Workflow Override Script
=====================================

To override your workflows, use these commands in the browser console:

1. Override "basic_input" workflow:
   overrideWorkflow(${JSON.stringify(newBasicInputWorkflow, null, 2)});

2. Override "my_awesome_workflow2" workflow:
   overrideWorkflow(${JSON.stringify(newAwesomeWorkflow, null, 2)});

3. Or use the variables directly:
   overrideWorkflow(newBasicInputWorkflow);
   overrideWorkflow(newAwesomeWorkflow);

After running these commands, refresh your ClaraVerse UI to see the changes!
`);

// Make the functions and data available globally
window.overrideWorkflow = overrideWorkflow;
window.newBasicInputWorkflow = newBasicInputWorkflow;
window.newAwesomeWorkflow = newAwesomeWorkflow;
