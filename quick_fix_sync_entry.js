// Quick check of sync directory vs database
console.log('🔍 Quick sync directory vs database check...');

// Check sync directory
const SYNC_DIR_KEY = 'clara_workflow_sync_directory';
const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');

console.log('📁 Sync Directory Status:', {
    totalEntries: Object.keys(syncDir).length,
    workflowIds: Object.keys(syncDir),
    hasMyAwesomeWorkflow2: syncDir['1749182392516-ju6lhmyge'] ? '✅' : '❌'
});

if (syncDir['1749182392516-ju6lhmyge']) {
    const entry = syncDir['1749182392516-ju6lhmyge'];
    console.log('🎯 Found sync entry:', {
        name: entry.name,
        lastSync: entry.lastSync,
        workflowName: entry.workflow?.name,
        workflowId: entry.workflow?.id
    });
} else {
    console.log('❌ Missing sync entry for my_awesome_workflow2');
    console.log('💡 This is why the Force Update button is not appearing!');
    
    // Let's add it manually
    console.log('🔧 Adding sync entry manually...');
    
    // Fetch the workflow file and add to sync directory
    fetch('/workflow_sync/my_awesome_workflow2_1749182392516-ju6lhmyge.json')
        .then(response => response.json())
        .then(workflowData => {
            syncDir[workflowData.id] = {
                name: workflowData.name,
                lastSync: new Date().toISOString(),
                workflow: workflowData
            };
            
            localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
            
            console.log('✅ Sync entry added! Try refreshing the WorkflowManager now.');
            console.log('🎯 The Force Update button should now appear for my_awesome_workflow2');
        })
        .catch(error => {
            console.error('❌ Failed to add sync entry:', error);
        });
}

console.log('\n🎯 This should fix the Force Update button issue!');
