import * as vscode from 'vscode';
import { Run, Suite, TestRailClient } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { getRunWebviewContent } from '../webview';
import { RunUpdate } from '../types';
import { SuiteItem, RunsCategoryItem } from '../treeView';

export class RunCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth
  ) {}

  async handleAddRun(arg: Suite | { suite: Suite } | SuiteItem | RunsCategoryItem): Promise<Run | void> {
    try {
      let projectId: number;
      let suiteId: number;

      if (arg instanceof RunsCategoryItem) {
        projectId = arg.projectId;
        suiteId = arg.suiteId;
      } else if (arg instanceof SuiteItem) {
        projectId = arg.projectId;
        suiteId = arg.suite.id;
      } else if ('suite' in arg) {
        // If a suite wrapper is provided
        projectId = arg.suite.project_id;
        suiteId = arg.suite.id;
      } else {
        // If a suite object is provided directly
        projectId = arg.project_id;
        suiteId = arg.id;
      }

      // Get the name for the run
      const name = await vscode.window.showInputBox({
        prompt: 'Enter run name',
        placeHolder: 'Run name',
        validateInput: (value) => {
          return value ? null : 'Name is required';
        }
      });

      if (!name) return;

      // Get the description for the run (optional)
      const description = await vscode.window.showInputBox({
        prompt: 'Enter run description (optional)',
        placeHolder: 'Run description',
      });

      // Ask if all test cases should be included
      const includeAllOption = await vscode.window.showQuickPick(
        [
          { label: 'Include all test cases', value: true },
          { label: 'Select specific test cases', value: false }
        ],
        {
          placeHolder: 'Include all test cases?',
        }
      );

      if (!includeAllOption) return;
      
      const includeAll = includeAllOption.value;
      
      // If not including all, we need to get case IDs
      let caseIds: number[] | undefined;
      if (!includeAll) {
        try {
          // Fetch all test cases for this suite
          console.log(`Fetching test cases for suite ${suiteId} in project ${projectId}`);
          const allCases = await this.client.cases.list(projectId, { suite_id: suiteId });
          console.log(`Found ${allCases.length} test cases`);
          
          if (allCases.length === 0) {
            vscode.window.showWarningMessage('No test cases found in this suite');
            return;
          }
          
          // Create QuickPick items from test cases
          const caseItems = allCases.map(testCase => ({
            label: `C${testCase.id}: ${testCase.title}`,
            description: '',
            id: testCase.id
          }));
          
          // Show QuickPick for selecting test cases
          const quickPick = vscode.window.createQuickPick();
          quickPick.items = caseItems;
          quickPick.placeholder = 'Select test cases to include in the run';
          quickPick.title = 'Select Test Cases';
          quickPick.canSelectMany = true;
          
          const selectedCases = await new Promise<readonly vscode.QuickPickItem[]>((resolve) => {
            quickPick.onDidAccept(() => {
              resolve(quickPick.selectedItems);
              quickPick.hide();
            });
            quickPick.onDidHide(() => {
              resolve([]);
              quickPick.dispose();
            });
            quickPick.show();
          });
          
          if (selectedCases.length === 0) return;
          
          // Extract case IDs from selected items
          caseIds = selectedCases.map(item => (item as any).id);
          console.log(`Selected case IDs: ${caseIds.join(', ')}`);
        } catch (error) {
          console.error('Error fetching test cases:', error);
          vscode.window.showErrorMessage(`Failed to fetch test cases: ${error}`);
          return;
        }
      }

      // Get references (optional)
      const refs = await vscode.window.showInputBox({
        prompt: 'Enter references (optional)',
        placeHolder: 'e.g., JIRA-123, JIRA-456',
      });

      // Create the run
      const run = await this.client.runs.add(projectId, {
        name,
        description: description || undefined,
        suite_id: suiteId,
        include_all: includeAll,
        case_ids: caseIds,
        refs: refs || undefined
      });

      vscode.window.showInformationMessage(`Run "${name}" created successfully`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
      return run;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create run: ${error}`);
    }
  }

  async handleEditRun(arg: Run | { run: Run }): Promise<void> {
    console.log('Handling edit run:', arg);
    const run = 'run' in arg ? arg.run : arg;

    // Check if the run is completed
    if (run.is_completed) {
      vscode.window.showWarningMessage(
        'This run is completed. Some operations may not be available. To make changes, reopen the run in TestRail web interface first.'
      );
    }

    const panel = vscode.window.createWebviewPanel(
      'run',
      `Run: ${run.name}`,
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

    panel.webview.html = await getRunWebviewContent(run, host);

    panel.webview.onDidReceiveMessage(async (message) => {
      console.log('Received message in run commands:', message);
      switch (message.command) {
        case 'updateRun':
          await this.handleUpdateRun(run.id, message.data);
          break;
        case 'deleteRun':
          await this.handleDeleteRun(run);
          break;
        case 'closeRun':
          await this.handleCloseRun(run);
          break;
      }
    });
  }

  async handleDeleteRun(arg: Run | { run: Run }): Promise<void> {
    const run = 'run' in arg ? arg.run : arg;
    try {
      // Check if the run is completed
      if (run.is_completed) {
        vscode.window.showErrorMessage(
          'Cannot delete a completed run. Please reopen the run in TestRail web interface first.'
        );
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete run "${run.name}"? This will permanently delete all tests and results in this run.`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await this.client.runs.delete(run.id);
        vscode.window.showInformationMessage(`Run "${run.name}" deleted successfully`);
        vscode.commands.executeCommand('vscode-testrail.refresh');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete run: ${error}`);
    }
  }

  async handleCloseRun(arg: Run | { run: Run }): Promise<void> {
    const run = 'run' in arg ? arg.run : arg;
    try {
      // Check if the run is already completed
      if (run.is_completed) {
        vscode.window.showErrorMessage(
          'This run is already completed.'
        );
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to close run "${run.name}"? This will archive all tests and results.`,
        { modal: true },
        'Close'
      );

      if (confirm === 'Close') {
        await this.client.runs.close(run.id);
        vscode.window.showInformationMessage(`Run "${run.name}" closed successfully`);
        vscode.commands.executeCommand('vscode-testrail.refresh');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to close run: ${error}`);
    }
  }

  private async handleUpdateRun(runId: number, data: RunUpdate): Promise<void> {
    try {
      // Try to get the run to check if it's completed
      try {
        const run = await this.client.runs.get(runId);
        
        if (run.is_completed) {
          vscode.window.showErrorMessage(
            'Cannot update a completed run. Please reopen the run in TestRail web interface first.'
          );
          return;
        }
      } catch (error) {
        // If we can't get the run, we should not proceed with the update
        // as it might be due to the run being completed or other API restrictions
        console.error('Error fetching run:', error);
        vscode.window.showErrorMessage(
          `Failed to check run status: ${error}. The run might be completed or have other restrictions.`
        );
        return;
      }

      console.log('Updating run with id:', runId, 'and data:', data);
      await this.client.runs.update(runId, {
        name: data.name,
        description: data.description,
        milestone_id: data.milestone_id,
        include_all: data.include_all,
        case_ids: data.case_ids,
        refs: data.refs
      });
      vscode.window.showInformationMessage('Run updated successfully');
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      console.error('Failed to update run:', error);
      vscode.window.showErrorMessage(`Failed to update run: ${error}`);
    }
  }
} 