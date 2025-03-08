import * as vscode from "vscode";
import { TestRailClient } from "testrail-modern-client";
import { TestRailAuth } from "./auth";
import { TestRailTreeProvider } from "./treeView";
import { TestCaseCommands } from "./commands/testCase.commands";
import { SuiteCommands } from "./commands/suite.commands";
import { SectionCommands } from "./commands/section.commands";
import { RunCommands } from "./commands/run.commands";
import { ResultCommands } from "./commands/result.commands";
import { MilestoneCommands } from "./commands/milestone.commands";

export class ExtensionManager {
  private client: TestRailClient | undefined;
  private treeDataProvider: TestRailTreeProvider | undefined;
  private testCaseCommands: TestCaseCommands | undefined;
  private suiteCommands: SuiteCommands | undefined;
  private sectionCommands: SectionCommands | undefined;
  private runCommands: RunCommands | undefined;
  private resultCommands: ResultCommands | undefined;
  private milestoneCommands: MilestoneCommands | undefined;
  private basicCommandDisposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private auth: TestRailAuth
  ) {
    // No need to initialize ReactWebviewProvider here as it's a singleton
    // and command classes get it directly
  }

  async initialize() {
    console.log("Initializing ExtensionManager");
    await this.auth.init();
    this.registerBasicCommands();
    await this.initializeClient();
    if (this.client) {
      console.log("Client initialized successfully");
      this.initializeClientDependentCommands();
      this.initializeTreeView();
      vscode.window.showInformationMessage(
        "Successfully connected to TestRail"
      );
    } else {
      console.log("No client available, showing login prompt");
      const selection = await vscode.window.showInformationMessage(
        "Please login to TestRail to get started",
        "Login"
      );
      if (selection === "Login") {
        await this.handleLogin();
      }
    }
  }

  private registerBasicCommands() {
    console.log("Registering basic commands");
    // Dispose existing basic commands
    this.basicCommandDisposables.forEach((d) => d.dispose());
    this.basicCommandDisposables = [];

    // Register new basic commands
    this.basicCommandDisposables = [
      vscode.commands.registerCommand("vscode-testrail.login", () =>
        this.handleLogin()
      ),
      vscode.commands.registerCommand("vscode-testrail.logout", () =>
        this.handleLogout()
      ),
      vscode.commands.registerCommand("vscode-testrail.refresh", () =>
        this.handleRefresh()
      ),
    ];

    // Add to subscriptions
    this.basicCommandDisposables.forEach((d) =>
      this.context.subscriptions.push(d)
    );
  }

  private async initializeClient() {
    console.log("Initializing client");
    const credentials = await this.auth.getStoredCredentials();
    if (credentials) {
      try {
        this.client = new TestRailClient({
          host: credentials.host,
          email: credentials.email,
          password: credentials.apiKey,
        });
        // Test the connection
        const projects = await this.client.projects.list();
        console.log(
          `Client connection test successful, found ${projects.length} projects`
        );
      } catch (error) {
        console.error("Failed to initialize client:", error);
        this.client = undefined;
        vscode.window.showErrorMessage(
          `Failed to initialize TestRail client: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else {
      console.log("No stored credentials found");
    }
  }

  private initializeClientDependentCommands() {
    console.log("Initializing client-dependent commands");
    if (!this.client) {
      return;
    }

    // Initialize commands with the client
    this.testCaseCommands = new TestCaseCommands(
      this.client,
      this.auth,
      this.context
    );
    this.suiteCommands = new SuiteCommands(
      this.client,
      this.auth,
      this.context
    );
    this.sectionCommands = new SectionCommands(
      this.client,
      this.auth,
      this.context
    );
    this.runCommands = new RunCommands(this.client, this.auth, this.context);
    this.resultCommands = new ResultCommands(
      this.client,
      this.auth,
      this.context
    );
    this.milestoneCommands = new MilestoneCommands(
      this.client,
      this.auth,
      this.context
    );

    // Register client-dependent commands directly to context.subscriptions
    this.context.subscriptions.push(
      // TestCase commands
      vscode.commands.registerCommand(
        "vscode-testrail.openTestCase",
        (testCase) => this.testCaseCommands?.handleOpenTestCase(testCase)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.addTestCase",
        (section) => this.testCaseCommands?.handleAddTestCase(section)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.deleteTestCase",
        (testCase) => this.testCaseCommands?.handleDeleteTestCase(testCase)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.duplicateTestCase",
        (testCase) => this.testCaseCommands?.handleDuplicateTestCase(testCase)
      ),

      // Suite commands
      vscode.commands.registerCommand("vscode-testrail.addSuite", (project) =>
        this.suiteCommands?.handleAddSuite(project)
      ),
      vscode.commands.registerCommand("vscode-testrail.editSuite", (suite) =>
        this.suiteCommands?.handleEditSuite(suite)
      ),
      vscode.commands.registerCommand("vscode-testrail.deleteSuite", (suite) =>
        this.suiteCommands?.handleDeleteSuite(suite)
      ),

      // Section commands
      vscode.commands.registerCommand("vscode-testrail.addSection", (parent) =>
        this.sectionCommands?.handleAddSection(parent)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.editSection",
        (section) => this.sectionCommands?.handleEditSection(section)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.deleteSection",
        (section) => this.sectionCommands?.handleDeleteSection(section)
      ),

      // Run commands
      vscode.commands.registerCommand(
        "vscode-testrail.addRun",
        (projectOrSuite) => this.runCommands?.handleAddRun(projectOrSuite)
      ),
      vscode.commands.registerCommand("vscode-testrail.editRun", (run) =>
        this.runCommands?.handleEditRun(run)
      ),
      vscode.commands.registerCommand("vscode-testrail.deleteRun", (run) =>
        this.runCommands?.handleDeleteRun(run)
      ),
      vscode.commands.registerCommand("vscode-testrail.closeRun", (run) =>
        this.runCommands?.handleCloseRun(run)
      ),

      // Result commands
      vscode.commands.registerCommand("vscode-testrail.addResult", (test) =>
        this.resultCommands?.handleAddResult(test)
      ),
      vscode.commands.registerCommand("vscode-testrail.viewResults", (test) =>
        this.resultCommands?.handleViewResults(test)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.openTest",
        (test, _run) => {
          this.resultCommands?.handleViewResults(test);
        }
      ),

      // Milestone commands
      vscode.commands.registerCommand("vscode-testrail.addMilestone", (arg) =>
        this.milestoneCommands?.handleAddMilestone(arg)
      ),
      vscode.commands.registerCommand("vscode-testrail.editMilestone", (arg) =>
        this.milestoneCommands?.handleEditMilestone(arg)
      ),
      vscode.commands.registerCommand(
        "vscode-testrail.deleteMilestone",
        (arg) => this.milestoneCommands?.handleDeleteMilestone(arg)
      )
    );
  }

  private initializeTreeView() {
    if (!this.client) return;

    console.log("Initializing TreeView");
    if (this.treeDataProvider) {
      this.treeDataProvider.refresh();
    } else {
      this.treeDataProvider = new TestRailTreeProvider(this.client);
      const treeView = vscode.window.createTreeView("testRailExplorer", {
        treeDataProvider: this.treeDataProvider,
        showCollapseAll: true,
        dragAndDropController: {
          dropMimeTypes: ["application/vnd.code.tree.testRailExplorer"],
          dragMimeTypes: ["application/vnd.code.tree.testRailExplorer"],
          handleDrag: (
            source: readonly any[],
            dataTransfer: vscode.DataTransfer
          ) => {
            // Get the first item from the source
            if (source.length > 0) {
              const item = source[0];

              // Check if the item has a dragAndDropController
              if (item.dragAndDropController) {
                const dragData = item.dragAndDropController.handleDrag();

                // Add the data to the transfer
                dataTransfer.set(
                  "application/vnd.code.tree.testRailExplorer",
                  new vscode.DataTransferItem(dragData.transferItem)
                );

                console.log("Drag data set:", dragData.transferItem);
              }
            }
          },
          handleDrop: async (target: any, sources: vscode.DataTransfer) => {
            await this.treeDataProvider?.handleDrop(target, sources);
          },
        },
      });
      this.context.subscriptions.push(treeView);
    }
  }

  async handleLogin() {
    console.log("Handling login");
    try {
      await this.auth.login();
      await this.initialize();
    } catch (error) {
      console.error("Login failed:", error);
      vscode.window.showErrorMessage(
        `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleLogout() {
    console.log("Handling logout");
    try {
      await this.auth.logout();
      this.client = undefined;
      this.treeDataProvider = undefined;
      // Only dispose basic commands, keep client-dependent commands in subscriptions
      this.basicCommandDisposables.forEach((d) => d.dispose());
      this.basicCommandDisposables = [];
      await this.initialize();
      vscode.window.showInformationMessage(
        "Successfully logged out from TestRail"
      );
    } catch (error) {
      console.error("Logout failed:", error);
      vscode.window.showErrorMessage(
        `Logout failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  handleRefresh() {
    console.log("Handling refresh");
    if (this.treeDataProvider) {
      this.treeDataProvider.refresh();
    } else {
      vscode.window.showWarningMessage("Please login to TestRail first");
    }
  }
}
