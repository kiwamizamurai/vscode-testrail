import * as vscode from "vscode";
import { TestRailAuth } from "./auth";
import { ExtensionManager } from "./ExtensionManager";

let manager: ExtensionManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
  if (!manager) {
    const auth = new TestRailAuth(context);
    manager = new ExtensionManager(context, auth);
    await manager.initialize();
  }
}

export function deactivate() {
  manager = undefined;
}
