import * as vscode from "vscode";

/**
 * Manages React-based webview panels
 */
export class ReactWebviewProvider {
  private static instance: ReactWebviewProvider | undefined;
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private extensionUri: vscode.Uri;

  private constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  public static getInstance(extensionUri: vscode.Uri): ReactWebviewProvider {
    if (!ReactWebviewProvider.instance) {
      ReactWebviewProvider.instance = new ReactWebviewProvider(extensionUri);
    } else if (ReactWebviewProvider.instance.extensionUri !== extensionUri) {
      // Update the URI if it's different (this should prevent VS Code API conflicts)
      ReactWebviewProvider.instance.extensionUri = extensionUri;
    }
    return ReactWebviewProvider.instance;
  }

  /**
   * Creates a new webview panel or returns an existing one for the same item
   */
  public createOrShowWebviewPanel(
    viewType: string,
    title: string,
    itemId: number,
    data: any,
    column: vscode.ViewColumn = vscode.ViewColumn.One,
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions = {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableFindWidget: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")],
    }
  ): vscode.WebviewPanel {
    // Create a unique key for this panel
    const panelKey = `${viewType}-${itemId}`;

    // Check if we already have a panel for this item
    const existingPanel = this.panels.get(panelKey);
    if (existingPanel) {
      // If we do, show it and update its data
      existingPanel.reveal(column);
      existingPanel.webview.postMessage({ type: "update", data });
      return existingPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(viewType, title, column, {
      ...options,
      // Configure webview options to prevent sandbox escape warning
      enableFindWidget: true,
    });

    // Configure the webview
    panel.webview.options = {
      ...options,
      enableScripts: true,
      enableForms: true,
      enableCommandUris: true,
    };

    // Set the webview's initial HTML content
    panel.webview.html = this.getWebviewContent(panel.webview);

    // Add it to our map
    this.panels.set(panelKey, panel);

    // When the panel is disposed, remove it from the map
    panel.onDidDispose(() => {
      this.panels.delete(panelKey);
    });

    // Wait for the webview to be ready before sending data
    panel.webview.onDidReceiveMessage((message) => {
      if (message.type === "ready") {
        // Send the initial data to the webview
        panel.webview.postMessage({
          type: "init",
          viewType,
          data,
        });
      }
    });

    return panel;
  }

  /**
   * Gets an existing webview panel for the specified item
   */
  public getExistingPanel(
    viewType: string,
    itemId: number
  ): vscode.WebviewPanel | undefined {
    const panelKey = `${viewType}-${itemId}`;
    return this.panels.get(panelKey);
  }

  /**
   * Updates the data in an existing panel
   */
  public updatePanelData(viewType: string, itemId: number, data: any): boolean {
    const panel = this.getExistingPanel(viewType, itemId);
    if (panel) {
      panel.webview.postMessage({ type: "update", data });
      return true;
    }
    return false;
  }

  /**
   * Generates the HTML content for the webview
   */
  private getWebviewContent(webview: vscode.Webview): string {
    // Get the local path to the main script and CSS files
    const scriptUri = this.getUri(webview, ["dist", "webview.js"]);
    const styleUri = this.getUri(webview, ["dist", "webview.css"]);

    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: https:; connect-src https:; frame-src https:;">
    <title>TestRail</title>
    <link href="${styleUri}" rel="stylesheet">
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 2px solid var(--vscode-progressBar-background, #0078D4);
        animation: spin 1s linear infinite;
      }
    </style>
</head>
<body>
    <div id="app"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Gets the URI for a resource
   */
  private getUri(webview: vscode.Webview, pathList: string[]): vscode.Uri {
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...pathList)
    );
  }

  /**
   * Generates a nonce for the Content Security Policy
   */
  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
