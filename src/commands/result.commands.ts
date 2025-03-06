import * as vscode from "vscode";
import { Test, TestRailClient } from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { TestItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";

export class ResultCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleAddResult(arg: Test | TestItem): Promise<void> {
    try {
      const test = arg instanceof TestItem ? arg.test : arg;

      // Get the status for the result
      const statuses = await this.client.statuses.list();
      const statusOptions = statuses.map((status) => ({
        label: status.name,
        description: status.label || "",
        id: status.id,
      }));

      const selectedStatus = await vscode.window.showQuickPick(statusOptions, {
        placeHolder: "Select test status",
        title: "Test Result Status",
      });

      if (!selectedStatus) return;

      // Get the comment for the result
      const comment = await vscode.window.showInputBox({
        prompt: "Enter result comment (optional)",
        placeHolder: "Comment",
      });

      // Get the defects for the result
      const defects = await vscode.window.showInputBox({
        prompt: "Enter defects (optional)",
        placeHolder: "e.g., TR-123, BUG-456",
      });

      // Get the elapsed time for the result
      const elapsed = await vscode.window.showInputBox({
        prompt: "Enter elapsed time (optional)",
        placeHolder: "e.g., 30s, 1m 45s",
        validateInput: (value) => {
          if (!value) return null;
          // Simple validation for time format
          if (!/^(\d+[ms](?: \d+[ms])?)?$/.test(value)) {
            return 'Invalid time format. Use format like "30s" or "1m 45s"';
          }
          return null;
        },
      });

      // Get the version for the result
      const version = await vscode.window.showInputBox({
        prompt: "Enter version (optional)",
        placeHolder: "e.g., 1.0.0",
      });

      // Create the result
      await this.client.results.add(test.id, {
        status_id: selectedStatus.id,
        comment: comment || undefined,
        defects: defects || undefined,
        elapsed: elapsed || undefined,
        version: version || undefined,
      });

      vscode.window.showInformationMessage(
        `Result added successfully for test "${test.title}"`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to add result: ${error}`);
    }
  }

  async handleViewResults(arg: Test | TestItem): Promise<void> {
    try {
      const test = arg instanceof TestItem ? arg.test : arg;

      // Get host from auth
      const host = await this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage("TestRail host is not configured");
        return;
      }

      // Get results and statuses
      const results = await this.client.results.list(test.id);
      const statuses = await this.client.statuses.list();

      // Get parent run if available
      const parentRun = test.run_id
        ? await this.client.runs.get(test.run_id)
        : undefined;

      // Prepare data for React webview
      const data = {
        test,
        results,
        statuses,
        host,
        parentRun,
      };

      // Use ReactWebviewProvider
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "result",
        `Results: ${test.title}`,
        test.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "addResult":
            await this.handleAddResult(test);
            break;
          case "deleteResult":
            await this.handleDeleteResult(message.resultId);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error viewing results: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async handleDeleteResult(_resultId: number): Promise<void> {
    try {
      // Note: TestRail API doesn't support deleting results directly
      // This would typically show an error message explaining this limitation
      vscode.window.showWarningMessage(
        "TestRail API does not support deleting individual results. You can only delete an entire test run."
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Operation failed: ${error}`);
    }
  }
}
