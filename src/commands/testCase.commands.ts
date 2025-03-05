import * as vscode from 'vscode';
import { TestCase, UpdateTestCase, TestRailClient } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { getWebviewContent } from '../webview';
import { SectionItem } from '../treeView';
import { WebviewManager } from '../WebviewManager';

export class TestCaseCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth
  ) {}

  async handleOpenTestCase(testCase: TestCase): Promise<void> {
    const webviewManager = WebviewManager.getInstance();
    const panel = webviewManager.createOrShowWebviewPanel(
      'testCase',
      `TestCase: ${testCase.title}`,
      testCase.id
    );

    const host = this.auth.getHost();
    if (!host) {
      vscode.window.showErrorMessage('TestRail host is not configured');
      return;
    }

    // Get attachments for the test case
    const attachments = await this.client.attachments.getForCase(testCase.id);
    console.log('Fetched attachments:', JSON.stringify(attachments, null, 2));
    panel.webview.html = await getWebviewContent(testCase, host, attachments);

    panel.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.command) {
          case 'updateTestCase':
            await this.handleUpdateTestCase(testCase.id, message.data);
            break;
          case 'deleteTestCase':
            await this.handleDeleteTestCase(testCase);
            break;
          case 'upload':
            await this.handleUploadAttachment(testCase.id, panel.webview);
            break;
          case 'confirmDeleteAttachment':
            await this.handleConfirmDeleteAttachment(message.id, panel.webview, testCase.id);
            break;
          case 'getAttachment':
            await this.handleGetAttachment(message.id, panel.webview);
            break;
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  async handleAddTestCase(arg: SectionItem): Promise<TestCase | void> {
    try {
      const title = await vscode.window.showInputBox({
        prompt: 'Enter test case title',
        placeHolder: 'Test case title',
      });

      if (!title) return;

      const testCase = await this.client.cases.add(arg.section.id, {
        title,
        template_id: 1,
        type_id: 1,
        priority_id: 3,
      });

      vscode.window.showInformationMessage(`Test case "${title}" created successfully`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
      return testCase;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create test case: ${error}`);
    }
  }

  async handleDeleteTestCase(arg: TestCase | { testCase: TestCase }): Promise<void> {
    const testCase = 'id' in arg ? arg : arg.testCase;
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete test case "${testCase.title}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await this.client.cases.delete(testCase.id);
        vscode.window.showInformationMessage(`Test case "${testCase.title}" deleted successfully`);
        vscode.commands.executeCommand('vscode-testrail.refresh');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete test case: ${error}`);
    }
  }

  async handleDuplicateTestCase(arg: TestCase | { testCase: TestCase }): Promise<TestCase | void> {
    const testCase = 'id' in arg ? arg : arg.testCase;
    try {
      // Get the original test case details
      const originalCase = await this.client.cases.get(testCase.id);

      // Create a new test case with the same details
      const duplicatedCase = await this.client.cases.add(testCase.section_id, {
        title: `${originalCase.title} (Copy)`,
        template_id: originalCase.template_id,
        type_id: originalCase.type_id,
        priority_id: originalCase.priority_id,
        estimate: originalCase.estimate || undefined,
        refs: originalCase.refs || undefined,
        custom_preconds: originalCase.custom_preconds || undefined,
        custom_steps: originalCase.custom_steps || undefined,
        custom_expected: originalCase.custom_expected || undefined,
        custom_steps_separated: originalCase.custom_steps_separated,
      });

      vscode.window.showInformationMessage(`Test case duplicated successfully`);
      vscode.commands.executeCommand('vscode-testrail.refresh');
      return duplicatedCase;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to duplicate test case: ${error}`);
    }
  }

  private async handleUpdateTestCase(testCaseId: number, data: UpdateTestCase): Promise<void> {
    try {
      await this.client.cases.update(testCaseId, data);
      vscode.window.showInformationMessage('Test case updated successfully');
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update test case: ${error}`);
    }
  }

  private async handleUploadAttachment(testCaseId: number, webview: vscode.Webview): Promise<void> {
    try {
      const result = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Upload',
      });

      if (!result || result.length === 0) return;

      const filePath = result[0].fsPath;
      await this.client.attachments.addToCase(testCaseId, filePath);

      // Refresh attachments list
      const attachments = await this.client.attachments.getForCase(testCaseId);
      webview.postMessage({ type: 'refreshAttachments', attachments });

      vscode.window.showInformationMessage('Attachment uploaded successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to upload attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleDeleteAttachment(
    attachmentId: number | string,
    webview: vscode.Webview,
    testCaseId: number
  ): Promise<void> {
    try {
      console.log('Raw attachmentId:', attachmentId, 'Type:', typeof attachmentId);

      await this.client.attachments.delete(attachmentId as number);

      // Refresh attachments list
      const attachments = await this.client.attachments.getForCase(testCaseId);
      console.log('Fetched attachments after delete:', attachments);
      webview.postMessage({ type: 'refreshAttachments', attachments });

      vscode.window.showInformationMessage('Attachment deleted successfully');
    } catch (error) {
      console.error('Delete attachment error:', error);
      vscode.window.showErrorMessage(
        `Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleGetAttachment(attachmentId: string, webview: vscode.Webview): Promise<void> {
    try {
      const buffer = await this.client.attachments.get(attachmentId);
      const base64Data = buffer.toString('base64');
      webview.postMessage({ type: 'attachmentData', id: attachmentId, data: base64Data });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleConfirmDeleteAttachment(
    attachmentId: string,
    webview: vscode.Webview,
    testCaseId: number
  ): Promise<void> {
    console.log('Confirming delete for attachmentId:', attachmentId);
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this attachment?\n\nThis action cannot be undone.',
      { modal: true },
      'Delete'
    );

    if (confirm === 'Delete') {
      await this.handleDeleteAttachment(attachmentId, webview, testCaseId);
    }
  }
}
