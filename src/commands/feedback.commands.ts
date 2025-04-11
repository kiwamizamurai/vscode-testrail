import * as vscode from "vscode";
import { ReactWebviewProvider } from "../ReactWebviewProvider";
import axios from "axios";

/**
 * Manages feedback and GitHub issue creation commands
 */
export class FeedbackCommands {
  private reactWebviewProvider: ReactWebviewProvider | undefined;

  constructor(private context: vscode.ExtensionContext) {
    // Don't initialize the ReactWebviewProvider in the constructor
    // We'll do it lazily when needed
  }

  /**
   * Opens the feedback form
   */
  async handleOpenFeedback() {
    try {
      // Lazily initialize the ReactWebviewProvider
      if (!this.reactWebviewProvider) {
        this.reactWebviewProvider = ReactWebviewProvider.getInstance(
          this.context.extensionUri
        );
      }

      // Get VS Code version
      const vscodeVersion = vscode.version;

      // Get extension version from package.json
      const extension = vscode.extensions.getExtension(
        "kiwamizamurai-vscode.testrail-vscode"
      );
      const extensionVersion = extension
        ? extension.packageJSON.version
        : "unknown";

      // Get GitHub repository info
      const repoOwner = "kiwamizamurai";
      const repoName = "vscode-testrail";
      const githubRepo = `${repoOwner}/${repoName}`;

      // Prepare data for the webview
      const data = {
        vscodeVersion,
        extensionVersion,
        githubRepo,
      };

      const panel = this.reactWebviewProvider.createOrShowWebviewPanel(
        "feedback",
        "TestRail Feedback",
        0, // Using 0 as a placeholder since we don't have a specific item ID
        data, // Pass version info to the feedback form
        vscode.ViewColumn.One
      );

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === "createIssue") {
          await this.handleCreateGitHubIssue(message.payload, panel);
        }
      });
    } catch (error) {
      console.error("Error opening feedback form:", error);
      vscode.window.showErrorMessage(
        `Error opening feedback form: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Creates a GitHub issue with the provided feedback
   */
  private async handleCreateGitHubIssue(
    payload: { title: string; description: string },
    panel: vscode.WebviewPanel
  ) {
    try {
      const { title, description } = payload;
      const config = vscode.workspace.getConfiguration("testRail");

      // Fixed GitHub repository information (not configurable)
      const repoOwner = "kiwamizamurai";
      const repoName = "vscode-testrail";

      // Try to get GitHub token from VS Code authentication provider
      let githubToken = "";
      try {
        // Get authentication session from GitHub auth provider
        const session = await vscode.authentication.getSession(
          "github",
          ["repo"],
          { createIfNone: true }
        );
        if (session) {
          githubToken = session.accessToken;
        }
      } catch (authError) {
        console.error("Error getting GitHub authentication:", authError);
        // Fallback to configuration token if authentication fails
        githubToken = config.get("githubToken") || "";
      }

      if (!githubToken) {
        // If no token is available via authentication or configuration, prompt the user
        const result = await vscode.window.showInformationMessage(
          "GitHub authentication is required to create issues. Would you like to sign in with GitHub?",
          "Sign in with GitHub",
          "Use Personal Access Token",
          "Cancel"
        );

        if (result === "Sign in with GitHub") {
          try {
            // Request GitHub authentication
            const session = await vscode.authentication.getSession(
              "github",
              ["repo"],
              { createIfNone: true }
            );
            if (session) {
              githubToken = session.accessToken;
            } else {
              throw new Error("Authentication failed");
            }
          } catch (error) {
            console.error("GitHub authentication error:", error);
            panel.webview.postMessage({
              type: "issueCreated",
              success: false,
              message: "GitHub authentication failed. Please try again later.",
            });
            return;
          }
        } else if (result === "Use Personal Access Token") {
          // Prompt for manual token input
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "testRail.githubToken"
          );

          panel.webview.postMessage({
            type: "issueCreated",
            success: false,
            message:
              "Please configure a GitHub token in settings and try again.",
          });
          return;
        } else {
          // User canceled
          panel.webview.postMessage({
            type: "issueCreated",
            success: false,
            message:
              "Issue creation canceled. GitHub authentication is required.",
          });
          return;
        }
      }

      // Create the issue using GitHub API with the obtained token
      const response = await axios.post(
        `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
        {
          title: title,
          body: description,
          labels: ["user-feedback"],
        },
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (response.status === 201) {
        panel.webview.postMessage({
          type: "issueCreated",
          success: true,
          message: `Issue created successfully! View it at: ${response.data.html_url}`,
        });

        vscode.window
          .showInformationMessage(
            `GitHub issue created: ${response.data.html_url}`,
            "Open in Browser"
          )
          .then((selection) => {
            if (selection === "Open in Browser") {
              vscode.env.openExternal(vscode.Uri.parse(response.data.html_url));
            }
          });
      } else {
        throw new Error(`Failed to create issue: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      panel.webview.postMessage({
        type: "issueCreated",
        success: false,
        message: `Failed to create issue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      vscode.window.showErrorMessage(
        `Failed to create GitHub issue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
