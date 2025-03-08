import React, { useState } from "react";
import { formatDate } from "../../../utils/format";

// Add type declarations to avoid linter errors
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

interface Result {
  id: number;
  test_id: number;
  status_id: number;
  created_on: number;
  created_by: number;
  assignedto_id: number;
  comment: string;
  defects: string;
  version: string;
  elapsed: string;
  attachment_ids: number[];
  custom_fields?: Record<string, unknown>;
}

interface Status {
  id: number;
  name: string;
  label?: string;
  color_dark?: string;
  color_medium?: string;
  color_bright?: string;
  is_system: boolean;
  is_untested: boolean;
  is_final: boolean;
}

interface ResultViewProps {
  data: {
    test: {
      id: number;
      title: string;
    };
    results: Result[];
    host: string;
    statuses: Status[];
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const ResultView: React.FC<ResultViewProps> = ({ data, vscode }) => {
  // Check if data is undefined
  if (!data) {
    return (
      <div className="error-container">
        <h1>Error</h1>
        <p>No data available. Please try again.</p>
      </div>
    );
  }

  const { test, results, host, statuses } = data;

  // State for create result form
  const [isCreatingResult, setIsCreatingResult] = useState(
    results.length === 0
  );
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [defects, setDefects] = useState("");
  const [elapsed, setElapsed] = useState("");
  const [version, setVersion] = useState("");
  const [formError, setFormError] = useState("");

  // State to track the selected result
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const selectedResult =
    results.length > 0 ? results[selectedResultIndex] : null;

  // Get the status name
  const getStatusName = (statusId: number) => {
    const status = statuses.find((s) => s.id === statusId);
    return status ? status.name : `Status ID: ${statusId}`;
  };

  // Get the status class
  // const getStatusClass = (statusId: number) => {
  //   const statusName = getStatusName(statusId).toLowerCase();
  //   return `status-${statusName.replace(/\s+/g, "-")}`;
  // };

  // Get status color
  const getStatusColor = (statusId: number) => {
    const status = statuses.find((s) => s.id === statusId);
    if (!status) return "#999999";

    // Convert RGB integer to hex color
    const rgbToHex = (rgb: number) => {
      const hex = rgb.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    // Use medium color if available
    if (status.color_medium) {
      // Convert RGB integer to R, G, B components
      const colorMedium = status.color_medium;
      // TypeScriptでビット演算を行う前に数値型であることを確認
      const numColor = Number(colorMedium);
      const r = (numColor & 0xff0000) >> 16;
      const g = (numColor & 0x00ff00) >> 8;
      const b = numColor & 0x0000ff;
      return `#${rgbToHex(r)}${rgbToHex(g)}${rgbToHex(b)}`;
    }

    // Default colors based on common status names
    const statusName = status.name.toLowerCase();
    if (statusName.includes("pass")) return "#4CAF50";
    if (statusName.includes("fail")) return "#F44336";
    if (statusName.includes("block")) return "#FF9800";
    if (statusName.includes("retest")) return "#2196F3";
    return "#999999";
  };

  // Handle view attachment click
  const handleViewAttachment = (attachmentId: number) => {
    vscode.postMessage({
      command: "viewAttachment",
      attachmentId,
    });
  };

  // Handle add result click
  const handleAddResult = () => {
    setIsCreatingResult(true);
  };

  // Handle save result
  const handleSaveResult = () => {
    if (!selectedStatusId) {
      setFormError("Please select a status");
      return;
    }

    // Validate elapsed time format if provided
    if (elapsed && !/^(\d+[ms](?: \d+[ms])?)?$/.test(elapsed)) {
      setFormError('Invalid time format. Use format like "30s" or "1m 45s"');
      return;
    }

    // Clear any previous errors
    setFormError("");

    // Send message to create result
    vscode.postMessage({
      type: "addResult",
      data: {
        test_id: test.id,
        status_id: selectedStatusId,
        comment,
        defects,
        elapsed,
        version,
      },
    });
  };

  // Handle cancel create
  const handleCancelCreate = () => {
    if (results.length > 0) {
      setIsCreatingResult(false);
    }
  };

  // Render create result form
  const renderCreateForm = () => {
    // Filter out the "Untested" status which is not valid for API calls
    const validStatuses = statuses.filter((status) => !status.is_untested);

    return (
      <div className="create-result-form card">
        <h2 className="card-header">Add Test Result</h2>

        <div className="card-body">
          {formError && (
            <div className="error-message alert alert-danger">
              <i className="icon-error"></i> {formError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="status">Status:</label>
            <select
              id="status"
              value={selectedStatusId || ""}
              onChange={(e) => setSelectedStatusId(Number(e.target.value))}
              className="form-control"
            >
              <option value="">Select a status</option>
              {validStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="comment">Comment:</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="form-control"
              rows={4}
              placeholder="Enter your comments about the test result"
            />
          </div>

          <div className="form-row">
            <div className="form-group col-md-6">
              <label htmlFor="defects">Defects:</label>
              <input
                id="defects"
                type="text"
                value={defects}
                onChange={(e) => setDefects(e.target.value)}
                className="form-control"
                placeholder="e.g., TR-123, BUG-456"
              />
            </div>

            <div className="form-group col-md-6">
              <label htmlFor="version">Version:</label>
              <input
                id="version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="form-control"
                placeholder="e.g., 1.0.0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="elapsed">Elapsed Time:</label>
            <input
              id="elapsed"
              type="text"
              value={elapsed}
              onChange={(e) => setElapsed(e.target.value)}
              className="form-control"
              placeholder="e.g., 30s, 1m 45s"
            />
            <small className="form-text text-muted">
              Format: 30s, 1m 45s, etc.
            </small>
          </div>
        </div>

        <div className="card-footer">
          <div className="button-group">
            <button onClick={handleSaveResult} className="btn btn-primary">
              <i className="icon-save"></i> Save Result
            </button>
            {results.length > 0 && (
              <button
                onClick={handleCancelCreate}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render results view
  const renderResultsView = () => {
    if (!selectedResult) return null;

    return (
      <>
        {results.length > 1 && (
          <div className="result-selector card">
            <div className="card-body">
              <label htmlFor="result-select">Select Result:</label>
              <select
                id="result-select"
                value={selectedResultIndex}
                onChange={(e) => setSelectedResultIndex(Number(e.target.value))}
                className="form-control"
              >
                {results.map((result, index) => (
                  <option key={result.id} value={index}>
                    {getStatusName(result.status_id)} -{" "}
                    {formatDate(result.created_on)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="result-info card">
          <div className="card-header">
            <div
              className="status-badge"
              style={{
                backgroundColor: getStatusColor(selectedResult.status_id),
              }}
            >
              {getStatusName(selectedResult.status_id)}
            </div>
          </div>
          <div className="card-body">
            <div className="result-details">
              <div className="detail-row">
                <div className="detail-label">Result ID:</div>
                <div className="detail-value">{selectedResult.id}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Test ID:</div>
                <div className="detail-value">{selectedResult.test_id}</div>
              </div>
              <div className="detail-row">
                <div className="detail-label">Created:</div>
                <div className="detail-value">
                  {formatDate(selectedResult.created_on)}
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-label">TestRail:</div>
                <div className="detail-value">
                  <a
                    href={`${host}/index.php?/results/view/${selectedResult.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="testrail-link"
                  >
                    <i className="icon-external-link"></i> View in TestRail
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedResult.comment && (
          <div className="content-section card">
            <div className="card-header">
              <h3>Comment</h3>
            </div>
            <div className="card-body">
              <div
                className="comment-content"
                dangerouslySetInnerHTML={{
                  __html: selectedResult.comment.replace(/\n/g, "<br>"),
                }}
              />
            </div>
          </div>
        )}

        <div className="result-metadata">
          {selectedResult.defects && (
            <div className="metadata-card card">
              <div className="card-header">
                <h3>Defects</h3>
              </div>
              <div className="card-body">
                <div className="defects-list">
                  {selectedResult.defects.split(",").map((defect, index) => (
                    <span key={index} className="defect-tag">
                      {defect.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedResult.version && (
            <div className="metadata-card card">
              <div className="card-header">
                <h3>Version</h3>
              </div>
              <div className="card-body">
                <div className="version-tag">{selectedResult.version}</div>
              </div>
            </div>
          )}

          {selectedResult.elapsed && (
            <div className="metadata-card card">
              <div className="card-header">
                <h3>Elapsed Time</h3>
              </div>
              <div className="card-body">
                <div className="elapsed-time">
                  <i className="icon-time"></i> {selectedResult.elapsed}
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedResult.attachment_ids &&
          selectedResult.attachment_ids.length > 0 && (
            <div className="content-section card">
              <div className="card-header">
                <h3>Attachments</h3>
              </div>
              <div className="card-body">
                <ul className="attachment-list">
                  {selectedResult.attachment_ids.map((attachmentId) => (
                    <li key={attachmentId} className="attachment-item">
                      <button
                        className="attachment-link"
                        onClick={() => handleViewAttachment(attachmentId)}
                      >
                        <i className="icon-attachment"></i> Attachment #
                        {attachmentId}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
      </>
    );
  };

  return (
    <div className="container result-view">
      <div className="header">
        <h1 className="page-title">
          <i className="icon-test-result"></i> Test Results: {test.title}
        </h1>
        <div className="actions">
          {!isCreatingResult && (
            <button onClick={handleAddResult} className="btn btn-primary">
              <i className="icon-plus"></i> Add Result
            </button>
          )}
        </div>
      </div>

      <style>
        {`
        .result-view {
          padding: 20px;
          max-width: 100%;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .page-title {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn {
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          border: none;
        }
        
        .btn-primary {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .card {
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 6px;
          margin-bottom: 20px;
          overflow: hidden;
        }
        
        .card-header {
          background-color: var(--vscode-sideBar-background);
          padding: 10px 15px;
          border-bottom: 1px solid var(--vscode-panel-border);
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        
        .card-header h2, .card-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .card-body {
          padding: 15px;
        }
        
        .card-footer {
          padding: 10px 15px;
          border-top: 1px solid var(--vscode-panel-border);
          background-color: var(--vscode-sideBar-background);
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-row {
          display: flex;
          margin-left: -8px;
          margin-right: -8px;
          flex-wrap: wrap;
        }
        
        .col-md-6 {
          flex: 0 0 50%;
          max-width: 50%;
          padding: 0 8px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-control {
          width: 100%;
          padding: 6px 10px;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
        }
        
        .form-control:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }
        
        .form-text {
          font-size: 12px;
          margin-top: 4px;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
        }
        
        .alert {
          padding: 10px 15px;
          margin-bottom: 15px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .alert-danger {
          background-color: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
          color: #f44336;
        }
        
        .result-selector {
          margin-bottom: 20px;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          font-size: 14px;
        }
        
        .result-details {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px;
        }
        
        .detail-row {
          display: contents;
        }
        
        .detail-label {
          font-weight: 500;
          color: var(--vscode-descriptionForeground);
        }
        
        .testrail-link {
          color: var(--vscode-textLink-foreground);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .testrail-link:hover {
          text-decoration: underline;
        }
        
        .comment-content {
          line-height: 1.5;
        }
        
        .result-metadata {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .metadata-card {
          height: 100%;
        }
        
        .defects-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .defect-tag {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .version-tag {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        
        .elapsed-time {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .attachment-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .attachment-item {
          margin-bottom: 8px;
        }
        
        .attachment-link {
          background: none;
          border: none;
          color: var(--vscode-textLink-foreground);
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .attachment-link:hover {
          text-decoration: underline;
        }
        
        /* Icons */
        [class^="icon-"] {
          display: inline-block;
          width: 16px;
          height: 16px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }
        `}
      </style>

      {isCreatingResult ? renderCreateForm() : renderResultsView()}
    </div>
  );
};
