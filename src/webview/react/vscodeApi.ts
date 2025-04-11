/**
 * Helper for VS Code webview API
 */

// Safely acquire the VS Code API only once
let vscodeInstance: any;

try {
  vscodeInstance = acquireVsCodeApi();
} catch (error) {
  console.warn("VS Code API already acquired, using existing instance");
  // If it fails, the API was already acquired somewhere else
}

export const vscode = vscodeInstance;

declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};
