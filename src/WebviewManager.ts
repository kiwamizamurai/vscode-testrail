import * as vscode from 'vscode';

/**
 * Manages webview panels to prevent duplicate panels for the same item
 */
export class WebviewManager {
  private static instance: WebviewManager;
  private panels: Map<string, vscode.WebviewPanel> = new Map();

  private constructor() {}

  public static getInstance(): WebviewManager {
    if (!WebviewManager.instance) {
      WebviewManager.instance = new WebviewManager();
    }
    return WebviewManager.instance;
  }

  /**
   * Creates a new webview panel or returns an existing one for the same item
   */
  public createOrShowWebviewPanel(
    viewType: string,
    title: string,
    itemId: number,
    column: vscode.ViewColumn = vscode.ViewColumn.One,
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  ): vscode.WebviewPanel {
    // Create a unique key for this panel
    const panelKey = `${viewType}-${itemId}`;

    // Check if we already have a panel for this item
    const existingPanel = this.panels.get(panelKey);
    if (existingPanel) {
      // If we do, show it and return it
      existingPanel.reveal(column);
      return existingPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(viewType, title, column, options);

    // Add it to our map
    this.panels.set(panelKey, panel);

    // When the panel is disposed, remove it from the map
    panel.onDidDispose(() => {
      this.panels.delete(panelKey);
    });

    return panel;
  }

  /**
   * Gets an existing webview panel for the specified item
   */
  public getExistingPanel(viewType: string, itemId: number): vscode.WebviewPanel | undefined {
    const panelKey = `${viewType}-${itemId}`;
    return this.panels.get(panelKey);
  }
} 