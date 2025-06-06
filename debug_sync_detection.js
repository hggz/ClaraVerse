/**
 * Debug script to check sync file detection for my_awesome_workflow2
 */

// Check if we're in browser environment
const isNode = typeof window === 'undefined';

if (!isNode) {
  // Browser environment - check localStorage
  console.log('🔍 Debugging sync file detection for my_awesome_workflow2');
  
  const syncDirKey = 'clara_workflow_sync_directory';
  const syncDir = localStorage.getItem(syncDirKey);
  
  console.log('📂 Current sync directory:', syncDir ? JSON.parse(syncDir) : 'Empty');
  
  // Test the filename matching logic
  const testFileName = 'my_awesome_workflow2_1749182392516-ju6lhmyge.json';
  const fileNameWithoutExt = testFileName.replace('.json', '');
  const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
  
  if (lastUnderscoreIndex > -1) {
    const requestedWorkflowId = fileNameWithoutExt.substring(lastUnderscoreIndex + 1);
    const requestedWorkflowName = fileNameWithoutExt.substring(0, lastUnderscoreIndex);
    
    console.log('📝 Parsed filename:', {
      fileName: testFileName,
      requestedWorkflowId,
      requestedWorkflowName,
      lastUnderscoreIndex
    });
    
    // Check if this ID exists in sync directory
    const syncDirectory = syncDir ? JSON.parse(syncDir) : {};
    const exists = !!syncDirectory[requestedWorkflowId];
    
    console.log('✅ Sync file exists check:', {
      exists,
      syncDirectoryKeys: Object.keys(syncDirectory),
      targetId: requestedWorkflowId
    });
    
    // Try HTTP check
    console.log('🌐 Testing HTTP file access...');
    fetch(`/workflow_sync/${testFileName}`)
      .then(response => {
        console.log('📡 HTTP Response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        return response.ok ? response.json() : null;
      })
      .then(data => {
        if (data) {
          console.log('📄 HTTP file content:', {
            id: data.id,
            name: data.name,
            nodeCount: data.nodes?.length || 0
          });
        } else {
          console.log('❌ No HTTP file content available');
        }
      })
      .catch(error => {
        console.error('❌ HTTP fetch error:', error);
      });
  }
  
} else {
  console.log('❌ This script should be run in a browser environment');
}
