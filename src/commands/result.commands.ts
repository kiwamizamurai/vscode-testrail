import * as vscode from 'vscode';
import { Test, TestRailClient, Run } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { TestItem } from '../treeView';
import { getResultWebviewContent } from '../webview';

export class ResultCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth
  ) {}

  async handleAddResult(arg: Test | TestItem): Promise<void> {
    try {
      const test = arg instanceof TestItem ? arg.test : arg;
      
      // Get the status for the result
      const statuses = await this.client.statuses.list();
      const statusOptions = statuses.map(status => ({
        label: status.name,
        description: status.label || '',
        id: status.id
      }));
      
      const selectedStatus = await vscode.window.showQuickPick(
        statusOptions,
        {
          placeHolder: 'Select test status',
          title: 'Test Result Status'
        }
      );
      
      if (!selectedStatus) return;
      
      // Get the comment for the result
      const comment = await vscode.window.showInputBox({
        prompt: 'Enter result comment (optional)',
        placeHolder: 'Comment',
      });
      
      // Get the defects for the result
      const defects = await vscode.window.showInputBox({
        prompt: 'Enter defects (optional)',
        placeHolder: 'e.g., TR-123, BUG-456',
      });
      
      // Get the elapsed time for the result
      const elapsed = await vscode.window.showInputBox({
        prompt: 'Enter elapsed time (optional)',
        placeHolder: 'e.g., 30s, 1m 45s',
        validateInput: (value) => {
          if (!value) return null;
          // Simple validation for time format
          if (!/^(\d+[ms](?: \d+[ms])?)?$/.test(value)) {
            return 'Invalid time format. Use format like "30s" or "1m 45s"';
          }
          return null;
        }
      });
      
      // Get the version for the result
      const version = await vscode.window.showInputBox({
        prompt: 'Enter version (optional)',
        placeHolder: 'e.g., 1.0.0',
      });
      
      // Create the result
      await this.client.results.add(test.id, {
        status_id: selectedStatus.id,
        comment: comment || undefined,
        defects: defects || undefined,
        elapsed: elapsed || undefined,
        version: version || undefined
      });
      
      vscode.window.showInformationMessage(`Result added successfully for test "${test.title}"`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add result: ${error}`);
    }
  }
  
  async handleViewResults(arg: Test | TestItem): Promise<void> {
    try {
      const test = arg instanceof TestItem ? arg.test : arg;
      const parentRun = arg instanceof TestItem ? arg.parentRun : undefined;
      
      // Debug logging
      console.log(`Viewing results for test with ID: ${test.id}, type: ${typeof test.id}`);
      console.log(`Test object:`, JSON.stringify(test, null, 2));
      
      // Validate test ID
      if (test.id === undefined || test.id === null) {
        vscode.window.showErrorMessage(`Cannot view results: Test ID is undefined`);
        return;
      }
      
      if (isNaN(Number(test.id))) {
        vscode.window.showErrorMessage(`Cannot view results: Test ID "${test.id}" is not a valid number`);
        return;
      }
      
      // Create a webview panel to display results
      const panel = vscode.window.createWebviewPanel(
        'testResults',
        `Results: ${test.title}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
      
      const host = this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage('TestRail host is not configured');
        return;
      }
      
      // Ensure test.id is a number
      const testId = Number(test.id);
      
      // Get results for the test
      const results = await this.client.results.list(testId);
      
      // Get statuses for displaying status names
      const statuses = await this.client.statuses.list();
      
      // Generate HTML content for the webview
      panel.webview.html = await getResultWebviewContent(test, results, statuses, host, parentRun);
      
      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        console.log('Received message in result commands:', message);
        switch (message.command) {
          case 'addResult':
            await this.handleAddResult(test);
            // Refresh the webview after adding a result
            const updatedResults = await this.client.results.list(testId);
            panel.webview.html = await getResultWebviewContent(test, updatedResults, statuses, host, parentRun);
            break;
          case 'deleteResult':
            await this.handleDeleteResult(message.resultId);
            // Refresh the webview after deleting a result
            const refreshedResults = await this.client.results.list(testId);
            panel.webview.html = await getResultWebviewContent(test, refreshedResults, statuses, host, parentRun);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to view results: ${error}`);
    }
  }
  
  private async handleDeleteResult(_resultId: number): Promise<void> {
    try {
      // Note: TestRail API doesn't support deleting results directly
      // This would typically show an error message explaining this limitation
      vscode.window.showWarningMessage(
        'TestRail API does not support deleting individual results. You can only delete an entire test run.'
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Operation failed: ${error}`);
    }
  }
  
  async handleBulkAddResults(arg: Run | { run: Run }): Promise<void> {
    try {
      const run = 'run' in arg ? arg.run : arg;
      
      // Get tests for this run
      const tests = await this.client.tests.list(run.id);
      
      if (tests.length === 0) {
        vscode.window.showInformationMessage(`No tests found in run "${run.name}"`);
        return;
      }
      
      // Get the status for all results
      const statuses = await this.client.statuses.list();
      const statusOptions = statuses.map(status => ({
        label: status.name,
        description: status.label || '',
        id: status.id
      }));
      
      const selectedStatus = await vscode.window.showQuickPick(
        statusOptions,
        {
          placeHolder: 'Select test status for all tests',
          title: 'Bulk Test Result Status'
        }
      );
      
      if (!selectedStatus) return;
      
      // Get the comment for all results
      const comment = await vscode.window.showInputBox({
        prompt: 'Enter result comment for all tests (optional)',
        placeHolder: 'Comment',
      });
      
      // Get the elapsed time for all results
      const elapsed = await vscode.window.showInputBox({
        prompt: 'Enter elapsed time for all tests (optional)',
        placeHolder: 'e.g., 30s, 1m 45s',
        validateInput: (value) => {
          if (!value) return null;
          // Simple validation for time format
          if (!/^(\d+[ms](?: \d+[ms])?)?$/.test(value)) {
            return 'Invalid time format. Use format like "30s" or "1m 45s"';
          }
          return null;
        }
      });
      
      // Get the version for all results
      const version = await vscode.window.showInputBox({
        prompt: 'Enter version for all tests (optional)',
        placeHolder: 'e.g., 1.0.0',
      });
      
      // Add results for each test individually since bulk API is not working correctly
      const promises = tests.map(test => 
        this.client.results.add(test.id, {
          status_id: selectedStatus.id,
          comment: comment || undefined,
          elapsed: elapsed || undefined,
          version: version || undefined
        })
      );
      
      await Promise.all(promises);
      
      vscode.window.showInformationMessage(`Results added successfully for ${tests.length} tests in run "${run.name}"`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add results: ${error}`);
    }
  }
} 