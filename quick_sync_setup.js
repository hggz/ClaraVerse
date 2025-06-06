/**
 * 🔧 Quick Sync Directory Setup
 * 
 * Copy and paste this into your ClaraVerse browser console to set up the sync directory
 * This will make the Force Update button appear for my_awesome_workflow2
 */

console.log('🔧 Setting up sync directory for my_awesome_workflow2...');

// Load the sync file content and put it in the sync directory
async function setupSyncDirectory() {
  try {
    // Fetch the sync file
    const response = await fetch('/workflow_sync/my_awesome_workflow2_1749182392516-ju6lhmyge.json');
    const workflowData = await response.json();
    
    console.log('📁 Loaded sync file:', {
      name: workflowData.name,
      id: workflowData.id,
      nodes: workflowData.nodes?.length,
      connections: workflowData.connections?.length
    });
    
    // Update the sync directory
    const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
    const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
    
    syncDir[workflowData.id] = {
      name: workflowData.name,
      lastSync: new Date().toISOString(),
      workflow: workflowData
    };
    
    localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
    
    console.log('✅ Sync directory updated successfully!');
    console.log('🎯 Expected filename pattern:', `${workflowData.name}_${workflowData.id}.json`);
    console.log('📋 Sync directory keys:', Object.keys(syncDir));
    
    console.log(`
🚀 SUCCESS! Now do this:
1. Go to your Workflow Manager in ClaraVerse
2. Find "my_awesome_workflow2" 
3. Click the three dots (⋮) menu
4. You should now see "Force Update" button
5. Click it to apply the enhanced workflow!
    `);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('💡 Make sure you are in the ClaraVerse tab and the sync file exists');
  }
}

// Run the setup
setupSyncDirectory();
