import * as vscode from 'vscode';
import { Project, Suite, TestCase, TestRailClient, Section } from 'testrail-modern-client';

export class TestRailTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private client: TestRailClient) {}

  refresh(): void {
    console.log('Refreshing TreeView');
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    try {
      if (!element) {
        console.log('Getting root projects');
        const projects = await this.client.projects.list();
        console.log(`Found ${projects.length} projects`);
        const projectId = vscode.workspace.getConfiguration('testrail').get<number>('projectId');

        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects found in TestRail');
          return [];
        }

        if (projectId) {
          console.log(`Filtering for project ID: ${projectId}`);
          const filteredProjects = projects.filter((p) => p.id === projectId);
          if (filteredProjects.length === 0) {
            vscode.window.showWarningMessage(`No project found with ID: ${projectId}`);
          }
          return filteredProjects.map((p) => new ProjectItem(p));
        }
        return projects.map((p) => new ProjectItem(p));
      }

      if (element instanceof ProjectItem) {
        console.log(`Getting suites for project ${element.project.id}`);
        const suites = await this.client.suites.list(element.project.id);
        console.log(`Found ${suites.length} suites`);
        if (suites.length === 0) {
          vscode.window.showInformationMessage(
            `No test suites found in project: ${element.project.name}`
          );
        }
        return suites.map((s) => new SuiteItem(s, element.project.id));
      }

      if (element instanceof SuiteItem) {
        console.log(`Getting sections for suite ${element.suite.id}`);
        const sections = await this.client.sections.list(element.projectId, element.suite.id);
        console.log(`Found ${sections.length} sections`);
        // Get root level sections (parent_id is null)
        const rootSections = sections.filter((s) => !s.parent_id);
        console.log(`Found ${rootSections.length} root sections`);
        if (rootSections.length === 0) {
          vscode.window.showInformationMessage(`No sections found in suite: ${element.suite.name}`);
        }
        return rootSections.map((s) => new SectionItem(s, element.projectId, sections));
      }

      if (element instanceof SectionItem) {
        const items: TreeItem[] = [];

        // Add child sections
        const childSections = element.allSections.filter((s) => s.parent_id === element.section.id);
        console.log(
          `Found ${childSections.length} child sections for section ${element.section.id}`
        );
        items.push(
          ...childSections.map((s) => new SectionItem(s, element.projectId, element.allSections))
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
      console.error('Error in getChildren:', error);
      vscode.window.showErrorMessage(
        `Failed to load tree items: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return [];
    }
  }
}

class TreeItem extends vscode.TreeItem {
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
    super(project.name, vscode.TreeItemCollapsibleState.Collapsed, 'project');
    this.tooltip = project.name;
    this.description = `ID: ${project.id}`;
    this.iconPath = new vscode.ThemeIcon('project');
  }
}

export class SuiteItem extends TreeItem {
  constructor(
    public readonly suite: Suite,
    public readonly projectId: number
  ) {
    super(suite.name, vscode.TreeItemCollapsibleState.Collapsed, 'suite');
    this.tooltip = suite.name;
    this.description = `S${suite.id}`;
    this.iconPath = new vscode.ThemeIcon('symbol-class');
  }
}

export class SectionItem extends TreeItem {
  constructor(
    public readonly section: Section,
    public readonly projectId: number,
    public readonly allSections: Section[]
  ) {
    super(section.name, vscode.TreeItemCollapsibleState.Collapsed, 'section');
    this.tooltip = section.name;
    this.description = undefined;
    this.iconPath = new vscode.ThemeIcon('symbol-folder');
  }
}

export class TestCaseItem extends TreeItem {
  constructor(public readonly testCase: TestCase) {
    super(testCase.title, vscode.TreeItemCollapsibleState.None, 'testCase');
    this.tooltip = testCase.title;
    this.description = `C${testCase.id}`;
    this.iconPath = new vscode.ThemeIcon('symbol-method');
    this.command = {
      command: 'vscode-testrail.openTestCase',
      title: 'Open Test Case',
      arguments: [testCase],
    };
  }
}
