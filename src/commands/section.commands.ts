import * as vscode from 'vscode';
import { TestRailClient, Section } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { getSectionWebviewContent } from '../webview';
import { SuiteItem, SectionItem } from '../treeView';

export class SectionCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth
  ) {}

  async handleAddSection(arg: SuiteItem | SectionItem): Promise<Section | void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter section name',
        placeHolder: 'Section name',
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Enter section description (optional)',
        placeHolder: 'Section description',
      });

      const suiteId = 'suite' in arg ? arg.suite.id : arg.section.suite_id;
      const parentId = 'section' in arg ? arg.section.id : undefined;
      const projectId = 'suite' in arg ? arg.projectId : arg.projectId;

      const section = await this.client.sections.add(projectId, {
        name,
        description: description || '',
        parent_id: parentId,
        suite_id: suiteId,
      });

      vscode.window.showInformationMessage(`Section "${name}" created successfully`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
      return section;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create section: ${error}`);
    }
  }

  async handleEditSection(sectionItem: SectionItem): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'section',
      `Section: ${sectionItem.section.name}`,
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

    panel.webview.html = await getSectionWebviewContent(sectionItem.section, host);

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'updateSection':
          await this.handleUpdateSection(sectionItem.section.id, message.data);
          break;
        case 'deleteSection':
          await this.handleDeleteSection(sectionItem);
          break;
      }
    });
  }

  async handleDeleteSection(sectionItem: SectionItem): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete section "${sectionItem.section.name}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await this.client.sections.delete(sectionItem.section.id);
        vscode.window.showInformationMessage(
          `Section "${sectionItem.section.name}" deleted successfully`
        );
        vscode.commands.executeCommand('vscode-testrail.refresh');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete section: ${error}`);
    }
  }

  private async handleUpdateSection(
    sectionId: number,
    data: { name?: string; description?: string }
  ): Promise<void> {
    try {
      await this.client.sections.update(sectionId, {
        name: data.name,
        description: data.description || undefined,
      });
      vscode.window.showInformationMessage('Section updated successfully');
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update section: ${error}`);
    }
  }
}
