import * as vscode from "vscode";
import { Run, Suite, TestRailClient } from "testrail-modern-client";
import { TestRailAuth } from "../auth";
import { RunUpdate } from "../types";
import { SuiteItem, RunsCategoryItem } from "../treeView";
import { ReactWebviewProvider } from "../ReactWebviewProvider";

export class RunCommands {
  constructor(
    private client: TestRailClient,
    private auth: TestRailAuth,
    private context: vscode.ExtensionContext
  ) {}

  async handleAddRun(
    arg: Suite | { suite: Suite } | SuiteItem | RunsCategoryItem
  ): Promise<Run | void> {
    try {
      let projectId: number;
      let suiteId: number | undefined;

      if (arg instanceof RunsCategoryItem) {
        projectId = arg.projectId;
        // For RunsCategoryItem, we need to ask the user which suite to use
        const suites = await this.client.suites.list(projectId);
        if (suites.length === 0) {
          vscode.window.showErrorMessage("No suites found in this project");
          return;
        }

        const suiteQuickPicks = suites.map((s) => ({
          label: s.name,
          description: `ID: ${s.id}`,
          suite: s,
        }));

        const selectedSuite = await vscode.window.showQuickPick(
          suiteQuickPicks,
          {
            placeHolder: "Select a suite for this run",
          }
        );

        if (!selectedSuite) return; // User cancelled
        suiteId = selectedSuite.suite.id;
      } else if (arg instanceof SuiteItem) {
        projectId = arg.projectId;
        suiteId = arg.suite.id;
      } else if ("suite" in arg) {
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
        prompt: "Enter run name",
        placeHolder: "Run name",
        validateInput: (value) => {
          return value ? null : "Name is required";
        },
      });

      if (!name) return;

      // Get the description for the run (optional)
      const description = await vscode.window.showInputBox({
        prompt: "Enter run description (optional)",
        placeHolder: "Run description",
      });

      // Ask if all test cases should be included
      const includeAllOption = await vscode.window.showQuickPick(
        [
          { label: "Include all test cases", value: true },
          { label: "Select specific test cases", value: false },
        ],
        {
          placeHolder: "Include all test cases?",
        }
      );

      if (!includeAllOption) return;

      const includeAll = includeAllOption.value;

      // If not including all, we need to get case IDs
      let caseIds: number[] | undefined;
      if (!includeAll) {
        try {
          // Fetch all test cases for this suite
          console.log(
            `Fetching test cases for suite ${suiteId} in project ${projectId}`
          );
          const allCases = await this.client.cases.list(projectId, {
            suite_id: suiteId,
          });
          console.log(`Found ${allCases.length} test cases`);

          if (allCases.length === 0) {
            vscode.window.showWarningMessage(
              "No test cases found in this suite"
            );
            return;
          }

          // Create QuickPick items from test cases
          const caseItems = allCases.map((testCase) => ({
            label: `C${testCase.id}: ${testCase.title}`,
            description: "",
            id: testCase.id,
          }));

          // Show QuickPick for selecting test cases
          const quickPick = vscode.window.createQuickPick();
          quickPick.items = caseItems;
          quickPick.placeholder = "Select test cases to include in the run";
          quickPick.title = "Select Test Cases";
          quickPick.canSelectMany = true;

          const selectedCases = await new Promise<
            readonly vscode.QuickPickItem[]
          >((resolve) => {
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
          caseIds = selectedCases.map((item) => (item as any).id);
          console.log(`Selected case IDs: ${caseIds.join(", ")}`);
        } catch (error) {
          console.error("Error fetching test cases:", error);
          vscode.window.showErrorMessage(
            `Failed to fetch test cases: ${error}`
          );
          return;
        }
      }

      // Get references (optional)
      const refs = await vscode.window.showInputBox({
        prompt: "Enter references (optional)",
        placeHolder: "e.g., JIRA-123, JIRA-456",
      });

      // Create the run
      const run = await this.client.runs.add(projectId, {
        name,
        description: description || undefined,
        suite_id: suiteId,
        include_all: includeAll,
        case_ids: caseIds,
        refs: refs || undefined,
      });

      vscode.window.showInformationMessage(
        `Run "${name}" created successfully`
      );
      vscode.commands.executeCommand("vscode-testrail.refresh");
      return run;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create run: ${error}`);
    }
  }

  async handleEditRun(arg: Run | { run: Run }): Promise<void> {
    try {
      const run = "run" in arg ? arg.run : arg;

      // Get host from auth
      const host = await this.auth.getHost();
      if (!host) {
        vscode.window.showErrorMessage("TestRail host is not configured");
        return;
      }

      // Get tests for this run
      let tests: any[] = [];
      try {
        tests = await this.client.tests.list(run.id);
        console.log(`Loaded ${tests.length} tests for run ${run.id}`);
      } catch (error) {
        console.error(`Error loading tests for run ${run.id}:`, error);
      }

      // Get statuses
      let statuses: any[] = [];
      try {
        statuses = await this.client.statuses.list();
        console.log(`Loaded ${statuses.length} statuses`);
      } catch (error) {
        console.error(`Error loading statuses:`, error);
      }

      // Collect test case IDs from tests
      const caseIds = tests.map((test) => test.case_id);

      // Get test cases for these tests (efficiently batch load them)
      let testCases: Record<number, any> = {};
      if (caseIds.length > 0) {
        try {
          // Group by project ID since TestRail API requires it
          const testCasePromises = caseIds.map((caseId) =>
            this.client.cases.get(caseId).catch((err) => {
              console.error(`Error fetching case ${caseId}:`, err);
              return null;
            })
          );

          const loadedTestCases = await Promise.all(testCasePromises);

          // Create a map of caseId -> testCase for easy access
          testCases = loadedTestCases.reduce(
            (acc: Record<number, any>, testCase) => {
              if (testCase) {
                acc[testCase.id] = testCase;
              }
              return acc;
            },
            {}
          );

          console.log(`Loaded ${Object.keys(testCases).length} test cases`);
        } catch (error) {
          console.error(`Error loading test cases:`, error);
        }
      }

      // Prepare data for React webview
      const data = {
        run,
        host,
        tests,
        statuses,
        testCases,
      };

      // Use ReactWebviewProvider
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );
      const panel = reactWebviewProvider.createOrShowWebviewPanel(
        "run",
        `Run: ${run.name}`,
        run.id,
        data
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case "saveRun":
            await this.handleUpdateRun(run.id, message.data);
            break;
          case "deleteRun":
            await this.handleDeleteRun(run);
            break;
          case "closeRun":
            await this.handleCloseRun(run);
            break;
          case "addResult":
            try {
              await this.client.results.add(message.data.test_id, {
                status_id: message.data.status_id,
                comment: message.data.comment || undefined,
                defects: message.data.defects || undefined,
                elapsed: message.data.elapsed || undefined,
              });

              // Update the panel with fresh data
              await this.refreshRunViewData(run.id);

              vscode.window.showInformationMessage(
                "Test result added successfully"
              );
            } catch (error) {
              console.error("Error adding test result:", error);
              vscode.window.showErrorMessage(
                `Failed to add test result: ${error}`
              );
            }
            break;
          case "getTests":
            await this.refreshRunViewData(run.id);
            break;
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error opening run: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Helper method to refresh run view data
  private async refreshRunViewData(runId: number): Promise<void> {
    try {
      // Get fresh run data
      const run = await this.client.runs.get(runId);

      // Get host
      const host = await this.auth.getHost();
      if (!host) {
        throw new Error("TestRail host is not configured");
      }

      // Get tests for this run
      const tests: any[] = await this.client.tests.list(runId);

      // Get statuses
      const statuses: any[] = await this.client.statuses.list();

      // Collect test case IDs from tests
      const caseIds = tests.map((test) => test.case_id);

      // Get test cases for these tests
      let testCases: Record<number, any> = {};
      if (caseIds.length > 0) {
        const testCasePromises = caseIds.map((caseId) =>
          this.client.cases.get(caseId).catch((err) => {
            console.error(`Error fetching case ${caseId}:`, err);
            return null;
          })
        );

        const loadedTestCases = await Promise.all(testCasePromises);

        // Create a map of caseId -> testCase for easy access
        testCases = loadedTestCases.reduce(
          (acc: Record<number, any>, testCase) => {
            if (testCase) {
              acc[testCase.id] = testCase;
            }
            return acc;
          },
          {}
        );
      }

      // Update the webview data
      const reactWebviewProvider = ReactWebviewProvider.getInstance(
        this.context.extensionUri
      );

      // Update panel data
      reactWebviewProvider.updatePanelData("run", runId, {
        run,
        host,
        tests,
        statuses,
        testCases,
      });
    } catch (error) {
      console.error("Error refreshing run view data:", error);
      vscode.window.showErrorMessage(`Failed to refresh data: ${error}`);
    }
  }

  async handleDeleteRun(arg: Run | { run: Run }): Promise<void> {
    const run = "run" in arg ? arg.run : arg;
    try {
      // Check if the run is completed
      if (run.is_completed) {
        vscode.window.showErrorMessage(
          "Cannot delete a completed run. Please reopen the run in TestRail web interface first."
        );
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete run "${run.name}"? This will permanently delete all tests and results in this run.`,
        { modal: true },
        "Delete"
      );

      if (confirm === "Delete") {
        await this.client.runs.delete(run.id);
        vscode.window.showInformationMessage(
          `Run "${run.name}" deleted successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete run: ${error}`);
    }
  }

  async handleCloseRun(arg: Run | { run: Run }): Promise<void> {
    const run = "run" in arg ? arg.run : arg;
    try {
      // Check if the run is already completed
      if (run.is_completed) {
        vscode.window.showErrorMessage("This run is already completed.");
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to close run "${run.name}"? This will archive all tests and results.`,
        { modal: true },
        "Close"
      );

      if (confirm === "Close") {
        await this.client.runs.close(run.id);
        vscode.window.showInformationMessage(
          `Run "${run.name}" closed successfully`
        );
        vscode.commands.executeCommand("vscode-testrail.refresh");
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
            "Cannot update a completed run. Please reopen the run in TestRail web interface first."
          );
          return;
        }
      } catch (error) {
        // If we can't get the run, we should not proceed with the update
        // as it might be due to the run being completed or other API restrictions
        console.error("Error fetching run:", error);
        vscode.window.showErrorMessage(
          `Failed to check run status: ${error}. The run might be completed or have other restrictions.`
        );
        return;
      }

      console.log("Updating run with id:", runId, "and data:", data);
      await this.client.runs.update(runId, {
        name: data.name,
        description: data.description,
        milestone_id: data.milestone_id,
        include_all: data.include_all,
        case_ids: data.case_ids,
        refs: data.refs,
      });
      vscode.window.showInformationMessage("Run updated successfully");
      vscode.commands.executeCommand("vscode-testrail.refresh");
    } catch (error) {
      console.error("Failed to update run:", error);
      vscode.window.showErrorMessage(`Failed to update run: ${error}`);
    }
  }
}
