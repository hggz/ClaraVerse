// Debug sync file name matching issue
console.log('🔍 Debugging sync file name matching...');

async function debugSyncFileMatching() {
    // 1. Check actual file content
    console.log('\n📁 Step 1: Checking actual file content...');
    try {
        const response = await fetch('/workflow_sync/my_awesome_workflow2_1749182392516-ju6lhmyge.json');
        const fileContent = await response.json();
        console.log('📄 File content:', {
            name: fileContent.name,
            id: fileContent.id,
            filename: 'my_awesome_workflow2_1749182392516-ju6lhmyge.json'
        });
        
        // Build expected filename from file content
        const expectedFromFile = `${fileContent.name}_${fileContent.id}.json`;
        console.log('🎯 Expected filename from file content:', expectedFromFile);
        
    } catch (error) {
        console.error('❌ Error reading file:', error);
    }
    
    // 2. Check database workflow
    console.log('\n💾 Step 2: Checking database workflow...');
    try {
        const DB_NAME = 'ClaraVerse';
        const request = indexedDB.open(DB_NAME);
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['agent_workflows'], 'readonly');
            const store = transaction.objectStore('agent_workflows');
            
            store.get('1749182392516-ju6lhmyge').onsuccess = function(event) {
                const dbWorkflow = event.target.result;
                if (dbWorkflow) {
                    console.log('💾 Database workflow:', {
                        name: dbWorkflow.name,
                        id: dbWorkflow.id
                    });
                    
                    // Build expected filename from database content
                    const expectedFromDB = `${dbWorkflow.name}_${dbWorkflow.id}.json`;
                    console.log('🎯 Expected filename from database:', expectedFromDB);
                    
                    // Test sync file detection manually
                    console.log('\n🔧 Step 3: Testing sync file detection...');
                    
                    // Simulate WorkflowSyncService.checkSyncFileExists logic
                    const syncDir = JSON.parse(localStorage.getItem('clara_workflow_sync_directory') || '{}');
                    console.log('📁 Sync directory keys:', Object.keys(syncDir));
                    
                    if (syncDir[dbWorkflow.id]) {
                        console.log('✅ Found sync entry for workflow ID');
                        const syncEntry = syncDir[dbWorkflow.id];
                        console.log('📋 Sync entry:', {
                            name: syncEntry.name,
                            workflowName: syncEntry.workflow?.name,
                            workflowId: syncEntry.workflow?.id
                        });
                    } else {
                        console.log('❌ No sync entry found for workflow ID:', dbWorkflow.id);
                    }
                } else {
                    console.log('❌ Workflow not found in database');
                }
            };
        };
    } catch (error) {
        console.error('❌ Error checking database:', error);
    }
}

await debugSyncFileMatching();

console.log('\n🎯 Use this script to identify the exact name matching issue!');
