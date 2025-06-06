/**
 * 🔍 Sync File Detection Diagnostic
 * 
 * Run this in your ClaraVerse browser console to debug why Force Update button isn't appearing
 */

console.log('🔍 Diagnosing sync file detection for my_awesome_workflow2...');

async function diagnosticCheck() {
  const workflowId = '1749182392516-ju6lhmyge';
  const workflowName = 'my_awesome_workflow2';
  const expectedFileName = `${workflowName}_${workflowId}.json`;
  
  console.log('📋 Target workflow details:', {
    id: workflowId,
    name: workflowName,
    expectedFileName: expectedFileName
  });
  
  // 1. Check if sync file exists via HTTP
  console.log('🌐 Step 1: Checking if sync file exists via HTTP...');
  try {
    const response = await fetch(`/workflow_sync/${expectedFileName}`);
    console.log('📄 HTTP Response:', {
      status: response.status,
      ok: response.ok,
      url: response.url
    });
    
    if (response.ok) {
      const content = await response.json();
      console.log('✅ Sync file found via HTTP:', {
        name: content.name,
        id: content.id,
        nodes: content.nodes?.length,
        connections: content.connections?.length
      });
    } else {
      console.log('❌ Sync file NOT found via HTTP');
    }
  } catch (error) {
    console.log('❌ HTTP fetch error:', error.message);
  }
  
  // 2. Check sync directory in localStorage
  console.log('\n💾 Step 2: Checking localStorage sync directory...');
  const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
  const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
  
  console.log('📁 Sync directory contents:', {
    totalEntries: Object.keys(syncDir).length,
    keys: Object.keys(syncDir),
    hasTargetWorkflow: syncDir.hasOwnProperty(workflowId)
  });
  
  if (syncDir[workflowId]) {
    const entry = syncDir[workflowId];
    console.log('✅ Found entry in sync directory:', {
      name: entry.name,
      lastSync: entry.lastSync,
      workflowName: entry.workflow?.name,
      workflowId: entry.workflow?.id
    });
  } else {
    console.log('❌ No entry found in sync directory for workflow ID:', workflowId);
  }
  
  // 3. Test the checkSyncFileExists logic manually
  console.log('\n🔧 Step 3: Testing sync file detection logic...');
  
  // Simulate the checkSyncFileExists logic
  const fileNameWithoutExt = expectedFileName.replace('.json', '');
  const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
  
  if (lastUnderscoreIndex > -1) {
    const extractedWorkflowId = fileNameWithoutExt.substring(lastUnderscoreIndex + 1);
    const extractedWorkflowName = fileNameWithoutExt.substring(0, lastUnderscoreIndex);
    
    console.log('🔍 Filename parsing:', {
      fileName: expectedFileName,
      fileNameWithoutExt: fileNameWithoutExt,
      lastUnderscoreIndex: lastUnderscoreIndex,
      extractedWorkflowId: extractedWorkflowId,
      extractedWorkflowName: extractedWorkflowName,
      idsMatch: extractedWorkflowId === workflowId,
      namesMatch: extractedWorkflowName === workflowName
    });
    
    // Check if sync directory has the workflow
    if (syncDir[extractedWorkflowId]) {
      const syncEntry = syncDir[extractedWorkflowId];
      const nameMatches = syncEntry.workflow && 
        (syncEntry.workflow.name === extractedWorkflowName || 
         syncEntry.workflow.name.includes(extractedWorkflowName) ||
         extractedWorkflowName.includes(syncEntry.workflow.name));
         
      console.log('✅ Sync detection result:', {
        syncEntryExists: true,
        hasWorkflow: !!syncEntry.workflow,
        syncEntryName: syncEntry.workflow?.name,
        nameMatches: nameMatches,
        shouldShowForceUpdate: nameMatches
      });
    } else {
      console.log('❌ No sync entry found for extracted workflow ID');
    }
  }
  
  // 4. Setup sync directory if needed
  console.log('\n🔧 Step 4: Setting up sync directory...');
  try {
    const response = await fetch(`/workflow_sync/${expectedFileName}`);
    if (response.ok) {
      const workflowData = await response.json();
      
      // Force the sync directory entry
      syncDir[workflowId] = {
        name: workflowData.name,
        lastSync: new Date().toISOString(),
        workflow: workflowData
      };
      
      localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
      
      console.log('✅ Sync directory updated!');
      console.log('🔄 Refresh the WorkflowManager or click somewhere to trigger re-render');
      
      // Test the detection again
      const newSyncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
      if (newSyncDir[workflowId]) {
        console.log('🎯 Verification: Sync entry now exists:', {
          name: newSyncDir[workflowId].name,
          hasWorkflow: !!newSyncDir[workflowId].workflow
        });
      }
    }
  } catch (error) {
    console.log('❌ Setup failed:', error);
  }
  
  console.log(`
🎯 SUMMARY:
1. Check if the sync file exists via HTTP
2. Verify sync directory has the entry  
3. Test filename parsing logic
4. Setup sync directory if needed

If all steps pass, the Force Update button should appear.
Try refreshing the WorkflowManager or switching between tabs.
  `);
}

diagnosticCheck();
