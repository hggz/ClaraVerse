// Test workflow sync file HTTP access directly in browser console
console.log('🧪 Testing Workflow Sync File Access...');

async function testWorkflowAccess() {
    const files = [
        '/workflow_sync/basic_input_1749181106265-6rs1e5uwq.json',
        '/workflow_sync/my_awesome_workflow2_1749182392516-ju6lhmyge.json'
    ];

    for (const file of files) {
        console.log(`\n📁 Testing: ${file}`);
        try {
            const response = await fetch(file);
            const text = await response.text();
            
            if (response.ok) {
                try {
                    const json = JSON.parse(text);
                    console.log(`✅ Success: Found JSON with ${Object.keys(json).length} properties`);
                    console.log(`   Name: ${json.name || 'N/A'}`);
                    console.log(`   ID: ${json.id || 'N/A'}`);
                    console.log(`   Nodes: ${json.nodes?.length || 0}`);
                } catch (e) {
                    console.error(`❌ JSON Parse Error: ${e.message}`);
                    console.log(`   First 200 chars: ${text.substring(0, 200)}`);
                }
            } else {
                console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
                console.log(`   Response type: ${response.headers.get('content-type')}`);
                console.log(`   First 200 chars: ${text.substring(0, 200)}`);
            }
        } catch (error) {
            console.error(`❌ Fetch Error: ${error.message}`);
        }
    }
}

// Also test the WorkflowSyncService methods
async function testSyncService() {
    console.log('\n🔧 Testing WorkflowSyncService methods...');
    
    // Test checkSyncFileExists for both workflows
    const workflows = ['basic_input', 'my_awesome_workflow2'];
    
    for (const workflowName of workflows) {
        console.log(`\n📋 Testing sync file detection for: ${workflowName}`);
        
        // Access the WorkflowSyncService (assuming it's available globally or we can import it)
        try {
            // Try to call the service method directly
            const exists = await window.workflowSyncService?.checkSyncFileExists?.(workflowName);
            console.log(`   Sync file exists: ${exists}`);
        } catch (error) {
            console.log(`   Could not access WorkflowSyncService: ${error.message}`);
        }
    }
}

// Run both tests
await testWorkflowAccess();
await testSyncService();

console.log('\n✨ Testing complete! Copy and paste this entire script into your browser console.');
