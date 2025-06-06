/**
 * Comprehensive fix for sync file detection issues
 * This script will:
 * 1. Test the current sync detection logic
 * 2. Fix any issues with missing sync entries
 * 3. Verify the fix works
 */

console.log('🔧 ClaraVerse Sync Detection Fix');
console.log('=' .repeat(50));

const SYNC_DIR_KEY = 'clara_workflow_sync_directory';

// Test function to check sync file detection
async function testSyncDetection(fileName) {
  console.log(`\n🔍 Testing sync detection for: ${fileName}`);
  
  const syncDirectory = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
  
  // Parse filename using the same logic as the service
  const fileNameWithoutExt = fileName.replace('.json', '');
  const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
  
  if (lastUnderscoreIndex > -1) {
    const requestedWorkflowId = fileNameWithoutExt.substring(lastUnderscoreIndex + 1);
    const requestedWorkflowName = fileNameWithoutExt.substring(0, lastUnderscoreIndex);
    
    console.log('📝 Parsed:', {
      fileName,
      requestedWorkflowId,
      requestedWorkflowName
    });
    
    // Check if exists in sync directory
    const existsInSync = !!syncDirectory[requestedWorkflowId];
    console.log(`📂 Exists in sync directory: ${existsInSync ? '✅' : '❌'}`);
    
    if (!existsInSync) {
      // Try HTTP check and auto-register
      console.log('🌐 Checking HTTP file...');
      try {
        const response = await fetch(`/workflow_sync/${fileName}`);
        if (response.ok) {
          const workflowContent = await response.json();
          console.log('📄 HTTP file found:', {
            id: workflowContent.id,
            name: workflowContent.name,
            nodeCount: workflowContent.nodes?.length || 0
          });
          
          // Auto-register
          syncDirectory[workflowContent.id] = {
            name: workflowContent.name,
            lastSync: new Date().toISOString(),
            workflow: workflowContent
          };
          
          localStorage.setItem(SYNC_DIR_KEY, JSON.stringify(syncDirectory, null, 2));
          console.log('✅ Auto-registered in sync directory');
          return true;
        } else {
          console.log(`❌ HTTP file not found (${response.status})`);
        }
      } catch (error) {
        console.error('❌ HTTP check failed:', error.message);
      }
    } else {
      console.log('✅ Already exists in sync directory');
      return true;
    }
  } else {
    console.log('❌ Invalid filename format');
  }
  
  return false;
}

// Test problematic workflow
async function runTests() {
  console.log('\n📊 Current sync directory status:');
  const syncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
  console.log(`Total entries: ${Object.keys(syncDir).length}`);
  console.log('Workflow IDs:', Object.keys(syncDir));
  
  // Test the problematic workflow
  const problematicFile = 'my_awesome_workflow2_1749182392516-ju6lhmyge.json';
  const fixed = await testSyncDetection(problematicFile);
  
  if (fixed) {
    console.log('\n🎉 Sync detection test completed successfully!');
    console.log('💡 The Force Update button should now appear for my_awesome_workflow2');
    console.log('🔄 Try refreshing the WorkflowManager to see the change');
  } else {
    console.log('\n❌ Sync detection test failed');
    console.log('🔧 Manual intervention may be required');
  }
  
  // Test other potential problematic files
  console.log('\n🔍 Scanning for other potential sync files...');
  const testFiles = [
    'test_workflow_123456789.json',
    'another_workflow_987654321.json'
  ];
  
  for (const testFile of testFiles) {
    await testSyncDetection(testFile);
  }
  
  console.log('\n📋 Final sync directory state:');
  const finalSyncDir = JSON.parse(localStorage.getItem(SYNC_DIR_KEY) || '{}');
  console.log(`Total entries: ${Object.keys(finalSyncDir).length}`);
  Object.entries(finalSyncDir).forEach(([id, entry]) => {
    console.log(`  - ${entry.name} (${id})`);
  });
}

// Enhanced sync detection method for integration into the service
function enhancedSyncDetection() {
  console.log('\n🔧 Enhanced Sync Detection Method:');
  console.log(`
/**
 * Enhanced checkSyncFileExists with better auto-registration
 */
static async checkSyncFileExists(fileName) {
  try {
    const syncDirectory = this.getSyncDirectory();
    
    // Parse filename
    const fileNameWithoutExt = fileName.replace('.json', '');
    const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
    
    if (lastUnderscoreIndex > -1) {
      const requestedWorkflowId = fileNameWithoutExt.substring(lastUnderscoreIndex + 1);
      
      // Check if already in sync directory
      if (syncDirectory[requestedWorkflowId]) {
        return { exists: true, filePath: requestedWorkflowId };
      }
      
      // Auto-register from HTTP if available
      try {
        const response = await fetch(\`/workflow_sync/\${fileName}\`);
        if (response.ok) {
          const workflowContent = await response.json();
          
          // Validate the workflow content
          if (workflowContent.id && workflowContent.name) {
            syncDirectory[workflowContent.id] = {
              name: workflowContent.name,
              lastSync: new Date().toISOString(),
              workflow: workflowContent
            };
            
            this.saveSyncDirectory(syncDirectory);
            console.log('✅ Auto-registered workflow:', workflowContent.name);
            return { exists: true, filePath: workflowContent.id };
          }
        }
      } catch (httpError) {
        console.warn('HTTP auto-registration failed:', httpError.message);
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error in enhanced sync detection:', error);
    return { exists: false };
  }
}
  `);
}

// Run the tests
runTests().then(() => {
  enhancedSyncDetection();
  console.log('\n🏁 Sync detection fix completed!');
}).catch(console.error);
