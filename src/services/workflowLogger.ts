/**
 * Enhanced logging service for better workflow execution analysis
 * Provides structured logs, error reporting, and file-based log export
 */

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  duration?: number;
  data?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface WorkflowExecutionLog {
  workflowId: string;
  workflowName: string;
  executionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'cancelled';
  nodeCount: number;
  successfulNodes: number;
  failedNodes: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  logs: ExecutionLogEntry[];
  error?: {
    message: string;
    failedNodeId?: string;
    failedNodeName?: string;
    stack?: string;
  };
  metadata: {
    version: string;
    environment: 'development' | 'production';
    userAgent?: string;
  };
}

export class WorkflowExecutionLogger {
  private currentLog: WorkflowExecutionLog | null = null;
  private logListeners: ((log: ExecutionLogEntry) => void)[] = [];

  /**
   * Start a new workflow execution log
   */
  startExecution(workflowId: string, workflowName: string, inputs: Record<string, any>, nodeCount: number): string {
    const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentLog = {
      workflowId,
      workflowName,
      executionId,
      startTime: new Date().toISOString(),
      status: 'running',
      nodeCount,
      successfulNodes: 0,
      failedNodes: 0,
      inputs,
      logs: [],
      metadata: {
        version: '1.0.0',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
      }
    };

    this.addLog('info', `🚀 Starting workflow execution: ${workflowName}`, {
      workflowId,
      nodeCount,
      inputs: Object.keys(inputs)
    });

    return executionId;
  }

  /**
   * Add a log entry to the current execution
   */
  addLog(
    level: ExecutionLogEntry['level'], 
    message: string, 
    data?: any, 
    nodeId?: string, 
    nodeName?: string, 
    nodeType?: string,
    duration?: number,
    error?: ExecutionLogEntry['error']
  ): void {
    if (!this.currentLog) return;

    const logEntry: ExecutionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
      nodeName,
      nodeType,
      duration,
      data,
      error
    };

    this.currentLog.logs.push(logEntry);

    // Update counters
    if (level === 'error' && nodeId) {
      this.currentLog.failedNodes++;
    } else if (level === 'info' && nodeId && message.includes('completed')) {
      this.currentLog.successfulNodes++;
    }

    // Notify listeners (for real-time display)
    this.logListeners.forEach(listener => listener(logEntry));

    // Console output with better formatting
    this.formatConsoleOutput(logEntry);
  }

  /**
   * Log node execution start
   */
  logNodeStart(nodeId: string, nodeName: string, nodeType: string, inputs?: any): void {
    this.addLog('info', `▶️ Executing: ${nodeName} (${nodeType})`, inputs, nodeId, nodeName, nodeType);
  }

  /**
   * Log node execution success
   */
  logNodeSuccess(nodeId: string, nodeName: string, nodeType: string, outputs: any, duration: number): void {
    this.addLog('info', `✅ ${nodeName} completed successfully`, outputs, nodeId, nodeName, nodeType, duration);
  }

  /**
   * Log node execution error
   */
  logNodeError(nodeId: string, nodeName: string, nodeType: string, error: Error, duration: number): void {
    this.addLog('error', `❌ ${nodeName} failed: ${error.message}`, null, nodeId, nodeName, nodeType, duration, {
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    });
  }

  /**
   * Complete the current execution log
   */
  completeExecution(outputs?: Record<string, any>, error?: Error): WorkflowExecutionLog | null {
    if (!this.currentLog) return null;

    this.currentLog.endTime = new Date().toISOString();
    this.currentLog.duration = new Date(this.currentLog.endTime).getTime() - new Date(this.currentLog.startTime).getTime();
    this.currentLog.outputs = outputs;

    if (error) {
      this.currentLog.status = 'error';
      this.currentLog.error = {
        message: error.message,
        stack: error.stack
      };
      this.addLog('error', `💥 Workflow execution failed: ${error.message}`, null, undefined, undefined, undefined, undefined, {
        message: error.message,
        stack: error.stack
      });
    } else {
      this.currentLog.status = 'success';
      this.addLog('info', `🎉 Workflow execution completed successfully in ${this.currentLog.duration}ms`);
    }

    const completedLog = { ...this.currentLog };
    this.currentLog = null;
    return completedLog;
  }

  /**
   * Get the current execution log
   */
  getCurrentLog(): WorkflowExecutionLog | null {
    return this.currentLog;
  }

  /**
   * Add a listener for real-time log updates
   */
  addLogListener(listener: (log: ExecutionLogEntry) => void): void {
    this.logListeners.push(listener);
  }

  /**
   * Remove a log listener
   */
  removeLogListener(listener: (log: ExecutionLogEntry) => void): void {
    const index = this.logListeners.indexOf(listener);
    if (index > -1) {
      this.logListeners.splice(index, 1);
    }
  }

  /**
   * Export logs to a structured format for analysis
   */
  exportLog(log: WorkflowExecutionLog): string {
    return JSON.stringify(log, null, 2);
  }

  /**
   * Save log to file (for browser environments)
   */
  async saveLogToFile(log: WorkflowExecutionLog): Promise<void> {
    const filename = `${log.workflowName}_${log.workflowId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const content = this.exportLog(log);

    if (typeof window !== 'undefined') {
      // Browser environment
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Node.js environment
      const fs = await import('fs');
      const path = await import('path');
      const logsDir = path.join(process.cwd(), 'execution_logs');
      
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(logsDir, filename), content);
      console.log(`📁 Log saved to: execution_logs/${filename}`);
    }
  }

  /**
   * Format console output for better readability
   */
  private formatConsoleOutput(log: ExecutionLogEntry): void {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const icon = this.getLogIcon(log.level);
    
    // Different styling based on log level and content
    if (log.nodeId && log.nodeName) {
      // Node-specific log
      const nodeInfo = `${log.nodeName} (${log.nodeType || 'unknown'})`;
      const duration = log.duration ? ` • ${log.duration}ms` : '';
      
      console.group(`${icon} ${log.message}`);
      console.log(`🕐 ${time}${duration}`);
      console.log(`🎯 Node: ${nodeInfo}`);
      
      if (log.data && Object.keys(log.data).length > 0) {
        console.log('📊 Data:', log.data);
      }
      
      if (log.error) {
        console.error('❗ Error Details:', {
          message: log.error.message,
          code: log.error.code,
          stack: log.error.stack
        });
      }
      
      console.groupEnd();
    } else {
      // General workflow log
      console.log(`${icon} ${log.message} • ${time}`);
      
      if (log.data && Object.keys(log.data).length > 0) {
        console.log('📊 Details:', log.data);
      }
      
      if (log.error) {
        console.error('❗ Error:', log.error);
      }
    }
  }

  /**
   * Get appropriate icon for log level
   */
  private getLogIcon(level: ExecutionLogEntry['level']): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  }

  /**
   * Generate a summary report for easier analysis
   */
  generateSummaryReport(log: WorkflowExecutionLog): string {
    const duration = log.duration ? `${log.duration}ms` : 'Unknown';
    const successRate = log.nodeCount > 0 ? ((log.successfulNodes / log.nodeCount) * 100).toFixed(1) : '0';
    
    const report = [
      '═'.repeat(60),
      `📊 WORKFLOW EXECUTION SUMMARY`,
      '═'.repeat(60),
      `Workflow: ${log.workflowName} (${log.workflowId})`,
      `Status: ${log.status.toUpperCase()} ${log.status === 'success' ? '✅' : '❌'}`,
      `Duration: ${duration}`,
      `Nodes: ${log.successfulNodes}/${log.nodeCount} successful (${successRate}%)`,
      '',
      '📈 EXECUTION DETAILS:',
      `• Start Time: ${new Date(log.startTime).toLocaleString()}`,
      `• End Time: ${log.endTime ? new Date(log.endTime).toLocaleString() : 'N/A'}`,
      `• Environment: ${log.metadata.environment}`,
      '',
      '📥 INPUTS:',
      Object.keys(log.inputs).length > 0 
        ? Object.entries(log.inputs).map(([key, value]) => `• ${key}: ${JSON.stringify(value)}`).join('\n')
        : '• No inputs',
      '',
      log.outputs ? '📤 OUTPUTS:' : '',
      log.outputs 
        ? Object.entries(log.outputs).map(([key, value]) => `• ${key}: ${JSON.stringify(value)}`).join('\n')
        : '',
      log.error ? '\n❌ ERROR DETAILS:' : '',
      log.error ? `• Message: ${log.error.message}` : '',
      log.error?.failedNodeName ? `• Failed Node: ${log.error.failedNodeName}` : '',
      '',
      '📝 EXECUTION LOG ENTRIES:',
      `• Total entries: ${log.logs.length}`,
      `• Errors: ${log.logs.filter(l => l.level === 'error').length}`,
      `• Warnings: ${log.logs.filter(l => l.level === 'warn').length}`,
      '═'.repeat(60)
    ].filter(line => line !== '').join('\n');

    return report;
  }
}

// Export singleton instance
export const workflowLogger = new WorkflowExecutionLogger();
