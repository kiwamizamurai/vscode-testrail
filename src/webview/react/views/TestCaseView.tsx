import React, { useState, useRef, useEffect } from "react";
import { formatMarkdown, formatDate } from "../../../utils/format";

interface TestCase {
  id: number;
  title: string;
  created_on: number;
  updated_on: number;
  priority_id: number;
  type_id: number;
  template_id: number;
  custom_steps: string;
  custom_expected: string;
  custom_preconds: string;
  custom_bdd_scenario: string;
}

interface Attachment {
  id: number;
  data_id: string;
  filename: string;
  size: number;
  created_on: number;
  is_image: boolean;
}

interface TestCaseViewProps {
  data: {
    testCase: TestCase;
    host: string;
    attachments: Attachment[];
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const TestCaseView: React.FC<TestCaseViewProps> = ({ data, vscode }) => {
  const { testCase, host, attachments } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(testCase.title);
  const [steps, setSteps] = useState(testCase.custom_steps || "");
  const [expected, setExpected] = useState(testCase.custom_expected || "");
  const [preconds, setPreConds] = useState(testCase.custom_preconds || "");
  const [bddScenario, setBddScenario] = useState(
    testCase.custom_bdd_scenario || ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Record<string, string>>({});

  // Request attachment data for images when component mounts or attachments change
  useEffect(() => {
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment) => {
        if (attachment.is_image) {
          vscode.postMessage({
            type: "getAttachment",
            data: {
              id: attachment.data_id,
            },
          });
        }
      });
    }
  }, [attachments, vscode]);

  // Listen for messages from the extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "attachmentData") {
        setImageData((prev) => ({
          ...prev,
          [message.id]: message.data,
        }));
      }
    };

    window.addEventListener("message", messageHandler);
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  const handleSave = () => {
    // Send the updated data to the extension
    vscode.postMessage({
      type: "saveTestCase",
      data: {
        id: testCase.id,
        title,
        custom_steps: steps,
        custom_expected: expected,
        custom_preconds: preconds,
        custom_bdd_scenario: bddScenario,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(testCase.title);
    setSteps(testCase.custom_steps || "");
    setExpected(testCase.custom_expected || "");
    setPreConds(testCase.custom_preconds || "");
    setBddScenario(testCase.custom_bdd_scenario || "");
    setIsEditing(false);
  };

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) {
      return <div className="no-attachments">No attachments</div>;
    }

    return (
      <div
        className="attachments"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "16px",
        }}
      >
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="attachment-card"
            style={{
              border: "1px solid var(--vscode-panel-border, #ccc)",
              borderRadius: "4px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="attachment-preview"
              style={{
                height: "150px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--vscode-editor-background)",
                padding: "8px",
              }}
            >
              {attachment.is_image ? (
                imageData[attachment.data_id] ? (
                  <img
                    src={`data:image/*;base64,${imageData[attachment.data_id]}`}
                    className="preview-image"
                    alt={attachment.filename}
                    onClick={() =>
                      setSelectedImage(
                        `data:image/*;base64,${imageData[attachment.data_id]}`
                      )
                    }
                    style={{
                      cursor: "pointer",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    <div
                      className="spinner"
                      style={{
                        width: "20px",
                        height: "20px",
                        border: "2px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: "50%",
                        borderTop:
                          "2px solid var(--vscode-progressBar-background)",
                        animation: "spin 1s linear infinite",
                        marginBottom: "8px",
                      }}
                    ></div>
                    <div>Loading...</div>
                  </div>
                )
              ) : (
                <div
                  className="file-icon"
                  onClick={() => {
                    // Request the file data and download it
                    vscode.postMessage({
                      type: "downloadAttachment",
                      data: {
                        id: attachment.data_id,
                        filename: attachment.filename,
                      },
                    });
                  }}
                  style={{
                    cursor: "pointer",
                    fontSize: "48px",
                  }}
                >
                  📄
                </div>
              )}
            </div>
            <div
              className="attachment-info"
              style={{
                padding: "8px",
                flex: "1",
              }}
            >
              <div
                className="attachment-name"
                style={{
                  fontWeight: "bold",
                  marginBottom: "4px",
                  wordBreak: "break-word",
                }}
              >
                {attachment.filename}
              </div>
              <div
                className="attachment-meta"
                style={{
                  fontSize: "0.8em",
                  color: "var(--vscode-descriptionForeground)",
                }}
              >
                {formatFileSize(attachment.size)} •
                {new Date(attachment.created_on * 1000).toLocaleDateString()}
              </div>
            </div>
            <button
              className="delete-attachment-button"
              data-id={attachment.data_id}
              onClick={() => handleDeleteAttachment(attachment.data_id)}
              style={{
                backgroundColor: "var(--vscode-errorForeground)",
                color: "white",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };

  const handleDeleteAttachment = (dataId: string) => {
    // Find the attachment object to get its ID
    const attachment = attachments.find((a) => a.data_id === dataId);

    if (!attachment) {
      console.error(`Attachment with data_id ${dataId} not found`);
      return;
    }

    // Send the delete request to the extension with both IDs
    vscode.postMessage({
      type: "deleteAttachment",
      data: {
        testCaseId: testCase.id,
        attachmentId: dataId,
      },
    });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const base64Data = reader.result?.toString().split(",")[1];
      if (base64Data) {
        vscode.postMessage({
          type: "uploadAttachment",
          data: {
            testCaseId: testCase.id,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64Data,
          },
        });
      }
    };

    reader.readAsDataURL(file);

    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="container">
      <div className="header">
        <div className="section-header">
          {isEditing ? (
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ minHeight: "40px" }}
            />
          ) : (
            <h1>{title}</h1>
          )}
          <div className="button-group">
            {isEditing ? (
              <div className="edit-actions">
                <button className="primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button onClick={handleCancel}>Cancel</button>
              </div>
            ) : (
              <button
                className="icon-button"
                onClick={() => setIsEditing(true)}
              >
                <span>✏️</span> Edit
              </button>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="edit-mode-indicator">
            Editing Mode - Make your changes and click Save when done
          </div>
        )}

        <div className="meta-info">
          <div className="meta-item">
            <span className="meta-label">URL:</span>
            <a
              href={`${host}/index.php?/cases/view/${testCase.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in TestRail
            </a>
          </div>
          <div className="meta-item">
            <span className="meta-label">ID:</span>
            <span>C{testCase.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Created:</span>
            <span>{formatDate(testCase.created_on)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Updated:</span>
            <span>{formatDate(testCase.updated_on)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Type:</span>
            <span>Type {testCase.type_id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Priority:</span>
            <span>P{testCase.priority_id}</span>
          </div>
        </div>
      </div>

      {testCase.custom_bdd_scenario ? (
        <div className="content-section">
          <div className="section-header">
            <h2>BDD Scenario</h2>
          </div>
          <div className="section-content">
            {isEditing ? (
              <textarea
                value={bddScenario}
                onChange={(e) => setBddScenario(e.target.value)}
                className="full-width-textarea"
              />
            ) : (
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(bddScenario),
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="content-section">
            <div className="section-header">
              <h2>Preconditions</h2>
            </div>
            <div className="section-content">
              {isEditing ? (
                <textarea
                  value={preconds}
                  onChange={(e) => setPreConds(e.target.value)}
                  className="full-width-textarea"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(preconds),
                  }}
                />
              )}
            </div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h2>Steps</h2>
            </div>
            <div className="section-content">
              {isEditing ? (
                <textarea
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  className="full-width-textarea"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(steps) }}
                />
              )}
            </div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h2>Expected Result</h2>
            </div>
            <div className="section-content">
              {isEditing ? (
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  className="full-width-textarea"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(expected) }}
                />
              )}
            </div>
          </div>
        </>
      )}

      <div className="content-section">
        <div className="section-header">
          <h2>Attachments</h2>
          <div className="button-group">
            <button
              className="icon-button upload-button"
              onClick={handleUploadClick}
              style={{
                backgroundColor: "var(--vscode-button-background)",
                color: "var(--vscode-button-foreground)",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>📎</span> Add Attachment
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </div>
        <div className="section-content">{renderAttachments()}</div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="image-modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="modal-content"
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
            }}
          >
            <span
              className="close"
              style={{
                position: "absolute",
                top: "-30px",
                right: "0",
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              &times;
            </span>
            <img
              src={selectedImage}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
