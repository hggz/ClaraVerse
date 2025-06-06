// Direct test of WorkflowSyncService functionality
console.log('🔍 Testing WorkflowSyncService directly...');

// Try to find the WorkflowSyncService instance
async function findAndTestSyncService() {
    // Method 1: Try to access through React DevTools or global scope
    console.log('\n📋 Method 1: Checking global scope...');
    
    // Method 2: Try to import the service directly
    console.log('\n📋 Method 2: Creating WorkflowSyncService instance...');
    try {
        // Create a new instance to test the logic
        const syncService = {
            syncDirectory: {},
            
            async checkSyncFileExists(workflowName) {
                console.log(`  🔍 Checking sync file for: ${workflowName}`);
                
                // Test the actual fetch logic
                const patterns = [
                    `/workflow_sync/${workflowName}_*.json`,
                    `/workflow_sync/${workflowName}.json`
                ];
                
                for (const pattern of patterns) {
                    console.log(`  📁 Testing pattern: ${pattern}`);
                    
                    // For now, test the specific files we know exist
                    const knownFiles = [
                        '/workflow_sync/basic_input_1749181106265-6rs1e5uwq.json',
                        '/workflow_sync/my_awesome_workflow2_1749182392516-ju6lhmyge.json'
                    ];
                    
                    for (const file of knownFiles) {
                        if (file.includes(workflowName)) {
                            console.log(`  ✅ Found matching file: ${file}`);
                            try {
                                const response = await fetch(file);
                                if (response.ok) {
                                    console.log(`  ✅ File accessible via HTTP`);
                                    return true;
                                }
                            } catch (error) {
                                console.log(`  ❌ HTTP error: ${error.message}`);
                            }
                        }
                    }
                }
                
                console.log(`  ❌ No sync file found for: ${workflowName}`);
                return false;
            }
        };
        
        // Test both workflows
        const workflows = ['basic_input', 'my_awesome_workflow2'];
        
        for (const workflow of workflows) {
            console.log(`\n🧪 Testing: ${workflow}`);
            const exists = await syncService.checkSyncFileExists(workflow);
            console.log(`   Result: ${exists}`);
        }
        
    } catch (error) {
        console.error(`❌ Error creating service: ${error.message}`);
    }
    
    // Method 3: Test the actual file pattern matching
    console.log('\n📋 Method 3: Testing file pattern matching...');
    
    async function testPatternMatching() {
        const workflows = [
            { name: 'basic_input', expectedFile: 'basic_input_1749181106265-6rs1e5uwq.json' },
            { name: 'my_awesome_workflow2', expectedFile: 'my_awesome_workflow2_1749182392516-ju6lhmyge.json' }
        ];
        
        for (const { name, expectedFile } of workflows) {
            console.log(`\n  🔍 Pattern test for: ${name}`);
            console.log(`    Expected file: ${expectedFile}`);
            
            // Test if the filename matches the pattern
            const pattern = new RegExp(`^${name}_.*\\.json$`);
            const matches = pattern.test(expectedFile);
            console.log(`    Pattern ${name}_*.json matches: ${matches}`);
            
            // Test HTTP access
            const fullPath = `/workflow_sync/${expectedFile}`;
            try {
                const response = await fetch(fullPath);
                console.log(`    HTTP access: ${response.ok ? '✅' : '❌'} (${response.status})`);
            } catch (error) {
                console.log(`    HTTP access: ❌ ${error.message}`);
            }
        }
    }
    
    await testPatternMatching();
}

await findAndTestSyncService();

console.log('\n✨ Direct service testing complete!');
