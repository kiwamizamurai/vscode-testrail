import * as vscode from "vscode";
import { TestRailClient, Section, MoveSection } from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { SuiteItem, SectionItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";

export class SectionCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleAddSection(
    arg: SuiteItem | SectionItem
  ): Promise<Section | void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: "Enter section name",
        placeHolder: "Section name",
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: "Enter section description (optional)",
        placeHolder: "Section description",
      });

      const suiteId = "suite" in arg ? arg.suite.id : arg.section.suite_id;
      const parentId = "section" in arg ? arg.section.id : undefined;
      const projectId = "suite" in arg ? arg.projectId : arg.projectId;

      const section = await this.client.sections.add(projectId, {
        name,
        description: description || "",
        parent_id: parentId,
        suite_id: suiteId,
      });

      vscode.window.showInformationMessage(
        `Section "${name}" created successfully`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return section;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create section: ${error}`);
    }
  }

  async handleEditSection(sectionItem: SectionItem): Promise<void> {
    try {
      // Get host from auth
      const host = await this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage("TestRail host is not configured");
        return;
      }

      // Get all sections for the same suite
      const allSections = await this.client.sections.list(
        sectionItem.projectId,
        sectionItem.section.suite_id
      );

      // Prepare data for React webview
      const data = {
        section: sectionItem.section,
        host,
        allSections,
        suiteId: sectionItem.section.suite_id,
      };

      // Use ReactWebviewProvider
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "section",
        `Section: ${sectionItem.section.name}`,
        sectionItem.section.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "saveSection":
            await this.handleUpdateSection(
              sectionItem.section.id,
              message.data
            );
            break;
          case "deleteSection":
            await this.handleDeleteSection(sectionItem);
            break;
          case "moveSection":
            await this.handleMoveSection(sectionItem.section.id, message.data);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error opening section: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async handleDeleteSection(sectionItem: SectionItem): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete section "${sectionItem.section.name}"?`,
        { modal: true },
        "Delete"
      );

      if (confirm === "Delete") {
        await this.client.sections.delete(sectionItem.section.id);
        vscode.window.showInformationMessage(
          `Section "${sectionItem.section.name}" deleted successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
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
      vscode.window.showInformationMessage("Section updated successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update section: ${error}`);
    }
  }

  async handleMoveSection(
    sectionId: number,
    moveData: MoveSection
  ): Promise<void> {
    try {
      await this.client.sections.move(sectionId, moveData);
      vscode.window.showInformationMessage("Section moved successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to move section: ${error}`);
    }
  }
}
