import * as vscode from 'vscode';
import { Project, Suite, TestRailClient } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { getSuiteWebviewContent } from '../webview';
import { SuiteUpdate } from '../types';
import { SuiteItem } from '../treeView';
import { WebviewManager } from '../WebviewManager';

export class SuiteCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth
  ) {}

  async handleAddSuite(arg: Project | { project: Project }): Promise<Suite | void> {
    const project = 'id' in arg ? arg : arg.project;
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter suite name',
        placeHolder: 'Suite name',
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Enter suite description (optional)',
        placeHolder: 'Suite description',
      });

      const suite = await this.client.suites.add(project.id, {
        name,
        description: description || '',
      });

      vscode.window.showInformationMessage(`Suite "${name}" created successfully`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
      return suite;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create suite: ${error}`);
    }
  }

  async handleEditSuite(arg: Suite | { suite: Suite } | SuiteItem): Promise<void> {
    console.log('Handling edit suite:', arg);
    let suite: Suite;
    if ('suite' in arg) {
      suite = arg.suite;
    } else if (arg instanceof SuiteItem) {
      suite = arg.suite;
    } else {
      suite = arg;
    }

    const webviewManager = WebviewManager.getInstance();
    const panel = webviewManager.createOrShowWebviewPanel(
      'suite',
      `Suite: ${suite.name}`,
      suite.id
    );

    const host = this.auth.getHost();
    if (!host) {
      vscode.window.showErrorMessage('TestRail host is not configured');
      return;
    }

    panel.webview.html = getSuiteWebviewContent(suite, host);

    panel.webview.onDidReceiveMessage(async (message) => {
      console.log('Received message in suite commands:', message);
      switch (message.command) {
        case 'updateSuite':
          await this.handleUpdateSuite(suite.id, message.data);
          break;
        case 'deleteSuite':
          await this.handleDeleteSuite(suite);
          break;
      }
    });
  }

  async handleDeleteSuite(arg: Suite | { suite: Suite }): Promise<void> {
    const suite = 'id' in arg ? arg : arg.suite;
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete suite "${suite.name}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await this.client.suites.delete(suite.id);
        vscode.window.showInformationMessage(`Suite "${suite.name}" deleted successfully`);
        vscode.commands.executeCommand('vscode-testrail.refresh');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete suite: ${error}`);
    }
  }

  private async handleUpdateSuite(suiteId: number, data: SuiteUpdate): Promise<void> {
    try {
      const id = data.id || suiteId;
      console.log('Updating suite with id:', id, 'and data:', data);
      await this.client.suites.update(id, {
        name: data.name || undefined,
        description: data.description || undefined,
      });
      vscode.window.showInformationMessage('Suite updated successfully');
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      console.error('Failed to update suite:', error);
      vscode.window.showErrorMessage(`Failed to update suite: ${error}`);
    }
  }
}
