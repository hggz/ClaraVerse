/**
 * 🔍 IMMEDIATE DIAGNOSTIC - Run this in ClaraVerse browser console
 */

console.log('🔍 Diagnosing sync file detection for my_awesome_workflow2...');

async function runDiagnostic() {
  const workflowId = '1749182392516-ju6lhmyge';
  const workflowName = 'my_awesome_workflow2';
  const expectedFileName = `${workflowName}_${workflowId}.json`;
  
  console.log('📋 Target Details:', {
    id: workflowId,
    name: workflowName,
    expectedFileName: expectedFileName
  });
  
  // Check sync directory
  const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
  let syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
  
  console.log('💾 Current Sync Directory:', {
    totalEntries: Object.keys(syncDir).length,
    keys: Object.keys(syncDir),
    hasTargetWorkflow: syncDir.hasOwnProperty(workflowId)
  });
  
  // Check if sync file exists via HTTP
  try {
    const response = await fetch(`/workflow_sync/${expectedFileName}`);
    console.log('🌐 HTTP Check:', {
      status: response.status,
      ok: response.ok
    });
    
    if (response.ok) {
      const workflowData = await response.json();
      console.log('✅ Sync file found:', {
        name: workflowData.name,
        id: workflowData.id,
        nodes: workflowData.nodes?.length,
        connections: workflowData.connections?.length
      });
      
      // Force update sync directory
      syncDir[workflowId] = {
        name: workflowData.name,
        lastSync: new Date().toISOString(),
        workflow: workflowData
      };
      
      localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
      console.log('✅ Sync directory updated!');
      
      // Verify
      const newSyncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
      console.log('🔍 Verification:', {
        entryExists: !!newSyncDir[workflowId],
        entryName: newSyncDir[workflowId]?.name,
        hasWorkflow: !!newSyncDir[workflowId]?.workflow
      });
      
    } else {
      console.log('❌ Sync file NOT accessible via HTTP');
    }
  } catch (error) {
    console.log('❌ HTTP Error:', error.message);
  }
  
  console.log(`
🎯 NEXT STEPS:
1. The sync directory should now be set up
2. Go to Workflow Manager
3. Find "my_awesome_workflow2"  
4. Click three dots menu
5. Force Update button should appear

If it still doesn't appear, there might be a React re-render issue.
Try clicking on a different workflow and back to refresh the component.
  `);
}

runDiagnostic();
