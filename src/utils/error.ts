import * as vscode from 'vscode';

export function handleError(error: unknown, operation: string): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Failed to ${operation}:`, error);
  vscode.window.showErrorMessage(`Failed to ${operation}: ${message}`);
}

export async function showConfirmationDialog(message: string, detail?: string): Promise<boolean> {
  const selection = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    { title: 'Delete', isCloseAffordance: false },
    { title: 'Cancel', isCloseAffordance: true }
  );
  return selection?.title === 'Delete';
}

export async function showInputDialog(
  prompt: string,
  placeHolder?: string,
  validateInput?: (value: string) => string | null | Thenable<string | null>
): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt,
    placeHolder,
    validateInput,
  });
}
