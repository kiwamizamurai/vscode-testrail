import * as vscode from 'vscode';
import { TestCase, UpdateTestCase, TestRailClient, Attachment } from 'testrail-modern-client';
import { TestRailAuth } from '../auth';
import { getTestCaseWebviewContent } from '../webview';
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

    // Set initial loading HTML
    panel.webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Loading Test Case...</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          padding: 0;
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .loading-container {
          text-align: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 5px solid var(--vscode-progressBar-background);
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loading-container">
        <div class="spinner"></div>
        <h2>Loading Test Case...</h2>
        <p>Please wait while we fetch the test case details.</p>
      </div>
    </body>
    </html>`;

    const host = this.auth.getHost();
    if (!host) {
      vscode.window.showErrorMessage('TestRail host is not configured');
      return;
    }

    try {
      // Get attachments for the test case
      const attachments = await this.client.attachments.getForCase(testCase.id);

      // Use the imported function instead of requiring it
      panel.webview.html = await getTestCaseWebviewContent(
        testCase, 
        host, 
        attachments,
      );

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
              await this.handleUploadAttachment(testCase.id);
              break;
            case 'confirmDeleteAttachment':
              await this.handleConfirmDeleteAttachment(message.id, testCase.id);
              break;
            case 'getAttachment':
              await this.handleGetAttachment(message.id, panel.webview);
              break;
            case 'moveTestCase':
              await this.handleMoveTestCase(testCase.id, message.data.sectionId, message.data.suiteId);
              break;
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      });
    } catch (error) {
      console.error('Error setting up test case webview:', error);
      vscode.window.showErrorMessage(
        `Failed to load test case details: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
      // Update the test case
      const updatedTestCase = await this.client.cases.update(testCaseId, data);
      
      // Refresh the webview with updated content
      const webviewManager = WebviewManager.getInstance();
      const panel = webviewManager.getExistingPanel('testCase', testCaseId);
      
      if (panel) {
        try {
          // Get attachments for the test case
          const attachments = await this.client.attachments.getForCase(testCaseId);

          // Completely refresh the webview with new content instead of partial update
          const host = this.auth.getHost();
          if (host) {
            panel.webview.html = await getTestCaseWebviewContent(
              updatedTestCase,
              host,
              attachments
            );
          }
          
          // Show success message after webview is updated
          vscode.window.showInformationMessage('Test case updated successfully');
        } catch (innerError) {
          console.error('Error updating webview:', innerError);
          // Even if webview update fails, still show success for the save operation
          vscode.window.showInformationMessage('Test case updated successfully, but view refresh failed');
          
          // Force reset the save button
          panel.webview.postMessage({
            type: 'resetSaveButton'
          });
        }
      } else {
        // No panel found, just show success message
        vscode.window.showInformationMessage('Test case updated successfully');
      }
      
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update test case: ${error}`);
      
      // Try to reset the save button on error
      try {
        const webviewManager = WebviewManager.getInstance();
        const panel = webviewManager.getExistingPanel('testCase', testCaseId);
        if (panel) {
          panel.webview.postMessage({
            type: 'resetSaveButton'
          });
        }
      } catch (e) {
        console.error('Failed to reset save button:', e);
      }
    }
  }

  private async handleUploadAttachment(testCaseId: number): Promise<void> {
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
      
      // Get the updated test case
      const updatedTestCase = await this.client.cases.get(testCaseId);
      
      // Completely refresh the webview with new content
      const host = this.auth.getHost();
      if (host) {
        // Find the panel using WebviewManager
        const webviewManager = WebviewManager.getInstance();
        const panel = webviewManager.getExistingPanel('testCase', testCaseId);
        
        if (panel) {
          panel.webview.html = await getTestCaseWebviewContent(
            updatedTestCase,
            host,
            attachments
          );
        }
      }

      vscode.window.showInformationMessage('Attachment uploaded successfully');
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to upload attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleDeleteAttachment(
    attachmentId: number | string,
    testCaseId: number
  ): Promise<void> {
    try {
      console.log(`Deleting attachment with data_id: ${attachmentId}`);
      
      // The API expects the attachment ID, not the data_id
      // We need to get the actual attachment by its data_id first
      const attachments = await this.client.attachments.getForCase(testCaseId);
      const attachment = attachments.find((a: Attachment) => a.data_id === attachmentId);
      
      if (!attachment) {
        throw new Error(`Attachment with data_id ${attachmentId} not found`);
      }
      
      console.log(`Found attachment: ${JSON.stringify(attachment)}`);
      
      // Make sure we have a valid numeric ID
      if (!attachment.id) {
        throw new Error('Attachment has no ID');
      }
      
      // Ensure we're passing a number to the API
      const numericId = typeof attachment.id === 'string' 
        ? parseInt(attachment.id, 10) 
        : attachment.id;
        
      if (isNaN(numericId)) {
        throw new Error(`Invalid attachment ID: ${attachment.id}`);
      }
      
      console.log(`Deleting attachment with ID: ${numericId}`);
      await this.client.attachments.delete(numericId);

      // Refresh attachments list
      const updatedAttachments = await this.client.attachments.getForCase(testCaseId);
      
      // Get the updated test case
      const updatedTestCase = await this.client.cases.get(testCaseId);
      
      // Completely refresh the webview with new content
      const host = this.auth.getHost();
      if (host) {
        // Find the panel using WebviewManager
        const webviewManager = WebviewManager.getInstance();
        const panel = webviewManager.getExistingPanel('testCase', testCaseId);
        
        if (panel) {
          panel.webview.html = await getTestCaseWebviewContent(
            updatedTestCase,
            host,
            updatedAttachments
          );
        }
      }

      vscode.window.showInformationMessage('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error);
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
    testCaseId: number
  ): Promise<void> {
    console.log('Confirming delete for attachmentId:', attachmentId);
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this attachment?\n\nThis action cannot be undone.',
      { modal: true },
      'Delete'
    );

    if (confirm === 'Delete') {
      await this.handleDeleteAttachment(attachmentId, testCaseId);
    }
  }

  async handleMoveTestCase(testCaseId: number, sectionId: number, suiteId: number): Promise<void> {
    try {
      await this.client.cases.moveToSection(sectionId, suiteId, [testCaseId]);
      vscode.window.showInformationMessage('Test case moved successfully');
      vscode.commands.executeCommand('vscode-testrail.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to move test case: ${error}`);
    }
  }
}
