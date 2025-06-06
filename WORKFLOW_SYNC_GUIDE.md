# 🔄 ClaraVerse Workflow Sync System

This system provides a streamlined way to sync, override, and manage your ClaraVerse workflows with easy UI refresh capabilities.

## 🚀 Quick Start

### Method 1: Using the Workflow Override Tool (Recommended)

1. **Open the Override Tool**
   ```
   Open: /Users/hugogonzalez/Documents/code/projects/llms/ClaraVerse/workflow_override_tool.html
   ```

2. **Check Your Current Workflows**
   - Click "Check Current Workflows" to see your existing workflows
   - Your workflows should show up:
     - `basic_input` (ID: 1749181106265-6rs1e5uwq)
     - `my_awesome_workflow2` (ID: 1749182392516-ju6lhmyge)

3. **Override Workflows**
   - **Option A**: Use the pre-loaded sample workflows (click "Load Sample")
   - **Option B**: Upload your own JSON files (click "Upload JSON File")
   - **Option C**: Edit the JSON directly in the text areas
   - Click "Override Workflow" to apply changes

4. **Refresh ClaraVerse**
   - Go back to your ClaraVerse application
   - Refresh the page or reload the workflow manager
   - Your changes should be visible in the node viewer

### Method 2: Using the New Sync Button in ClaraVerse UI

1. **Access Workflow Manager**
   - Open your ClaraVerse application
   - Go to the Workflow Manager (Agent Builder section)

2. **Use the Sync Feature**
   - Find your workflow in the list
   - Click the three dots (⋮) menu
   - Select "Sync" from the dropdown menu
   - The system will:
     - Export the workflow to sync directory (first time)
     - Check for updates and apply them (subsequent times)

3. **External Editing**
   - When you sync, a JSON file will be downloaded
   - Edit this file externally with your preferred editor
   - Use the sync feature again to apply changes

### Method 3: Browser Console Commands

1. **Open Developer Tools**
   - In your ClaraVerse browser tab, press F12
   - Go to Console tab

2. **Use Override Commands**
   ```javascript
   // Check current workflows
   const request = indexedDB.open('clara_db', 8);
   request.onsuccess = function(event) {
     const db = event.target.result;
     const transaction = db.transaction(['agent_workflows'], 'readonly');
     const store = transaction.objectStore('agent_workflows');
     store.getAll().onsuccess = function(event) {
       console.log('Workflows:', event.target.result);
     };
   };

   // Override a workflow (example for basic_input)
   const newWorkflow = {
     "id": "1749181106265-6rs1e5uwq",
     "name": "basic_input_updated",
     "description": "Updated workflow",
     // ... your workflow data
   };
   
   const updateRequest = indexedDB.open('clara_db', 8);
   updateRequest.onsuccess = function(event) {
     const db = event.target.result;
     const transaction = db.transaction(['agent_workflows'], 'readwrite');
     const store = transaction.objectStore('agent_workflows');
     store.put(newWorkflow).onsuccess = function() {
       console.log('Workflow updated successfully!');
     };
   };
   ```

## 📁 File Structure

```
ClaraVerse/
├── workflow_sync/                    # Sync directory for workflow files
├── workflow_override_tool.html       # Easy-to-use override tool
├── workflow_override_script.js       # Sample override scripts
├── workflow_browser_check.html       # Workflow inspection tool
└── src/
    ├── services/
    │   └── workflowSyncService.ts    # Sync service implementation
    └── components/
        └── AgentBuilder/
            └── WorkflowManager.tsx   # Updated with sync functionality
```

## 🔧 Workflow JSON Structure

Your workflows should follow this structure:

```json
{
  "id": "workflow-id-here",
  "name": "Workflow Name",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node-id",
      "type": "NodeType",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Node Label",
        "description": "Node description"
      }
    }
  ],
  "connections": [
    {
      "id": "connection-id",
      "source": "source-node-id",
      "target": "target-node-id"
    }
  ],
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-12-08T00:00:00.000Z",
  "updatedAt": "2024-12-08T12:00:00.000Z",
  "metadata": {
    "version": "1.0",
    "lastModifiedBy": "user"
  }
}
```

## 🎯 Your Specific Workflows

### Basic Input Workflow
- **ID**: `1749181106265-6rs1e5uwq`
- **Current Name**: `basic_input`
- **Use Case**: Override this workflow to test basic input processing changes

### My Awesome Workflow 2
- **ID**: `1749182392516-ju6lhmyge`
- **Current Name**: `my_awesome_workflow2`
- **Use Case**: Override this workflow to test advanced workflow features

## 🔄 Sync Workflow

1. **First Sync**: Exports workflow to sync directory and downloads JSON file
2. **Subsequent Syncs**: Compares timestamps and updates the newer version
3. **Conflict Resolution**: Sync directory version takes precedence if newer
4. **UI Refresh**: Automatically triggers workflow list refresh when updated

## 💡 Tips & Best Practices

1. **Always Backup**: Export all workflows before making changes
2. **Validate JSON**: Use the validation features in the override tool
3. **Test Incrementally**: Make small changes and test frequently
4. **Version Control**: Use meaningful version numbers in metadata
5. **Descriptive Names**: Update workflow names when making significant changes

## 🐛 Troubleshooting

### Workflow Not Updating
1. Check the browser console for errors
2. Ensure JSON is valid
3. Verify the workflow ID matches exactly
4. Clear browser cache and reload

### Sync Button Not Visible
1. Ensure you're in the Workflow Manager
2. Look for the three dots (⋮) menu next to each workflow
3. The sync option should be between Export and Star

### Database Connection Issues
1. Ensure you're on the same domain as ClaraVerse
2. Check if IndexedDB is enabled in your browser
3. Try refreshing the page

## 🚀 Advanced Usage

### Batch Override Multiple Workflows
```javascript
// Example: Override multiple workflows at once
const workflows = [
  { id: "1749181106265-6rs1e5uwq", name: "basic_input_v2", ... },
  { id: "1749182392516-ju6lhmyge", name: "awesome_workflow_v3", ... }
];

workflows.forEach(workflow => {
  // Use the override function for each workflow
  overrideWorkflow(workflow);
});
```

### Export/Import Workflow Sets
```javascript
// Export all workflows
function exportAllWorkflows() {
  // Implementation in workflow_override_tool.html
}

// Import workflow set
function importWorkflowSet(jsonData) {
  const workflows = JSON.parse(jsonData);
  workflows.forEach(workflow => {
    overrideWorkflow(workflow);
  });
}
```

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your workflow JSON structure
3. Ensure all required fields are present
4. Test with the sample workflows first

Happy workflow syncing! 🎉
