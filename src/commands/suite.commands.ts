import * as vscode from "vscode";
import { Project, Suite, TestRailClient } from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { SuiteUpdate } from "../types";
import { SuiteItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";

export class SuiteCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleAddSuite(
    arg: Project | { project: Project }
  ): Promise<Suite | void> {
    const project = "id" in arg ? arg : arg.project;
    try {
      const name = await vscode.window.showInputBox({
        prompt: "Enter suite name",
        placeHolder: "Suite name",
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: "Enter suite description (optional)",
        placeHolder: "Suite description",
      });

      const suite = await this.client.suites.add(project.id, {
        name,
        description: description || "",
      });

      vscode.window.showInformationMessage(
        `Suite "${name}" created successfully`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return suite;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create suite: ${error}`);
    }
  }

  async handleEditSuite(
    arg: Suite | { suite: Suite } | SuiteItem
  ): Promise<void> {
    try {
      const suite = "suite" in arg ? arg.suite : arg;

      // Get host from auth
      const host = await this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage("TestRail host is not configured");
        return;
      }

      // Prepare data for React webview
      const data = {
        suite,
        host,
      };

      // Use ReactWebviewProvider
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "suite",
        `Suite: ${suite.name}`,
        suite.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "saveSuite":
            await this.handleUpdateSuite(suite.id, message.data);
            break;
          case "deleteSuite":
            await this.handleDeleteSuite(suite);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error opening suite: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async handleDeleteSuite(arg: Suite | { suite: Suite }): Promise<void> {
    const suite = "id" in arg ? arg : arg.suite;
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete suite "${suite.name}"?`,
        { modal: true },
        "Delete"
      );

      if (confirm === "Delete") {
        await this.client.suites.delete(suite.id);
        vscode.window.showInformationMessage(
          `Suite "${suite.name}" deleted successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete suite: ${error}`);
    }
  }

  private async handleUpdateSuite(
    suiteId: number,
    data: SuiteUpdate
  ): Promise<void> {
    try {
      const id = data.id || suiteId;
      console.log("Updating suite with id:", id, "and data:", data);
      await this.client.suites.update(id, {
        name: data.name || undefined,
        description: data.description || undefined,
      });
      vscode.window.showInformationMessage("Suite updated successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      console.error("Failed to update suite:", error);
      vscode.window.showErrorMessage(`Failed to update suite: ${error}`);
    }
  }
}
