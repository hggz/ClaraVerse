/**
 * Script to check existing workflows in ClaraVerse IndexedDB
 */

const DB_NAME = 'clara_db';
const DB_VERSION = 8;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllWorkflows(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agent_workflows'], 'readonly');
    const store = transaction.objectStore('agent_workflows');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function checkWorkflows() {
  try {
    console.log('🔍 Checking for existing workflows in ClaraVerse...');
    
    const db = await openDatabase();
    console.log('✅ Database opened successfully');
    
    const workflows = await getAllWorkflows(db);
    console.log(`📊 Found ${workflows.length} workflows in storage`);
    
    if (workflows.length === 0) {
      console.log('❌ No workflows found in storage');
      return;
    }
    
    console.log('\n📝 Workflow List:');
    console.log('═'.repeat(50));
    
    workflows.forEach((workflow, index) => {
      console.log(`${index + 1}. ${workflow.name}`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Description: ${workflow.description || 'No description'}`);
      console.log(`   Tags: ${(workflow.tags || []).join(', ') || 'None'}`);
      console.log(`   Created: ${new Date(workflow.createdAt).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(workflow.updatedAt).toLocaleDateString()}`);
      console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
      console.log(`   Connections: ${workflow.connections?.length || 0}`);
      console.log('');
    });
    
    // Look for specific workflows
    const basicInput = workflows.find(w => w.name.toLowerCase().includes('basic_input') || w.id.includes('basic_input'));
    const awesomeWorkflow = workflows.find(w => w.name.toLowerCase().includes('my_awesome_workflow2') || w.id.includes('my_awesome_workflow2'));
    
    if (basicInput) {
      console.log('✅ Found "basic_input" workflow:');
      console.log(`   ID: ${basicInput.id}`);
      console.log(`   Name: ${basicInput.name}`);
    }
    
    if (awesomeWorkflow) {
      console.log('✅ Found "my_awesome_workflow2" workflow:');
      console.log(`   ID: ${awesomeWorkflow.id}`);
      console.log(`   Name: ${awesomeWorkflow.name}`);
    }
    
    if (!basicInput && !awesomeWorkflow) {
      console.log('❌ Neither "basic_input" nor "my_awesome_workflow2" workflows found');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error checking workflows:', error);
  }
}

// Run the check
checkWorkflows();
