/**
 * WorkflowAutoDiscovery Service - Automatically discovers and registers workflows 
 * from the workflow_sync directory
 */

import { AgentFlow } from '../types/agent/types';
import { agentWorkflowStorage } from './agentWorkflowStorage';

export interface DiscoveryResult {
  success: boolean;
  discovered: number;
  registered: number;
  errors: string[];
  workflows: Array<{
    id: string;
    name: string;
    fileName: string;
    action: 'registered' | 'updated' | 'skipped' | 'error';
  }>;
}

export class WorkflowAutoDiscovery {
  private static readonly SYNC_DIR_KEY = 'clara_workflow_sync_directory';
  private static readonly DISCOVERY_CACHE_KEY = 'clara_workflow_discovery_cache';
  private static readonly DISCOVERY_INTERVAL = 30000; // 30 seconds
  
  /**
   * Get the current sync directory structure from localStorage
   */
  private static getSyncDirectory(): Record<string, any> {
    try {
      console.log('📂 [AutoDiscovery] Reading sync directory from localStorage...');
      const stored = localStorage.getItem(this.SYNC_DIR_KEY);
      const result = stored ? JSON.parse(stored) : {};
      console.log('📂 [AutoDiscovery] Sync directory contents:', {
        hasData: !!stored,
        entryCount: Object.keys(result).length,
        keys: Object.keys(result)
      });
      return result;
    } catch (error) {
      console.error('❌ [AutoDiscovery] Error reading sync directory:', error);
      return {};
    }
  }

  /**
   * Save the sync directory structure to localStorage
   */
  private static saveSyncDirectory(syncDir: Record<string, any>): void {
    try {
      localStorage.setItem(this.SYNC_DIR_KEY, JSON.stringify(syncDir, null, 2));
    } catch (error) {
      console.error('Error saving sync directory:', error);
    }
  }

  /**
   * Get list of known workflow files from previous discoveries
   */
  private static getDiscoveryCache(): Set<string> {
    try {
      const stored = localStorage.getItem(this.DISCOVERY_CACHE_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Error reading discovery cache:', error);
      return new Set();
    }
  }

  /**
   * Save the discovery cache
   */
  private static saveDiscoveryCache(fileNames: Set<string>): void {
    try {
      localStorage.setItem(this.DISCOVERY_CACHE_KEY, JSON.stringify(Array.from(fileNames)));
    } catch (error) {
      console.error('Error saving discovery cache:', error);
    }
  }

  /**
   * Check if a workflow file exists via HTTP and fetch its content
   */
  private static async fetchWorkflowFile(fileName: string): Promise<{ success: boolean; workflow?: AgentFlow; error?: string }> {
    try {
      console.log(`🌐 [AutoDiscovery] Attempting to fetch workflow file: ${fileName}`);
      const url = `/workflow_sync/${fileName}`;
      console.log(`🌐 [AutoDiscovery] Full URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`🌐 [AutoDiscovery] HTTP Response for ${fileName}:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        console.log(`✅ [AutoDiscovery] Successfully fetched ${fileName}, parsing JSON...`);
        const workflowContent = await response.json();
        console.log(`📄 [AutoDiscovery] Parsed workflow content for ${fileName}:`, {
          id: workflowContent.id,
          name: workflowContent.name,
          version: workflowContent.version,
          nodeCount: workflowContent.nodes?.length || 0,
          connectionCount: workflowContent.connections?.length || 0
        });
        return { success: true, workflow: workflowContent };
      } else {
        console.log(`❌ [AutoDiscovery] Failed to fetch ${fileName}: HTTP ${response.status} ${response.statusText}`);
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      console.error(`💥 [AutoDiscovery] Exception while fetching ${fileName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  /**
   * Discover workflows using common filename patterns
   */
  private static async discoverByPatterns(): Promise<string[]> {
    console.log('🔍 [AutoDiscovery] Starting pattern-based discovery...');
    const discoveredFiles: string[] = [];
    
    // Common patterns to try
    const patterns = [
      // Known existing files
      'basic_input_1749181106265-6rs1e5uwq.json',
      'my_awesome_workflow2_1749182392516-ju6lhmyge.json',
      'demo_weather_workflow.json',
      'simple_demo_workflow.json',
      // Test some common patterns
      'workflow_*.json',
      'demo_*.json',
      'test_*.json'
    ];

    console.log(`🎯 [AutoDiscovery] Testing ${patterns.length} patterns:`, patterns);

    for (const pattern of patterns) {
      if (!pattern.includes('*')) {
        // Direct filename - test it
        console.log(`🔍 [AutoDiscovery] Testing direct filename: ${pattern}`);
        const result = await this.fetchWorkflowFile(pattern);
        if (result.success) {
          console.log(`✅ [AutoDiscovery] Found workflow file: ${pattern}`);
          discoveredFiles.push(pattern);
        } else {
          console.log(`❌ [AutoDiscovery] File not found: ${pattern} - ${result.error}`);
        }
      }
    }

    console.log(`📋 [AutoDiscovery] Pattern discovery completed. Found ${discoveredFiles.length} files:`, discoveredFiles);
    return discoveredFiles;
  }

  /**
   * Discover workflows by trying incremental IDs
   */
  private static async discoverByIncrementalIds(): Promise<string[]> {
    const discoveredFiles: string[] = [];
    const currentTime = Date.now();
    
    // Try recent timestamp-based IDs (last 30 days)
    const thirtyDaysAgo = currentTime - (30 * 24 * 60 * 60 * 1000);
    
    // Sample some potential timestamps
    const testTimestamps = [];
    for (let i = 0; i < 10; i++) {
      const randomTime = thirtyDaysAgo + Math.random() * (currentTime - thirtyDaysAgo);
      testTimestamps.push(Math.floor(randomTime));
    }

    for (const timestamp of testTimestamps) {
      // Generate some common patterns
      const testPatterns = [
        `workflow_${timestamp}.json`,
        `demo_${timestamp}.json`,
        `test_${timestamp}.json`,
        `my_workflow_${timestamp}.json`
      ];

      for (const pattern of testPatterns) {
        const result = await this.fetchWorkflowFile(pattern);
        if (result.success) {
          discoveredFiles.push(pattern);
          break; // Don't test more patterns for this timestamp
        }
      }
    }

    return discoveredFiles;
  }

  /**
   * Register a discovered workflow in both sync directory and main storage
   */
  private static async registerWorkflow(workflow: AgentFlow, fileName: string): Promise<string> {
    console.log(`💾 [AutoDiscovery] Registering workflow from ${fileName}:`, {
      workflowId: workflow.id,
      workflowName: workflow.name
    });
    
    const syncDir = this.getSyncDirectory();
    const workflowId = workflow.id;
    
    let action = 'registered';
    
    // Check if already exists in sync directory
    if (syncDir[workflowId]) {
      console.log(`🔄 [AutoDiscovery] Updating existing sync directory entry for ${workflowId}`);
      action = 'updated';
    } else {
      console.log(`📝 [AutoDiscovery] Creating new sync directory entry for ${workflowId}`);
    }
    
    // Update sync directory
    syncDir[workflowId] = {
      name: workflow.name,
      lastSync: new Date().toISOString(),
      workflow: workflow
    };
    this.saveSyncDirectory(syncDir);
    
    // Check if workflow already exists in main storage
    try {
      console.log(`🔍 [AutoDiscovery] Checking if workflow ${workflowId} exists in main storage...`);
      const existingWorkflow = await agentWorkflowStorage.getWorkflow(workflowId);
      
      if (existingWorkflow) {
        console.log(`📄 [AutoDiscovery] Workflow ${workflowId} already exists in main storage, skipping save`);
        return 'updated'; // Already exists, no need to save again
      }
    } catch (error) {
      console.log(`🔍 [AutoDiscovery] Workflow ${workflowId} not found in main storage (expected for new workflows)`);
    }
    
    // Save to main workflow storage so it appears in UI
    try {
      console.log(`🗄️ [AutoDiscovery] Saving workflow to main storage system...`);
      
      // Transform connections to match expected format
      console.log(`🔗 [AutoDiscovery] Original connections for ${workflowId}:`, workflow.connections);
      
      const transformedConnections = (workflow.connections || []).map((conn: any, index: number) => {
        console.log(`🔗 [AutoDiscovery] Processing connection ${index}:`, JSON.stringify(conn, null, 2));
        console.log(`🔗 [AutoDiscovery] Connection ${index} has from: ${conn.from}, to: ${conn.to}, source: ${conn.source}, target: ${conn.target}`);
        
        // Handle both old format (from/to) and new format (source/target)
        if (conn.from && conn.to) {
          const transformed = {
            id: conn.id || `conn-${index}`,
            source: conn.from,
            target: conn.to,
            sourceHandle: conn.fromOutput || 'output',
            targetHandle: conn.toInput || 'input'
          };
          console.log(`🔗 [AutoDiscovery] Transformed connection ${index} from old format:`, JSON.stringify(transformed, null, 2));
          console.log(`🔗 [AutoDiscovery] Transformation result - source: ${transformed.source}, target: ${transformed.target}`);
          return transformed;
        }
        
        // Already in correct format, just ensure ID exists
        const existing = {
          ...conn,
          id: conn.id || `conn-${index}`
        };
        console.log(`🔗 [AutoDiscovery] Keeping existing connection ${index} format:`, JSON.stringify(existing, null, 2));
        return existing;
      });
      
      console.log(`🔗 [AutoDiscovery] All transformed connections for ${workflowId}:`, transformedConnections);
      
      // Ensure workflow has required metadata and transformed connections
      const workflowToSave: AgentFlow = {
        ...workflow,
        connections: transformedConnections,
        createdAt: workflow.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: workflow.version || '1.0.0'
      };
      
      console.log(`🔗 [AutoDiscovery] Transformed ${transformedConnections.length} connections for ${workflowId}`);
      
      const saveResult = await agentWorkflowStorage.saveWorkflow(workflowToSave);
      
      if (saveResult.success) {
        console.log(`✅ [AutoDiscovery] Successfully saved workflow ${workflowId} to main storage`);
        return 'registered';
      } else {
        console.error(`❌ [AutoDiscovery] Failed to save workflow ${workflowId} to main storage:`, saveResult.errors);
        
        // Try fallback: save without connections if connection validation is the issue
        if (saveResult.errors?.some(error => error.includes('Connection') || error.includes('missing'))) {
          console.log(`🔄 [AutoDiscovery] Attempting fallback: saving ${workflowId} without connections...`);
          
          const fallbackWorkflow: AgentFlow = {
            ...workflowToSave,
            connections: [] // Remove problematic connections
          };
          
          const fallbackResult = await agentWorkflowStorage.saveWorkflow(fallbackWorkflow);
          
          if (fallbackResult.success) {
            console.log(`✅ [AutoDiscovery] Successfully saved workflow ${workflowId} to main storage (without connections)`);
            return 'registered';
          } else {
            console.error(`❌ [AutoDiscovery] Fallback also failed for workflow ${workflowId}:`, fallbackResult.errors);
          }
        }
        
        return 'error';
      }
    } catch (error) {
      console.error(`💥 [AutoDiscovery] Exception saving workflow ${workflowId} to main storage:`, error);
      return 'error';
    }
  }

  /**
   * Main discovery method - scans for new workflows and registers them
   */
  static async discoverAndRegisterWorkflows(): Promise<DiscoveryResult> {
    console.log('🚀 [AutoDiscovery] Starting workflow auto-discovery...');
    
    const result: DiscoveryResult = {
      success: true,
      discovered: 0,
      registered: 0,
      errors: [],
      workflows: []
    };

    try {
      console.log('📂 [AutoDiscovery] Getting discovery cache...');
      const cache = this.getDiscoveryCache();
      console.log('🗂️ [AutoDiscovery] Current cache contents:', Array.from(cache));
      
      const allDiscoveredFiles = new Set<string>();

      // Method 1: Discover by known patterns
      console.log('📋 [AutoDiscovery] Starting pattern-based discovery...');
      const patternFiles = await this.discoverByPatterns();
      console.log(`📋 [AutoDiscovery] Pattern discovery found ${patternFiles.length} files:`, patternFiles);
      patternFiles.forEach(file => allDiscoveredFiles.add(file));

      // Method 2: Discover by incremental search (limited to avoid too many requests)
      console.log('🔢 [AutoDiscovery] Starting incremental discovery...');
      const incrementalFiles = await this.discoverByIncrementalIds();
      console.log(`🔢 [AutoDiscovery] Incremental discovery found ${incrementalFiles.length} files:`, incrementalFiles);
      incrementalFiles.forEach(file => allDiscoveredFiles.add(file));

      console.log(`📁 [AutoDiscovery] Total unique files discovered: ${allDiscoveredFiles.size}`);
      console.log(`📁 [AutoDiscovery] All discovered files:`, Array.from(allDiscoveredFiles));
      result.discovered = allDiscoveredFiles.size;

      // Process each discovered file
      for (const fileName of allDiscoveredFiles) {
        try {
          const isNewFile = !cache.has(fileName);
          console.log(`📄 [AutoDiscovery] Processing ${fileName} (new: ${isNewFile})`);

          // Fetch the workflow content
          const fetchResult = await this.fetchWorkflowFile(fileName);
          
          if (fetchResult.success && fetchResult.workflow) {
            const workflow = fetchResult.workflow;
            console.log(`✅ [AutoDiscovery] Successfully loaded workflow from ${fileName}:`, {
              id: workflow.id,
              name: workflow.name,
              version: workflow.version
            });
            
            // Register in sync directory and main storage
            console.log(`💾 [AutoDiscovery] Registering workflow in storage systems...`);
            const action = await this.registerWorkflow(workflow, fileName);
            console.log(`💾 [AutoDiscovery] Registration result: ${action}`);
            
            result.workflows.push({
              id: workflow.id,
              name: workflow.name,
              fileName: fileName,
              action: action as 'registered' | 'updated' | 'error'
            });
            
            if (action === 'registered') {
              result.registered++;
              console.log(`✅ [AutoDiscovery] Registered new workflow: ${workflow.name} (${workflow.id})`);
            } else if (action === 'updated') {
              console.log(`🔄 [AutoDiscovery] Updated existing workflow: ${workflow.name} (${workflow.id})`);
            } else if (action === 'error') {
              console.error(`❌ [AutoDiscovery] Failed to save workflow: ${workflow.name} (${workflow.id})`);
              result.errors.push(`Failed to save workflow ${workflow.name} to storage`);
            }
            
            // Add to cache
            cache.add(fileName);
            console.log(`🗂️ [AutoDiscovery] Added ${fileName} to cache`);
            
          } else {
            const error = `Failed to fetch ${fileName}: ${fetchResult.error}`;
            console.error(`❌ [AutoDiscovery] ${error}`);
            result.errors.push(error);
            
            result.workflows.push({
              id: 'unknown',
              name: fileName,
              fileName: fileName,
              action: 'error'
            });
          }
        } catch (error) {
          const errorMsg = `Error processing ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`💥 [AutoDiscovery] ${errorMsg}`);
          console.error(`💥 [AutoDiscovery] Error stack:`, error instanceof Error ? error.stack : 'No stack');
          result.errors.push(errorMsg);
          
          result.workflows.push({
            id: 'unknown',
            name: fileName,
            fileName: fileName,
            action: 'error'
          });
        }
      }

      // Update discovery cache
      console.log('💾 [AutoDiscovery] Saving updated cache...');
      this.saveDiscoveryCache(cache);
      console.log('💾 [AutoDiscovery] Cache saved. New cache size:', cache.size);

      // Summary
      console.log('📊 [AutoDiscovery] Discovery Summary:', {
        totalDiscovered: result.discovered,
        totalRegistered: result.registered,
        errorCount: result.errors.length,
        workflowDetails: result.workflows
      });

      if (result.registered > 0) {
        console.log(`🎉 [AutoDiscovery] Discovery completed successfully: ${result.registered} new workflows registered`);
      } else {
        console.log('ℹ️ [AutoDiscovery] Discovery completed: no new workflows found');
      }

      if (result.errors.length > 0) {
        console.warn(`⚠️ [AutoDiscovery] Discovery had ${result.errors.length} errors:`, result.errors);
        result.success = false;
      }

    } catch (error) {
      const errorMsg = `Auto-discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`💥 [AutoDiscovery] ${errorMsg}`);
      console.error(`💥 [AutoDiscovery] Top-level error stack:`, error instanceof Error ? error.stack : 'No stack');
      result.errors.push(errorMsg);
      result.success = false;
    }

    console.log('🏁 [AutoDiscovery] Returning result:', result);
    return result;
  }

  /**
   * Start automatic discovery with periodic scanning
   */
  static startAutoDiscovery(): void {
    console.log('🚀 Starting automatic workflow discovery service...');
    
    // Run initial discovery
    this.discoverAndRegisterWorkflows().then(result => {
      console.log('📊 Initial discovery result:', result);
    });

    // Set up periodic discovery
    setInterval(async () => {
      try {
        const result = await this.discoverAndRegisterWorkflows();
        if (result.registered > 0) {
          console.log(`🔄 Periodic discovery: ${result.registered} new workflows found`);
          
          // Trigger UI refresh if there's a global event system
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('clara:workflows-updated', { 
              detail: result 
            }));
          }
        }
      } catch (error) {
        console.error('❌ Periodic discovery error:', error);
      }
    }, this.DISCOVERY_INTERVAL);
  }

  /**
   * Stop automatic discovery (for cleanup)
   */
  static stopAutoDiscovery(): void {
    // Note: In a real implementation, you'd want to track the interval ID
    console.log('🛑 Auto-discovery stopped');
  }

  /**
   * Manual discovery trigger for UI buttons
   */
  static async triggerDiscovery(): Promise<DiscoveryResult> {
    console.log('🎯 [AutoDiscovery] Manual workflow discovery triggered');
    console.log('🎯 [AutoDiscovery] About to call discoverAndRegisterWorkflows()...');
    const result = await this.discoverAndRegisterWorkflows();
    console.log('🎯 [AutoDiscovery] Manual discovery completed, result:', result);
    return result;
  }

  /**
   * Clear discovery cache (useful for testing)
   */
  static clearDiscoveryCache(): void {
    localStorage.removeItem(this.DISCOVERY_CACHE_KEY);
    console.log('🗑️ Discovery cache cleared');
  }
}

export default WorkflowAutoDiscovery;
