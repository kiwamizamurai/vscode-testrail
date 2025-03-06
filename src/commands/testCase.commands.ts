import * as vscode from "vscode";
import {
  TestCase,
  UpdateTestCase,
  TestRailClient,
} from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { SectionItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";
import os from "os";
import path from "path";
import fs from "fs";

export class TestCaseCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleOpenTestCase(testCase: TestCase): Promise<void> {
    try {
      // Get host from auth
      const host = await this.auth.getHost();

      // Get attachments
      const attachments = await this.client.attachments.getForCase(testCase.id);

      // Prepare data for React webview
      const data = {
        testCase,
        host,
        attachments,
      };

      // Use ReactWebviewProvider instead of WebviewManager
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "testCase",
        `TestCase: ${testCase.title}`,
        testCase.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "saveTestCase":
            await this.handleUpdateTestCase(testCase.id, message.data);
            break;
          case "uploadAttachment":
            await this.handleUploadAttachment(testCase.id, message.data);
            break;
          case "deleteAttachment":
            await this.handleConfirmDeleteAttachment(
              message.data.attachmentId,
              message.data.testCaseId
            );
            break;
          case "getAttachment":
            await this.handleGetAttachment(message.data.id, panel.webview);
            break;
          case "downloadAttachment":
            await this.handleDownloadAttachment(
              message.data.id,
              message.data.filename
            );
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error opening test case: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async handleAddTestCase(arg: SectionItem): Promise<TestCase | void> {
    try {
      const title = await vscode.window.showInputBox({
        prompt: "Enter test case title",
        placeHolder: "Test case title",
      });

      if (!title) return;

      const testCase = await this.client.cases.add(arg.section.id, {
        title,
        template_id: 1,
        type_id: 1,
        priority_id: 3,
      });

      vscode.window.showInformationMessage(
        `Test case "${title}" created successfully`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return testCase;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create test case: ${error}`);
    }
  }

  async handleDeleteTestCase(
    arg: TestCase | { testCase: TestCase }
  ): Promise<void> {
    const testCase = "id" in arg ? arg : arg.testCase;
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete test case "${testCase.title}"?`,
        { modal: true },
        "Delete"
      );

      if (confirm === "Delete") {
        await this.client.cases.delete(testCase.id);
        vscode.window.showInformationMessage(
          `Test case "${testCase.title}" deleted successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete test case: ${error}`);
    }
  }

  async handleDuplicateTestCase(
    arg: TestCase | { testCase: TestCase }
  ): Promise<TestCase | void> {
    const testCase = "id" in arg ? arg : arg.testCase;
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
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return duplicatedCase;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to duplicate test case: ${error}`);
    }
  }

  private async handleUpdateTestCase(
    testCaseId: number,
    data: UpdateTestCase
  ): Promise<void> {
    try {
      // Update the test case
      const updatedTestCase = await this.client.cases.update(testCaseId, data);

      // Refresh the webview with updated content
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.getExistingPanel(
        "testCase",
        testCaseId
      );

      if (panel) {
        try {
          // Get attachments for the test case
          const attachments = await this.client.attachments.getForCase(
            testCaseId
          );

          // Completely refresh the webview with new content instead of partial update
          const host = await this.auth.getHost();
          if (host) {
            // Update the webview with the new data instead of refreshing the HTML
            reactWebviewProvider.updatePanelData("testCase", testCaseId, {
              testCase: updatedTestCase,
              host,
              attachments,
            });
          }

          // Show success message after webview is updated
          vscode.window.showInformationMessage(
            "Test case updated successfully"
          );
        } catch (innerError) {
          console.error("Error updating webview:", innerError);
          // Even if webview update fails, still show success for the save operation
          vscode.window.showInformationMessage(
            "Test case updated successfully, but view refresh failed"
          );

          // Force reset the save button
          panel.webview.postMessage({
            type: "resetSaveButton",
          });
        }
      } else {
        // No panel found, just show success message
        vscode.window.showInformationMessage("Test case updated successfully");
      }

      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update test case: ${error}`);

      // Try to reset the save button on error
      try {
        const reactWebviewProvider = ReactWebviewProvider.getInstance(
          this.context.extensionUri
        );
        const panel = reactWebviewProvider.getExistingPanel(
          "testCase",
          testCaseId
        );
        if (panel) {
          panel.webview.postMessage({
            type: "resetSaveButton",
          });
        }
      } catch (e) {
        console.error("Failed to reset save button:", e);
      }
    }
  }

  private async handleUploadAttachment(
    testCaseId: number,
    data: any
  ): Promise<void> {
    try {
      if (!data) {
        // Fallback to file dialog if no data is provided
        const result = await vscode.window.showOpenDialog({
          canSelectMany: false,
          openLabel: "Upload",
        });

        if (!result || result.length === 0) return;

        const filePath = result[0].fsPath;
        await this.client.attachments.addToCase(testCaseId, filePath);
      } else {
        // Use the file data sent from the frontend
        const { fileName, fileData } = data;

        // Create a temporary file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, fileName);

        // Write the base64 data to the temporary file
        fs.writeFileSync(tempFilePath, Buffer.from(fileData, "base64"));

        // Upload the file
        await this.client.attachments.addToCase(testCaseId, tempFilePath);

        // Clean up the temporary file
        fs.unlinkSync(tempFilePath);
      }

      // Refresh attachments list
      const attachments = await this.client.attachments.getForCase(testCaseId);

      // Get the updated test case
      const updatedTestCase = await this.client.cases.get(testCaseId);

      // Completely refresh the webview with new content
      const host = await this.auth.getHost();
      if (host) {
        // Find the panel using ReactWebviewProvider
        const reactWebviewProvider = ReactWebviewProvider.getInstance(
          this.context.extensionUri
        );

        // Update the webview with the new data
        reactWebviewProvider.updatePanelData("testCase", testCaseId, {
          testCase: updatedTestCase,
          host,
          attachments,
        });
      }

      vscode.window.showInformationMessage("Attachment uploaded successfully");
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to upload attachment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async handleDeleteAttachment(
    attachmentId: number | string,
    testCaseId: number
  ): Promise<void> {
    try {
      console.log(`Deleting attachment with ID: ${attachmentId}`);

      // Ensure we're passing a number to the API
      const numericId =
        typeof attachmentId === "string"
          ? parseInt(attachmentId, 10)
          : attachmentId;

      if (isNaN(numericId)) {
        throw new Error(`Invalid attachment ID: ${attachmentId}`);
      }

      console.log(`Deleting attachment with numeric ID: ${numericId}`);
      await this.client.attachments.delete(numericId);

      // Refresh attachments list
      const updatedAttachments = await this.client.attachments.getForCase(
        testCaseId
      );

      // Get the updated test case
      const updatedTestCase = await this.client.cases.get(testCaseId);

      // Completely refresh the webview with new content
      const host = await this.auth.getHost();
      if (host) {
        // Find the panel using ReactWebviewProvider
        const reactWebviewProvider = ReactWebviewProvider.getInstance(
          this.context.extensionUri
        );

        // Update the webview with the new data
        reactWebviewProvider.updatePanelData("testCase", testCaseId, {
          testCase: updatedTestCase,
          host,
          attachments: updatedAttachments,
        });
      }

      vscode.window.showInformationMessage("Attachment deleted successfully");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      vscode.window.showErrorMessage(
        `Failed to delete attachment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async handleGetAttachment(
    attachmentId: string,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const buffer = await this.client.attachments.get(attachmentId);
      const base64Data = buffer.toString("base64");
      webview.postMessage({
        type: "attachmentData",
        id: attachmentId,
        data: base64Data,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get attachment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async handleConfirmDeleteAttachment(
    attachmentId: string,
    testCaseId: number
  ): Promise<void> {
    console.log("Confirming delete for attachmentId:", attachmentId);
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to delete this attachment?\n\nThis action cannot be undone.",
      { modal: true },
      "Delete"
    );

    if (confirm === "Delete") {
      await this.handleDeleteAttachment(attachmentId, testCaseId);
    }
  }

  async handleMoveTestCase(
    testCaseId: number,
    sectionId: number,
    suiteId: number
  ): Promise<void> {
    try {
      await this.client.cases.moveToSection(sectionId, suiteId, [testCaseId]);
      vscode.window.showInformationMessage("Test case moved successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to move test case: ${error}`);
    }
  }

  private async handleDownloadAttachment(
    attachmentId: string,
    filename: string
  ): Promise<void> {
    try {
      const buffer = await this.client.attachments.get(attachmentId);

      // Save to a temporary file
      const filePath = path.join(os.tmpdir(), filename);
      fs.writeFileSync(filePath, buffer);

      // Open the file with the default application
      vscode.env.openExternal(vscode.Uri.file(filePath));

      vscode.window.showInformationMessage(`Opening ${filename}`);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to download attachment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
