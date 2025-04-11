import React, { useState, useEffect } from "react";
import { vscode } from "../vscodeApi";

interface FeedbackViewProps {
  data: {
    vscodeVersion?: string;
    extensionVersion?: string;
    githubRepo?: string;
  };
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ data }) => {
  const [issueType, setIssueType] = useState<"bug" | "feature">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Bug specific fields
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  // Feature specific fields
  const [problemRelated, setProblemRelated] = useState("");
  const [alternativesConsidered, setAlternativesConsidered] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [vscodeVersion, setVscodeVersion] = useState(data?.vscodeVersion || "");
  const [extensionVersion, setExtensionVersion] = useState(
    data?.extensionVersion || ""
  );

  const githubRepo = data?.githubRepo || "kiwamizamurai/vscode-testrail";

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "issueCreated") {
        setIsSubmitting(false);
        setSubmitResult({
          success: message.success,
          message: message.message,
        });
        if (message.success) {
          // Clear form on success
          setTitle("");
          setDescription("");
          setStepsToReproduce("");
          setExpectedBehavior("");
          setProblemRelated("");
          setAlternativesConsidered("");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    // Format title with prefix based on issue type
    const formattedTitle =
      issueType === "bug" ? `[Bug] ${title}` : `[Feature] ${title}`;

    // Create description based on issue type
    let formattedDescription = "";

    if (issueType === "bug") {
      formattedDescription = `## Describe the bug\n${description}\n\n## To Reproduce\n${stepsToReproduce}\n\n## Expected behavior\n${expectedBehavior}\n\n## Environment\n- VS Code Version: ${vscodeVersion}\n- Extension Version: ${extensionVersion}\n- OS: ${
        navigator.platform || "Unknown"
      }`;
    } else {
      formattedDescription = `## Is your feature request related to a problem?\n${problemRelated}\n\n## Describe the solution you'd like\n${description}\n\n## Describe alternatives you've considered\n${alternativesConsidered}\n\n## Additional context\n- VS Code Version: ${vscodeVersion}\n- Extension Version: ${extensionVersion}`;
    }

    vscode.postMessage({
      type: "createIssue",
      payload: {
        title: formattedTitle,
        description: formattedDescription,
      },
    });
  };

  return (
    <div className="feedback-container">
      <h2>Submit Feedback</h2>
      <p className="feedback-description">
        Found a bug or have a feature request? Submit your feedback here and
        we'll create a GitHub issue for you.
      </p>

      <div className="github-repo-info">
        <strong>GitHub Repository:</strong>{" "}
        <a
          href={`https://github.com/${githubRepo}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {githubRepo}
        </a>
      </div>

      {submitResult && (
        <div
          className={`feedback-result ${
            submitResult.success ? "success" : "error"
          }`}
        >
          {submitResult.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group issue-type-selector">
          <label>Issue Type</label>
          <div className="radio-group">
            <div
              className={`radio-option ${
                issueType === "bug" ? "selected" : ""
              }`}
              onClick={() => setIssueType("bug")}
            >
              <input
                type="radio"
                name="issueType"
                checked={issueType === "bug"}
                onChange={() => setIssueType("bug")}
              />
              Bug Report
            </div>
            <div
              className={`radio-option ${
                issueType === "feature" ? "selected" : ""
              }`}
              onClick={() => setIssueType("feature")}
            >
              <input
                type="radio"
                name="issueType"
                checked={issueType === "feature"}
                onChange={() => setIssueType("feature")}
              />
              Feature Request
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Brief description of the issue or feature request"
          />
        </div>

        {issueType === "bug" ? (
          <>
            <div className="form-group">
              <label htmlFor="description">Describe the bug</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="A clear and concise description of what the bug is. For example: 'TestRail extension crashes when connecting to server with custom fields'"
              />
            </div>

            <div className="form-group">
              <label htmlFor="stepsToReproduce">Steps to reproduce</label>
              <textarea
                id="stepsToReproduce"
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                required
                rows={4}
                placeholder="1. Open VS Code\n2. Connect to TestRail server at '...'\n3. Try to view a test case with custom fields\n4. See error message: '...'"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expectedBehavior">Expected behavior</label>
              <textarea
                id="expectedBehavior"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                required
                rows={3}
                placeholder="A clear and concise description of what you expected to happen. For example: 'The test case should display properly with all custom fields visible'"
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="problemRelated">
                Is your feature request related to a problem?
              </label>
              <textarea
                id="problemRelated"
                value={problemRelated}
                onChange={(e) => setProblemRelated(e.target.value)}
                rows={3}
                placeholder="A clear and concise description of what problem your feature request addresses. For example: 'I'm always frustrated when I have to manually sync test results after running tests'"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Describe the solution you'd like
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="A clear and concise description of what you want to happen. For example: 'Add an automatic sync feature that updates test results in TestRail when local tests are run'"
              />
            </div>

            <div className="form-group">
              <label htmlFor="alternativesConsidered">
                Describe alternatives you've considered
              </label>
              <textarea
                id="alternativesConsidered"
                value={alternativesConsidered}
                onChange={(e) => setAlternativesConsidered(e.target.value)}
                rows={3}
                placeholder="A clear and concise description of any alternative solutions or features you've considered. For example: 'I've tried using webhooks but they don't work well with my local development setup'"
              />
            </div>
          </>
        )}

        <div className="environment-info">
          <h3>Environment Information</h3>
          <div className="form-group">
            <label htmlFor="vscodeVersion">VS Code Version</label>
            <input
              type="text"
              id="vscodeVersion"
              value={vscodeVersion}
              onChange={(e) => setVscodeVersion(e.target.value)}
              placeholder="e.g., 1.86.0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="extensionVersion">TestRail Extension Version</label>
            <input
              type="text"
              id="extensionVersion"
              value={extensionVersion}
              onChange={(e) => setExtensionVersion(e.target.value)}
              placeholder="e.g., 1.3.1"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? "Creating Issue..." : "Create GitHub Issue"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackView;
