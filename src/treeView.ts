import * as vscode from "vscode";
import {
  Project,
  Suite,
  TestCase,
  TestRailClient,
  Section,
  Run,
  Test,
  Milestone,
} from "testrail-modern-client";

export class TestRailTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private client: TestRailClient) {}

  refresh(): void {
    console.log("Refreshing TreeView");
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    try {
      if (!element) {
        console.log("Getting root projects");
        const projects = await this.client.projects.list();
        console.log(`Found ${projects.length} projects`);
        const projectId = vscode.workspace
          .getConfiguration("testrail")
          .get<number>("projectId");

        if (projects.length === 0) {
          vscode.window.showInformationMessage("No projects found in TestRail");
          return [];
        }

        if (projectId) {
          console.log(`Filtering for project ID: ${projectId}`);
          const filteredProjects = projects.filter((p) => p.id === projectId);
          if (filteredProjects.length === 0) {
            vscode.window.showWarningMessage(
              `No project found with ID: ${projectId}`
            );
          }
          return filteredProjects.map((p) => new ProjectItem(p));
        }
        return projects.map((p) => new ProjectItem(p));
      }

      if (element instanceof ProjectItem) {
        console.log(`Getting items for project ${element.project.id}`);
        const items: TreeItem[] = [];

        // Get milestones for this project
        console.log(`Getting milestones for project ${element.project.id}`);
        const milestones = await this.client.milestones.getMilestones(
          element.project.id
        );
        console.log(`Found ${milestones.length} milestones`);

        // Get suites for this project
        console.log(`Getting suites for project ${element.project.id}`);
        const suites = await this.client.suites.list(element.project.id);
        console.log(`Found ${suites.length} suites`);

        // Get runs for this project
        console.log(`Getting runs for project ${element.project.id}`);
        const runs = await this.client.runs.list(element.project.id);
        console.log(`Found ${runs.length} runs`);

        if (
          milestones.length === 0 &&
          suites.length === 0 &&
          runs.length === 0
        ) {
          vscode.window.showInformationMessage(
            `No test suites, runs, or milestones found in project: ${element.project.name}`
          );
          return [];
        }

        // Add milestone category if there are milestones
        if (milestones.length > 0) {
          // Count completed milestones
          const rootMilestones = milestones.filter((m) => !m.parent_id);
          const completedCount = rootMilestones.filter(
            (m) => m.is_completed
          ).length;
          const totalCount = rootMilestones.length;

          items.push(
            new MilestoneCategoryItem(
              element.project.id,
              totalCount,
              completedCount
            )
          );
        }

        // Add suite category if there are suites
        if (suites.length > 0) {
          items.push(new SuiteCategoryItem(element.project.id, suites.length));
        }

        // Add runs category if there are runs
        if (runs.length > 0) {
          // Count completed runs
          const completedCount = runs.filter((r) => r.is_completed).length;
          items.push(
            new RunsCategoryItem(
              element.project.id,
              runs.length,
              completedCount
            )
          );
        }

        return items;
      }

      if (element instanceof MilestoneCategoryItem) {
        // Get milestones for this project
        const milestones = await this.client.milestones.getMilestones(
          element.projectId
        );

        // Only show root milestones (parent_id is null)
        const rootMilestones = milestones.filter((m) => !m.parent_id);

        // Filter out completed milestones if showCompleted is false
        const filteredMilestones = element.showCompleted
          ? rootMilestones
          : rootMilestones.filter((m) => !m.is_completed);

        return filteredMilestones.map(
          (m) => new MilestoneItem(m, element.projectId)
        );
      }

      if (element instanceof SuiteCategoryItem) {
        // Get suites for this project
        const suites = await this.client.suites.list(element.projectId);

        return suites.map((s) => new SuiteItem(s, element.projectId));
      }

      if (element instanceof MilestoneItem) {
        // Get child milestones
        console.log(
          `Getting child milestones for milestone ${element.milestone.id}`
        );
        const milestones = await this.client.milestones.getMilestones(
          element.projectId
        );
        const childMilestones = milestones.filter(
          (m) => m.parent_id === element.milestone.id
        );

        if (childMilestones.length === 0) {
          return [];
        }

        return childMilestones.map(
          (m) => new MilestoneItem(m, element.projectId)
        );
      }

      if (element instanceof SuiteItem) {
        const items: TreeItem[] = [];

        // Get sections for this suite
        console.log(`Getting sections for suite ${element.suite.id}`);
        const sections = await this.client.sections.list(
          element.projectId,
          element.suite.id
        );
        console.log(`Found ${sections.length} sections`);

        // Get root level sections (parent_id is null)
        const rootSections = sections.filter((s) => !s.parent_id);
        console.log(`Found ${rootSections.length} root sections`);
        items.push(
          ...rootSections.map(
            (s) => new SectionItem(s, element.projectId, sections)
          )
        );

        if (items.length === 0) {
          vscode.window.showInformationMessage(
            `No sections found in suite: ${element.suite.name}`
          );
        }

        return items;
      }

      if (element instanceof RunsCategoryItem) {
        console.log(`Getting runs for project ${element.projectId}`);
        const runs = await this.client.runs.list(element.projectId);

        // Sort runs by creation date (newest first)
        runs.sort((a, b) => b.created_on - a.created_on);

        // Filter out completed runs if showCompleted is false
        const filteredRuns = element.showCompleted
          ? runs
          : runs.filter((r) => !r.is_completed);

        return filteredRuns.map((r) => new RunItem(r));
      }

      if (element instanceof RunItem) {
        console.log(
          `Getting tests for run ${element.run.id} (${element.run.name})`
        );
        try {
          console.log(`Making API call to get tests for run ${element.run.id}`);
          const tests = await this.client.tests.list(element.run.id);
          console.log(`Found ${tests.length} tests for run ${element.run.id}`);

          if (tests.length > 0) {
            console.log(
              `Sample test data:`,
              JSON.stringify(tests.slice(0, 2), null, 2)
            );
          } else {
            console.log(`No tests found in run ${element.run.id}`);
          }

          return tests.map((test) => new TestItem(test, element.run));
        } catch (error) {
          console.error(
            `Error getting tests for run ${element.run.id}:`,
            error
          );
          vscode.window.showErrorMessage(
            `Failed to load tests for run ${element.run.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
          return [];
        }
      }

      if (element instanceof SectionItem) {
        const items: TreeItem[] = [];

        // Add child sections
        const childSections = element.allSections.filter(
          (s) => s.parent_id === element.section.id
        );
        console.log(
          `Found ${childSections.length} child sections for section ${element.section.id}`
        );
        items.push(
          ...childSections.map(
            (s) => new SectionItem(s, element.projectId, element.allSections)
          )
        );

        // Add test cases
        console.log(`Getting test cases for section ${element.section.id}`);
        const cases = await this.client.cases.list(element.projectId, {
          section_id: element.section.id,
          suite_id: element.section.suite_id,
        });
        console.log(`Found ${cases.length} test cases`);
        items.push(...cases.map((c) => new TestCaseItem(c)));

        if (items.length === 0) {
          vscode.window.showInformationMessage(
            `No items found in section: ${element.section.name}`
          );
        }
        return items;
      }

      return [];
    } catch (error) {
      console.error("Error in getChildren:", error);
      vscode.window.showErrorMessage(
        `Failed to load tree items: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return [];
    }
  }

  // Handle dropping a section or test case onto a section
  async handleDrop(
    target: TreeItem,
    sources: vscode.DataTransfer
  ): Promise<void> {
    console.log("Handling drop event");

    // Only allow dropping onto sections
    if (!(target instanceof SectionItem)) {
      console.log("Target is not a section, ignoring drop");
      return;
    }

    const targetSection = target.section;

    try {
      // Get the data from the transfer
      const transferData = sources.get(
        "application/vnd.code.tree.testRailExplorer"
      )?.value;
      if (!transferData) {
        console.log("No valid transfer data found");
        return;
      }

      console.log("Transfer data:", transferData);

      // Check if we're dropping a section
      if (transferData.type === "section") {
        console.log("Dropping section:", transferData);
        await this.moveSection(transferData, targetSection.id);
        return;
      }

      // Check if we're dropping a test case
      if (transferData.type === "testCase") {
        console.log("Dropping test case:", transferData);
        await this.moveTestCase(
          transferData,
          targetSection.id,
          targetSection.suite_id
        );
        return;
      }

      console.log("No valid drop data found");
    } catch (error) {
      console.error("Error handling drop:", error);
      vscode.window.showErrorMessage(
        `Failed to move item: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Move a section to another section
  private async moveSection(
    sectionData: any,
    targetSectionId: number
  ): Promise<void> {
    try {
      await this.client.sections.move(sectionData.id, {
        parent_id: targetSectionId,
      });

      vscode.window.showInformationMessage("Section moved successfully");
      this.refresh();
    } catch (error) {
      console.error("Error moving section:", error);
      throw error;
    }
  }

  // Move a test case to another section
  private async moveTestCase(
    testCaseData: any,
    targetSectionId: number,
    targetSuiteId: number
  ): Promise<void> {
    try {
      await this.client.cases.moveToSection(targetSectionId, targetSuiteId, [
        testCaseData.id,
      ]);

      vscode.window.showInformationMessage("Test case moved successfully");
      this.refresh();
    } catch (error) {
      console.error("Error moving test case:", error);
      throw error;
    }
  }
}

class TreeItem extends vscode.TreeItem {
  public dragAndDropController?: {
    handleDrag: () => {
      supportedTypes: string[];
      transferItem: any;
    };
  };

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
  }
}

export class ProjectItem extends TreeItem {
  constructor(public readonly project: Project) {
    super(project.name, vscode.TreeItemCollapsibleState.Collapsed, "project");
    this.tooltip = `${project.name} (ID: ${project.id})`;
    this.description = project.announcement ? "Has announcement" : "";
    this.iconPath = new vscode.ThemeIcon("project");
  }
}

export class MilestoneCategoryItem extends TreeItem {
  public showCompleted: boolean = false;

  constructor(
    public readonly projectId: number,
    milestoneCount: number,
    completedCount: number
  ) {
    super(
      `Milestones (${milestoneCount - completedCount}${
        completedCount > 0 ? ` + ${completedCount} completed` : ""
      })`,
      vscode.TreeItemCollapsibleState.Collapsed,
      "milestoneCategory"
    );
    this.tooltip = `Milestones for project ID: ${projectId}`;
    this.iconPath = new vscode.ThemeIcon("milestone");
  }
}

export class SuiteCategoryItem extends TreeItem {
  constructor(public readonly projectId: number, suiteCount: number) {
    super(
      `Suites (${suiteCount})`,
      vscode.TreeItemCollapsibleState.Collapsed,
      "suiteCategory"
    );
    this.tooltip = `Test Suites for project ID: ${projectId}`;
    this.iconPath = new vscode.ThemeIcon("library");
  }
}

export class MilestoneItem extends TreeItem {
  constructor(
    public readonly milestone: Milestone,
    public readonly projectId: number
  ) {
    super(
      milestone.name,
      milestone.milestones.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      "milestone"
    );

    this.tooltip = `${milestone.name} (ID: ${milestone.id})`;

    // Show status (completed, started, or upcoming)
    if (milestone.is_completed) {
      this.description = "Completed";
      this.iconPath = new vscode.ThemeIcon("check");
    } else if (milestone.is_started) {
      this.description = "In Progress";
      this.iconPath = new vscode.ThemeIcon("play");
    } else {
      this.description = "Upcoming";
      this.iconPath = new vscode.ThemeIcon("calendar");
    }

    // Add due date to description if available
    if (milestone.due_on) {
      const dueDate = new Date(milestone.due_on * 1000).toLocaleDateString();
      this.description += ` (Due: ${dueDate})`;
    }
  }
}

export class SuiteItem extends TreeItem {
  constructor(public readonly suite: Suite, public readonly projectId: number) {
    super(suite.name, vscode.TreeItemCollapsibleState.Collapsed, "suite");
    this.tooltip = suite.name;
    this.description = `S${suite.id}`;
    this.iconPath = new vscode.ThemeIcon("symbol-class");
  }
}

export class SectionItem extends TreeItem {
  constructor(
    public readonly section: Section,
    public readonly projectId: number,
    public readonly allSections: Section[]
  ) {
    super(section.name, vscode.TreeItemCollapsibleState.Collapsed, "section");
    this.tooltip = section.name;
    this.description = undefined;
    this.iconPath = new vscode.ThemeIcon("symbol-folder");

    // Add drag and drop support
    this.id = `section-${section.id}`;
    this.dragAndDropController = {
      // Allow dragging this section
      handleDrag: () => {
        return {
          supportedTypes: ["application/vnd.code.tree.testRailExplorer"],
          transferItem: {
            type: "section",
            id: section.id,
            suiteId: section.suite_id,
            projectId: this.projectId,
          },
        };
      },
    };
  }
}

export class RunsCategoryItem extends TreeItem {
  public showCompleted: boolean = false;

  constructor(
    public readonly projectId: number,
    runCount: number,
    completedCount: number
  ) {
    super(
      `Runs (${runCount - completedCount}${
        completedCount > 0 ? ` + ${completedCount} completed` : ""
      })`,
      vscode.TreeItemCollapsibleState.Collapsed,
      "runsCategory"
    );
    this.tooltip = "Test Runs";
    this.iconPath = new vscode.ThemeIcon("run-all");
  }
}

export class TestCaseItem extends TreeItem {
  constructor(public readonly testCase: TestCase) {
    super(testCase.title, vscode.TreeItemCollapsibleState.None, "testCase");
    this.tooltip = testCase.title;
    this.description = `C${testCase.id}`;
    this.iconPath = new vscode.ThemeIcon("symbol-method");
    this.command = {
      command: "vscode-testrail.openTestCase",
      title: "Open Test Case",
      arguments: [testCase],
    };

    // Add drag and drop support
    this.id = `testCase-${testCase.id}`;
    this.dragAndDropController = {
      // Allow dragging this test case
      handleDrag: () => {
        return {
          supportedTypes: ["application/vnd.code.tree.testRailExplorer"],
          transferItem: {
            type: "testCase",
            id: testCase.id,
            sectionId: testCase.section_id,
            suiteId: testCase.suite_id,
          },
        };
      },
    };
  }
}

export class RunItem extends TreeItem {
  constructor(public readonly run: Run) {
    super(run.name, vscode.TreeItemCollapsibleState.Collapsed, "run");
    this.tooltip = run.name;
    this.description = `R${run.id}`;

    // Use different icons based on run status
    if (run.is_completed) {
      this.iconPath = new vscode.ThemeIcon("check");
    } else {
      this.iconPath = new vscode.ThemeIcon("run");
    }

    this.command = {
      command: "vscode-testrail.editRun",
      title: "Edit Run",
      arguments: [run],
    };
  }
}

export class TestItem extends TreeItem {
  constructor(public readonly test: Test, public readonly parentRun: Run) {
    super(test.title, vscode.TreeItemCollapsibleState.None, "test");
    console.log(
      `Creating TestItem for test ${test.id} with title "${test.title}"`
    );
    console.log(`TestItem contextValue: 'test'`);
    this.tooltip = test.title;
    this.description = `T${test.id}`;

    // Use different icons based on test status
    switch (test.status_id) {
      case 1: // Passed
        this.iconPath = new vscode.ThemeIcon("pass");
        break;
      case 2: // Blocked
        this.iconPath = new vscode.ThemeIcon("warning");
        break;
      case 3: // Untested
        this.iconPath = new vscode.ThemeIcon("circle-outline");
        break;
      case 4: // Retest
        this.iconPath = new vscode.ThemeIcon("refresh");
        break;
      case 5: // Failed
        this.iconPath = new vscode.ThemeIcon("error");
        break;
      default:
        this.iconPath = new vscode.ThemeIcon("symbol-method");
    }

    // Add command to view results
    this.command = {
      command: "vscode-testrail.viewResults",
      title: "View Results",
      arguments: [this],
    };
  }
}
