/**
 * WorkflowSyncService - Handles syncing workflows with an intermediate directory
 * This allows for easy workflow content overriding and UI refreshing
 */

import { AgentFlow } from '../types/agent/types';
import { agentWorkflowStorage } from './agentWorkflowStorage';

export interface SyncDirectoryStructure {
  [workflowId: string]: {
    name: string;
    lastSync: string;
    workflow: AgentFlow;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  action?: string;
}

export class WorkflowSyncService {
  private static readonly SYNC_DIR_KEY = 'clara_workflow_sync_directory';

  /**
   * Get the current sync directory structure from localStorage
   */
  private static getSyncDirectory(): SyncDirectoryStructure {
    try {
      const stored = localStorage.getItem(this.SYNC_DIR_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading sync directory:', error);
      return {};
    }
  }

  /**
   * Save the sync directory structure to localStorage
   */
  private static saveSyncDirectory(syncDir: SyncDirectoryStructure): void {
    try {
      localStorage.setItem(this.SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
    } catch (error) {
      console.error('Error saving sync directory:', error);
    }
  }

  /**
   * Create a downloadable file with workflow content
   */
  private static downloadWorkflowFile(workflow: AgentFlow): void {
    const filename = `${workflow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${workflow.id}.json`;
    const content = JSON.stringify(workflow, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Sync a workflow - export to sync directory or update from it
   */
  static async syncWorkflow(workflowId: string): Promise<{
    success: boolean;
    action: 'exported' | 'updated' | 'error';
    message: string;
  }> {
    try {
      const syncDir = this.getSyncDirectory();
      const currentWorkflow = await agentWorkflowStorage.getWorkflow(workflowId);
      
      if (!currentWorkflow) {
        return {
          success: false,
          action: 'error',
          message: 'Workflow not found in storage'
        };
      }

      // Check if workflow exists in sync directory
      if (syncDir[workflowId]) {
        // Workflow exists in sync - compare timestamps and update if needed
        const syncEntry = syncDir[workflowId];
        const currentUpdated = new Date(currentWorkflow.updatedAt || currentWorkflow.createdAt);
        const syncUpdated = new Date(syncEntry.workflow.updatedAt || syncEntry.workflow.createdAt);
        
        if (syncUpdated > currentUpdated) {
          // Sync version is newer - update the workflow in storage
          const updateResult = await agentWorkflowStorage.saveWorkflow(syncEntry.workflow);
          
          if (updateResult.success) {
            // Update sync timestamp
            syncDir[workflowId].lastSync = new Date().toISOString();
            this.saveSyncDirectory(syncDir);
            
            return {
              success: true,
              action: 'updated',
              message: `Workflow "${currentWorkflow.name}" updated from sync directory`
            };
          } else {
            return {
              success: false,
              action: 'error',
              message: updateResult.errors?.join(', ') || 'Failed to update workflow'
            };
          }
        } else {
          // Current version is newer or same - update sync directory
          syncDir[workflowId] = {
            name: currentWorkflow.name,
            lastSync: new Date().toISOString(),
            workflow: currentWorkflow
          };
          this.saveSyncDirectory(syncDir);
          
          // Also create downloadable file for external editing
          this.downloadWorkflowFile(currentWorkflow);
          
          return {
            success: true,
            action: 'exported',
            message: `Workflow "${currentWorkflow.name}" exported to sync directory`
          };
        }
      } else {
        // Workflow doesn't exist in sync - export it
        syncDir[workflowId] = {
          name: currentWorkflow.name,
          lastSync: new Date().toISOString(),
          workflow: currentWorkflow
        };
        this.saveSyncDirectory(syncDir);
        
        // Create downloadable file for external editing
        this.downloadWorkflowFile(currentWorkflow);
        
        return {
          success: true,
          action: 'exported',
          message: `Workflow "${currentWorkflow.name}" exported to sync directory and downloaded as JSON`
        };
      }
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        action: 'error',
        message: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  /**
   * Upload and override a workflow from a file
   */
  static async uploadAndOverrideWorkflow(file: File, targetWorkflowId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const workflowData: AgentFlow = JSON.parse(fileContent);
      
      // Preserve the original ID and update timestamps
      workflowData.id = targetWorkflowId;
      workflowData.updatedAt = new Date().toISOString();
      
      const result = await agentWorkflowStorage.saveWorkflow(workflowData);
      
      if (result.success) {
        // Update sync directory
        const syncDir = this.getSyncDirectory();
        syncDir[targetWorkflowId] = {
          name: workflowData.name,
          lastSync: new Date().toISOString(),
          workflow: workflowData
        };
        this.saveSyncDirectory(syncDir);
        
        return {
          success: true,
          message: `Workflow "${workflowData.name}" successfully updated from file`
        };
      } else {
        return {
          success: false,
          message: result.errors?.join(', ') || 'Failed to save workflow'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process file'
      };
    }
  }

  /**
   * Get sync status for a workflow
   */
  static getSyncStatus(workflowId: string): {
    isSynced: boolean;
    lastSync?: string;
    syncName?: string;
  } {
    const syncDir = this.getSyncDirectory();
    const syncEntry = syncDir[workflowId];
    
    return {
      isSynced: !!syncEntry,
      lastSync: syncEntry?.lastSync,
      syncName: syncEntry?.name
    };
  }

  /**
   * Get all synced workflows
   */
  static getAllSyncedWorkflows(): SyncDirectoryStructure {
    return this.getSyncDirectory();
  }

  /**
   * Remove a workflow from sync directory
   */
  static removeSyncEntry(workflowId: string): void {
    const syncDir = this.getSyncDirectory();
    delete syncDir[workflowId];
    this.saveSyncDirectory(syncDir);
  }

  /**
   * Clear all sync entries
   */
  static clearSyncDirectory(): void {
    localStorage.removeItem(this.SYNC_DIR_KEY);
  }

  /**
   * Check if a sync file exists in the sync directory with enhanced fallback logic
   */
  static async checkSyncFileExists(fileName: string): Promise<{exists: boolean, filePath?: string}> {
    try {
      const syncDirectory = this.getSyncDirectory();
      
      // Extract workflow ID from the filename (format: workflowName_workflowId.json)
      const fileNameWithoutExt = fileName.replace('.json', '');
      const lastUnderscoreIndex = fileNameWithoutExt.lastIndexOf('_');
      
      if (lastUnderscoreIndex > -1) {
        const requestedWorkflowId = fileNameWithoutExt.substring(lastUnderscoreIndex + 1);
        const requestedWorkflowName = fileNameWithoutExt.substring(0, lastUnderscoreIndex);
        
        console.log('🔍 Checking sync file:', {
          fileName,
          requestedWorkflowId,
          requestedWorkflowName,
          syncDirectoryKeys: Object.keys(syncDirectory)
        });
        
        // Primary check: exact workflow ID match in sync directory
        if (syncDirectory[requestedWorkflowId]) {
          console.log('✅ Found exact workflow ID match in sync directory');
          return { exists: true, filePath: requestedWorkflowId };
        }
        
        // Fallback 1: Check for workflows with similar names but any ID
        const nameMatchKeys = Object.keys(syncDirectory).filter(workflowId => {
          const entry = syncDirectory[workflowId];
          if (!entry.workflow) return false;
          
          const syncWorkflowName = entry.workflow.name;
          
          // Various name matching strategies
          return syncWorkflowName === requestedWorkflowName ||
                 syncWorkflowName.includes(requestedWorkflowName) ||
                 requestedWorkflowName.includes(syncWorkflowName) ||
                 syncWorkflowName.replace(/[^a-zA-Z0-9]/g, '') === requestedWorkflowName.replace(/[^a-zA-Z0-9]/g, '');
        });
        
        if (nameMatchKeys.length > 0) {
          console.log('✅ Found name-based match in sync directory:', nameMatchKeys[0]);
          return { exists: true, filePath: nameMatchKeys[0] };
        }
        
        // Fallback 2: Check for HTTP file existence and auto-add to sync directory
        console.log('🌐 Checking if HTTP file exists for auto-sync...');
        try {
          const response = await fetch(`/workflow_sync/${fileName}`);
          if (response.ok) {
            const workflowContent = await response.json();
            console.log('📁 Found HTTP file, auto-adding to sync directory:', {
              name: workflowContent.name,
              id: workflowContent.id
            });
            
            // Auto-add to sync directory
            syncDirectory[workflowContent.id] = {
              name: workflowContent.name,
              lastSync: new Date().toISOString(),
              workflow: workflowContent
            };
            
            this.saveSyncDirectory(syncDirectory);
            console.log('✅ Auto-added workflow to sync directory');
            return { exists: true, filePath: workflowContent.id };
          }
        } catch (httpError) {
          console.log('❌ HTTP file check failed:', httpError instanceof Error ? httpError.message : 'Unknown error');
        }
      }
      
      console.log('❌ No sync file found for:', fileName);
      return { exists: false };
    } catch (error) {
      console.error('Error checking sync file:', error);
      return { exists: false };
    }
  }

  /**
   * Force update a workflow from sync directory, bypassing timestamp checks
   */
  static async forceUpdateFromSync(workflowId: string, syncFileName: string): Promise<SyncResult> {
    try {
      console.log('🔄 Starting force update, first reloading sync file from disk...');
      
      // First, try to reload the sync directory from the actual file
      const reloadResult = await this.reloadSyncFromFiles(workflowId, syncFileName);
      if (!reloadResult.success) {
        console.log('⚠️ Could not reload from file, using cached sync directory');
      }
      
      const syncDirectory = this.getSyncDirectory();
      
      // Find the sync entry by looking for the workflow ID in the sync directory
      let syncEntry = syncDirectory[workflowId];
      
      // If not found by ID, try to find by matching filename pattern
      if (!syncEntry) {
        const matchingKey = Object.keys(syncDirectory).find(key => {
          const entry = syncDirectory[key];
          const expectedFileName = `${entry.workflow?.name}_${entry.workflow?.id}.json`;
          return expectedFileName === syncFileName;
        });
        
        if (matchingKey) {
          syncEntry = syncDirectory[matchingKey];
        }
      }
      
      if (!syncEntry || !syncEntry.workflow) {
        return {
          success: false,
          message: `Sync file "${syncFileName}" not found or invalid. Make sure the workflow is synced first.`
        };
      }
      
      // Get current workflow from database for comparison
      console.log('🔍 Getting current workflow from database for comparison...');
      const currentWorkflow = await agentWorkflowStorage.getWorkflow(workflowId);
      
      if (currentWorkflow) {
        console.log('📊 CURRENT DATABASE STATE:', {
          id: currentWorkflow.id,
          name: currentWorkflow.name,
          nodeCount: currentWorkflow.nodes?.length,
          updatedAt: currentWorkflow.updatedAt,
          tags: currentWorkflow.tags
        });
      } else {
        console.log('❌ Current workflow not found in database');
      }
      
      // Ensure the workflow has the correct ID
      const workflowToUpdate = {
        ...syncEntry.workflow,
        id: workflowId,
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 SYNC FILE CONTENT TO SAVE:', {
        id: workflowToUpdate.id,
        name: workflowToUpdate.name,
        nodeCount: workflowToUpdate.nodes?.length,
        updatedAt: workflowToUpdate.updatedAt,
        tags: workflowToUpdate.tags,
        hasNodes: !!workflowToUpdate.nodes,
        hasConnections: !!workflowToUpdate.connections,
        version: workflowToUpdate.version
      });
      
      // Check if there are actual differences
      const hasChanges = !currentWorkflow || 
        currentWorkflow.name !== workflowToUpdate.name ||
        currentWorkflow.nodes?.length !== workflowToUpdate.nodes?.length ||
        JSON.stringify(currentWorkflow.tags) !== JSON.stringify(workflowToUpdate.tags);
        
      console.log('🔄 CHANGE DETECTION:', {
        hasCurrentWorkflow: !!currentWorkflow,
        nameChanged: currentWorkflow?.name !== workflowToUpdate.name,
        nodeCountChanged: currentWorkflow?.nodes?.length !== workflowToUpdate.nodes?.length,
        tagsChanged: JSON.stringify(currentWorkflow?.tags) !== JSON.stringify(workflowToUpdate.tags),
        overallHasChanges: hasChanges
      });
      
      // Save to storage
      console.log('💾 Calling agentWorkflowStorage.saveWorkflow...');
      const result = await agentWorkflowStorage.saveWorkflow(workflowToUpdate);
      console.log('💾 agentWorkflowStorage.saveWorkflow result:', result);
      
      // Verify the save by re-fetching
      console.log('🔍 Verifying save by re-fetching workflow...');
      const verifyWorkflow = await agentWorkflowStorage.getWorkflow(workflowId);
      if (verifyWorkflow) {
        console.log('✅ VERIFICATION - UPDATED DATABASE STATE:', {
          id: verifyWorkflow.id,
          name: verifyWorkflow.name,
          nodeCount: verifyWorkflow.nodes?.length,
          updatedAt: verifyWorkflow.updatedAt,
          tags: verifyWorkflow.tags
        });
      } else {
        console.log('❌ VERIFICATION FAILED - Workflow not found after save');
      }
      
      if (result.success) {
        // Update sync directory with new timestamp
        syncEntry.lastSync = new Date().toISOString();
        syncEntry.workflow = workflowToUpdate;
        this.saveSyncDirectory(syncDirectory);
        
        console.log('✅ WorkflowSyncService.forceUpdateFromSync - SUCCESS SUMMARY:', {
          workflowId: workflowToUpdate.id,
          workflowName: workflowToUpdate.name,
          syncDirectoryUpdated: true,
          databaseSaveSuccess: result.success,
          hasChanges: hasChanges,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          message: `Workflow "${workflowToUpdate.name}" force updated from sync file (${hasChanges ? 'with changes' : 'no changes detected'})`,
          action: 'force-updated'
        };
      } else {
        console.log('❌ WorkflowSyncService.forceUpdateFromSync - FAILED:', {
          workflowId: workflowId,
          errors: result.errors,
          result: result
        });
        return {
          success: false,
          message: result.errors?.join(', ') || 'Failed to save workflow'
        };
      }
    } catch (error) {
      console.error('Force update error:', error);
      return {
        success: false,
        message: `Force update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Reload sync directory from actual workflow files
   * This is needed when files are manually edited outside the sync system
   */
  static async reloadSyncFromFiles(workflowId: string, syncFileName: string): Promise<SyncResult> {
    try {
      console.log('🔄 Attempting to reload sync file from actual file system...');
      
      // Try to fetch the actual file content
      const response = await fetch(`/workflow_sync/${syncFileName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sync file: ${response.status} ${response.statusText}`);
      }
      
      const workflowContent = await response.json();
      console.log('📁 Loaded workflow from file:', {
        name: workflowContent.name,
        nodeCount: workflowContent.nodes?.length,
        tags: workflowContent.tags,
        version: workflowContent.version
      });
      
      // Update the sync directory with fresh content
      const syncDirectory = this.getSyncDirectory();
      syncDirectory[workflowId] = {
        name: workflowContent.name,
        lastSync: new Date().toISOString(),
        workflow: workflowContent
      };
      
      this.saveSyncDirectory(syncDirectory);
      console.log('✅ Sync directory updated with fresh file content');
      
      return {
        success: true,
        message: `Sync directory updated with content from ${syncFileName}`,
        action: 'reloaded'
      };
    } catch (error) {
      console.error('❌ Failed to reload sync from files:', error);
      return {
        success: false,
        message: `Failed to reload sync file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export default WorkflowSyncService;
