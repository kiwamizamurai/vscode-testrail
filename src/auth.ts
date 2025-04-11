import * as vscode from "vscode";

interface Credentials {
  email: string;
  apiKey: string;
}

export class TestRailAuth {
  private static readonly CREDENTIALS_KEY = "testRail.credentials";
  private static readonly HOST_KEY = "testRail.host";
  private credentials: Credentials | undefined;
  private host: string | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  async init(): Promise<void> {
    const storedCreds = await this.context.secrets.get(
      TestRailAuth.CREDENTIALS_KEY
    );
    this.credentials = storedCreds ? JSON.parse(storedCreds) : undefined;
    this.host = await this.context.globalState.get(TestRailAuth.HOST_KEY);
  }

  async login(): Promise<void> {
    const host = await vscode.window.showInputBox({
      prompt: "Enter your TestRail host URL",
      placeHolder: "https://example.testrail.io",
      value: this.host,
    });

    if (!host) return;

    const email = await vscode.window.showInputBox({
      prompt: "Enter your email",
      value: this.credentials?.email,
    });

    if (!email) return;

    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your API key or password",
      password: true,
    });

    if (!apiKey) return;

    this.credentials = { email, apiKey };
    this.host = host;

    // Store credentials securely
    await this.context.secrets.store(
      TestRailAuth.CREDENTIALS_KEY,
      JSON.stringify(this.credentials)
    );
    // Store host in regular state (needed for webview)
    await this.context.globalState.update(TestRailAuth.HOST_KEY, this.host);
  }

  async logout(): Promise<void> {
    this.credentials = undefined;
    this.host = undefined;
    await this.context.secrets.delete(TestRailAuth.CREDENTIALS_KEY);
    await this.context.globalState.update(TestRailAuth.HOST_KEY, undefined);
  }

  getStoredCredentials():
    | { host: string; email: string; apiKey: string }
    | undefined {
    if (!this.credentials || !this.host) return undefined;
    return {
      host: this.host,
      email: this.credentials.email,
      apiKey: this.credentials.apiKey,
    };
  }

  getHost(): string | undefined {
    return this.host;
  }
}
