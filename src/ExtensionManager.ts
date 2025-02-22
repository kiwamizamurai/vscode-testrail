import * as vscode from 'vscode';
import { TestRailClient } from 'testrail-modern-client';
import { TestRailAuth } from './auth';
import { TestRailTreeProvider } from './treeView';
import { TestCaseCommands } from './commands/testCase.commands';
import { SuiteCommands } from './commands/suite.commands';
import { SectionCommands } from './commands/section.commands';

export class ExtensionManager {
  private client: TestRailClient | undefined;
  private treeDataProvider: TestRailTreeProvider | undefined;
  private testCaseCommands: TestCaseCommands | undefined;
  private suiteCommands: SuiteCommands | undefined;
  private sectionCommands: SectionCommands | undefined;
  private basicCommandDisposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private auth: TestRailAuth
  ) {}

  async initialize() {
    console.log('Initializing ExtensionManager');
    await this.auth.init();
    this.registerBasicCommands();
    await this.initializeClient();
    if (this.client) {
      console.log('Client initialized successfully');
      this.initializeClientDependentCommands();
      this.initializeTreeView();
      vscode.window.showInformationMessage('Successfully connected to TestRail');
    } else {
      console.log('No client available, showing login prompt');
      const selection = await vscode.window.showInformationMessage(
        'Please login to TestRail to get started',
        'Login'
      );
      if (selection === 'Login') {
        await this.handleLogin();
      }
    }
  }

  private registerBasicCommands() {
    console.log('Registering basic commands');
    // Dispose existing basic commands
    this.basicCommandDisposables.forEach((d) => d.dispose());
    this.basicCommandDisposables = [];

    // Register new basic commands
    this.basicCommandDisposables = [
      vscode.commands.registerCommand('vscode-testrail.login', () => this.handleLogin()),
      vscode.commands.registerCommand('vscode-testrail.logout', () => this.handleLogout()),
      vscode.commands.registerCommand('vscode-testrail.refresh', () => this.handleRefresh()),
    ];

    // Add to subscriptions
    this.basicCommandDisposables.forEach((d) => this.context.subscriptions.push(d));
  }

  private async initializeClient() {
    console.log('Initializing client');
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
        console.log(`Client connection test successful, found ${projects.length} projects`);
      } catch (error) {
        console.error('Failed to initialize client:', error);
        this.client = undefined;
        vscode.window.showErrorMessage(
          `Failed to initialize TestRail client: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    } else {
      console.log('No stored credentials found');
    }
  }

  private initializeClientDependentCommands() {
    if (!this.client) return;

    console.log('Initializing client-dependent commands');
    this.testCaseCommands = new TestCaseCommands(this.client, this.auth);
    this.suiteCommands = new SuiteCommands(this.client, this.auth);
    this.sectionCommands = new SectionCommands(this.client, this.auth);

    // Register client-dependent commands directly to context.subscriptions
    this.context.subscriptions.push(
      // TestCase commands
      vscode.commands.registerCommand('vscode-testrail.openTestCase', (testCase) =>
        this.testCaseCommands?.handleOpenTestCase(testCase)
      ),
      vscode.commands.registerCommand('vscode-testrail.addTestCase', (arg) =>
        this.testCaseCommands?.handleAddTestCase(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.deleteTestCase', (arg) =>
        this.testCaseCommands?.handleDeleteTestCase(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.duplicateTestCase', (arg) =>
        this.testCaseCommands?.handleDuplicateTestCase(arg)
      ),

      // Suite commands
      vscode.commands.registerCommand('vscode-testrail.addSuite', (arg) =>
        this.suiteCommands?.handleAddSuite(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.editSuite', (arg) =>
        this.suiteCommands?.handleEditSuite(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.deleteSuite', (arg) =>
        this.suiteCommands?.handleDeleteSuite(arg)
      ),

      // Section commands
      vscode.commands.registerCommand('vscode-testrail.addSection', (arg) =>
        this.sectionCommands?.handleAddSection(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.editSection', (arg) =>
        this.sectionCommands?.handleEditSection(arg)
      ),
      vscode.commands.registerCommand('vscode-testrail.deleteSection', (arg) =>
        this.sectionCommands?.handleDeleteSection(arg)
      )
    );
  }

  private initializeTreeView() {
    if (!this.client) return;

    console.log('Initializing TreeView');
    if (this.treeDataProvider) {
      this.treeDataProvider.refresh();
    } else {
      this.treeDataProvider = new TestRailTreeProvider(this.client);
      const treeView = vscode.window.createTreeView('testRailExplorer', {
        treeDataProvider: this.treeDataProvider,
        showCollapseAll: true,
      });
      this.context.subscriptions.push(treeView);
    }
  }

  async handleLogin() {
    console.log('Handling login');
    try {
      await this.auth.login();
      await this.initialize();
    } catch (error) {
      console.error('Login failed:', error);
      vscode.window.showErrorMessage(
        `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async handleLogout() {
    console.log('Handling logout');
    try {
      await this.auth.logout();
      this.client = undefined;
      this.treeDataProvider = undefined;
      // Only dispose basic commands, keep client-dependent commands in subscriptions
      this.basicCommandDisposables.forEach((d) => d.dispose());
      this.basicCommandDisposables = [];
      await this.initialize();
      vscode.window.showInformationMessage('Successfully logged out from TestRail');
    } catch (error) {
      console.error('Logout failed:', error);
      vscode.window.showErrorMessage(
        `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  handleRefresh() {
    console.log('Handling refresh');
    if (this.treeDataProvider) {
      this.treeDataProvider.refresh();
    } else {
      vscode.window.showWarningMessage('Please login to TestRail first');
    }
  }
}
