import * as vscode from "vscode";
import {
  TestRailClient,
  Milestone,
  UpdateMilestone,
} from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { ProjectItem, MilestoneItem, MilestoneCategoryItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";

export class MilestoneCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleAddMilestone(
    arg: ProjectItem | MilestoneItem | MilestoneCategoryItem
  ): Promise<Milestone | void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: "Enter milestone name",
        placeHolder: "Milestone name",
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: "Enter milestone description (optional)",
        placeHolder: "Milestone description",
      });

      const dueOnInput = await vscode.window.showInputBox({
        prompt: "Enter due date (YYYY-MM-DD) (optional)",
        placeHolder: "YYYY-MM-DD",
        validateInput: (value) => {
          if (!value) return null;
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          return dateRegex.test(value)
            ? null
            : "Please enter a valid date in YYYY-MM-DD format";
        },
      });

      const startOnInput = await vscode.window.showInputBox({
        prompt: "Enter start date (YYYY-MM-DD) (optional)",
        placeHolder: "YYYY-MM-DD",
        validateInput: (value) => {
          if (!value) return null;
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          return dateRegex.test(value)
            ? null
            : "Please enter a valid date in YYYY-MM-DD format";
        },
      });

      // Get project ID based on the argument type
      let projectId: number;
      let parentId: number | null = null;

      if (arg instanceof ProjectItem) {
        projectId = arg.project.id;
      } else if (arg instanceof MilestoneItem) {
        projectId = arg.milestone.project_id;
        parentId = arg.milestone.id;
      } else if (arg instanceof MilestoneCategoryItem) {
        projectId = arg.projectId;
      } else {
        throw new Error("Invalid argument type");
      }

      // Convert dates to UNIX timestamps if provided
      const dueOn = dueOnInput ? new Date(dueOnInput).getTime() / 1000 : null;
      const startOn = startOnInput
        ? new Date(startOnInput).getTime() / 1000
        : null;

      const milestone = await this.client.milestones.addMilestone(projectId, {
        name,
        description: description || "",
        parent_id: parentId,
        due_on: dueOn,
        start_on: startOn,
        is_completed: false,
        is_started: !!startOn,
        project_id: projectId,
        refs: "",
        completed_on: null,
        started_on: null,
        milestones: [],
      });

      vscode.window.showInformationMessage(
        `Milestone "${name}" created successfully`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return milestone;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create milestone: ${error}`);
    }
  }

  async handleEditMilestone(milestoneItem: MilestoneItem): Promise<void> {
    try {
      // Get host from auth
      const host = await this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage("TestRail host is not configured");
        return;
      }

      // Get all milestones for the same project
      const allMilestones = await this.client.milestones.getMilestones(
        milestoneItem.milestone.project_id
      );

      // Prepare data for React webview
      const data = {
        milestone: milestoneItem.milestone,
        host,
        allMilestones,
        projectId: milestoneItem.milestone.project_id,
      };

      // Use ReactWebviewProvider
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "milestone",
        `Milestone: ${milestoneItem.milestone.name}`,
        milestoneItem.milestone.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "saveMilestone":
            await this.handleUpdateMilestone(
              milestoneItem.milestone.id,
              message.data
            );
            break;
          case "deleteMilestone":
            await this.handleDeleteMilestone(milestoneItem);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error opening milestone: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async handleDeleteMilestone(milestoneItem: MilestoneItem): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete milestone "${milestoneItem.milestone.name}"?`,
        { modal: true },
        "Delete"
      );

      if (confirm === "Delete") {
        await this.client.milestones.deleteMilestone(
          milestoneItem.milestone.id
        );
        vscode.window.showInformationMessage(
          `Milestone "${milestoneItem.milestone.name}" deleted successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete milestone: ${error}`);
    }
  }

  private async handleUpdateMilestone(
    milestoneId: number,
    data: UpdateMilestone
  ): Promise<void> {
    try {
      await this.client.milestones.updateMilestone(milestoneId, data);
      vscode.window.showInformationMessage("Milestone updated successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update milestone: ${error}`);
    }
  }
}
