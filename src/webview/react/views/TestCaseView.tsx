import React, { useState, useRef, useEffect } from "react";
import { formatMarkdown, formatDate } from "../../../utils/format";

// Template type constants
const TEMPLATE_TEXT = 1; // Test Case (Text)
const TEMPLATE_STEPS = 2; // Test Case (Steps)
const TEMPLATE_EXPLORATORY = 3; // Exploratory Session
const TEMPLATE_BDD = 4; // Behaviour Driven Development

interface TestCase {
  id: number;
  title: string;
  created_on: number;
  updated_on: number;
  priority_id: number;
  type_id: number;
  template_id: number;
  project_id: number;
  estimate?: string;
  refs?: string;
  custom_steps: string;
  custom_expected: string;
  custom_preconds: string;
  custom_bdd_scenario: string;
  custom_mission?: string;
  custom_goals?: string;
  custom_steps_separated?: {
    content: string;
    expected: string;
  }[];
  custom_testdata?: string;
  custom_automation_tag?: string;
  custom_automation_id?: string;
  custom_testrail_bdd_scenario?: string;
  custom_autotag?: string;
}

interface CaseType {
  id: number;
  name: string;
  is_default: boolean;
}

interface Priority {
  id: number;
  name: string;
  short_name: string;
  is_default: boolean;
}

interface Template {
  id: number;
  name: string;
  is_default: boolean;
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
    caseTypes?: CaseType[];
    priorities?: Priority[];
    templates?: Template[];
  };
  vscode: {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
  };
}

export const TestCaseView: React.FC<TestCaseViewProps> = ({ data, vscode }) => {
  const {
    testCase,
    host,
    attachments,
    caseTypes = [],
    priorities = [],
    templates = [],
  } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(testCase.title);
  const [steps, setSteps] = useState(testCase.custom_steps || "");
  const [expected, setExpected] = useState(testCase.custom_expected || "");
  const [preconds, setPreConds] = useState(testCase.custom_preconds || "");
  const [bddScenario, setBddScenario] = useState(
    testCase.custom_bdd_scenario || ""
  );
  const [mission, setMission] = useState(testCase.custom_mission || "");
  const [goals, setGoals] = useState(testCase.custom_goals || "");
  const [testData, setTestData] = useState(testCase.custom_testdata || "");
  const [automationTag, setAutomationTag] = useState(
    testCase.custom_autotag || ""
  );
  const [automationId, setAutomationId] = useState(
    testCase.custom_automation_id || ""
  );
  const [exploratoryBddScenario, setExploratoryBddScenario] = useState(
    testCase.custom_testrail_bdd_scenario || ""
  );
  const [stepsSeparated, setStepsSeparated] = useState(
    testCase.custom_steps_separated || []
  );
  const [priorityId, setPriorityId] = useState(testCase.priority_id);
  const [typeId, setTypeId] = useState(testCase.type_id);
  const [templateId, setTemplateId] = useState(testCase.template_id);
  const [estimate, setEstimate] = useState(testCase.estimate || "");
  const [refs, setRefs] = useState(testCase.refs || "");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Record<string, string>>({});

  // Request metadata when component mounts
  useEffect(() => {
    vscode.postMessage({
      type: "getTestCaseMetadata",
    });
  }, [vscode]);

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
      } else if (message.type === "testCaseMetadata") {
        // Update the component with the received metadata
        const { caseTypes, priorities, templates } = message.data;
        // We don't need to update state here as the data is already passed via props
        console.log("Received metadata:", { caseTypes, priorities, templates });
      } else if (message.type === "update") {
        // Reset file input to prevent duplicate uploads
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    window.addEventListener("message", messageHandler);
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  const handleSave = () => {
    // Prepare data based on template type
    const saveData: any = {
      id: testCase.id,
      title,
      priority_id: priorityId,
      type_id: typeId,
      template_id: templateId,
      estimate,
      refs,
    };

    // Add template-specific fields
    switch (templateId) {
      case TEMPLATE_TEXT:
        saveData.custom_steps = steps;
        saveData.custom_expected = expected;
        saveData.custom_preconds = preconds;
        saveData.custom_testdata = testData;
        saveData.custom_automation_id = automationId;
        saveData.custom_autotag = automationTag;
        saveData.custom_testrail_bdd_scenario = exploratoryBddScenario;
        break;
      case TEMPLATE_STEPS:
        saveData.custom_steps_separated = stepsSeparated;
        saveData.custom_preconds = preconds;
        saveData.custom_steps = steps;
        saveData.custom_expected = expected;
        saveData.custom_testdata = testData;
        saveData.custom_automation_id = automationId;
        saveData.custom_autotag = automationTag;
        saveData.custom_testrail_bdd_scenario = exploratoryBddScenario;
        break;
      case TEMPLATE_EXPLORATORY:
        saveData.custom_steps = steps;
        saveData.custom_expected = expected;
        saveData.custom_preconds = preconds;
        saveData.custom_testrail_bdd_scenario = exploratoryBddScenario;
        saveData.custom_testdata = testData;
        saveData.custom_autotag = automationTag;
        saveData.custom_automation_id = automationId;
        saveData.custom_mission = mission;
        saveData.custom_goals = goals;
        break;
      case TEMPLATE_BDD:
        saveData.custom_bdd_scenario = bddScenario;
        saveData.custom_preconds = preconds;
        saveData.custom_expected = expected;
        saveData.custom_testdata = testData;
        saveData.custom_automation_id = automationId;
        break;
    }

    // Send the updated data to the extension
    vscode.postMessage({
      type: "saveTestCase",
      data: saveData,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitle(testCase.title);
    setSteps(testCase.custom_steps || "");
    setExpected(testCase.custom_expected || "");
    setPreConds(testCase.custom_preconds || "");
    setBddScenario(testCase.custom_bdd_scenario || "");
    setMission(testCase.custom_mission || "");
    setGoals(testCase.custom_goals || "");
    setTestData(testCase.custom_testdata || "");
    setAutomationTag(testCase.custom_autotag || "");
    setAutomationId(testCase.custom_automation_id || "");
    setExploratoryBddScenario(testCase.custom_testrail_bdd_scenario || "");
    setStepsSeparated(testCase.custom_steps_separated || []);
    setPriorityId(testCase.priority_id);
    setTypeId(testCase.type_id);
    setTemplateId(testCase.template_id);
    setEstimate(testCase.estimate || "");
    setRefs(testCase.refs || "");
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

  // Handle template change
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplateId = Number(e.target.value);
    setTemplateId(newTemplateId);
  };

  // Add a new separated step
  const handleAddStep = () => {
    setStepsSeparated([...stepsSeparated, { content: "", expected: "" }]);
  };

  // Update a separated step
  const handleUpdateStep = (
    index: number,
    field: "content" | "expected",
    value: string
  ) => {
    const updatedSteps = [...stepsSeparated];
    updatedSteps[index][field] = value;
    setStepsSeparated(updatedSteps);
  };

  // Remove a separated step
  const handleRemoveStep = (index: number) => {
    const updatedSteps = [...stepsSeparated];
    updatedSteps.splice(index, 1);
    setStepsSeparated(updatedSteps);
  };

  // Move a step up or down
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === stepsSeparated.length - 1)
    ) {
      return;
    }

    const updatedSteps = [...stepsSeparated];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const step = updatedSteps[index];
    updatedSteps.splice(index, 1);
    updatedSteps.splice(newIndex, 0, step);
    setStepsSeparated(updatedSteps);
  };

  // Render form fields based on template type
  const renderTemplateFields = () => {
    if (!isEditing) {
      // Render view mode based on template
      switch (templateId) {
        case TEMPLATE_BDD:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenario</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(bddScenario),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(preconds || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(expected || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(testData || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div className="meta-info" style={{ marginBottom: "10px" }}>
                    <div className="meta-item">
                      <span className="meta-label">Automation ID:</span>
                      <span>{automationId || "Not specified"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_EXPLORATORY:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Mission</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(mission || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Goals</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(goals || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(preconds || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(steps) }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(expected || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(testData || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(exploratoryBddScenario || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div className="meta-info" style={{ marginBottom: "10px" }}>
                    <div className="meta-item">
                      <span className="meta-label">Automation Tag:</span>
                      <span>{automationTag || "Not specified"}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Automation ID:</span>
                      <span>{automationId || "Not specified"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_STEPS:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(preconds),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(steps) }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(expected),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(testData || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps Separated</h2>
                </div>
                <div className="section-content">
                  {stepsSeparated && stepsSeparated.length > 0 ? (
                    <div className="steps-separated">
                      {stepsSeparated.map((step, index) => (
                        <div
                          key={index}
                          className="step-item"
                          style={{
                            marginBottom: "20px",
                            padding: "10px",
                            border: "1px solid var(--vscode-panel-border)",
                          }}
                        >
                          <div
                            className="step-number"
                            style={{ fontWeight: "bold", marginBottom: "5px" }}
                          >
                            Step {index + 1}
                          </div>
                          <div
                            className="step-content"
                            style={{ marginBottom: "10px" }}
                          >
                            <div
                              className="step-label"
                              style={{
                                fontWeight: "bold",
                                marginBottom: "5px",
                              }}
                            >
                              Description:
                            </div>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: formatMarkdown(step.content),
                              }}
                            />
                          </div>
                          <div className="step-expected">
                            <div
                              className="step-label"
                              style={{
                                fontWeight: "bold",
                                marginBottom: "5px",
                              }}
                            >
                              Expected Result:
                            </div>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: formatMarkdown(step.expected),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>No steps defined</div>
                  )}
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(exploratoryBddScenario || ""),
                    }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div className="meta-info" style={{ marginBottom: "10px" }}>
                    <div className="meta-item">
                      <span className="meta-label">Automation Tag:</span>
                      <span>{automationTag || "Not specified"}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Automation ID:</span>
                      <span>{automationId || "Not specified"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_TEXT:
        default:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={preconds}
                    onChange={(e) => setPreConds(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter preconditions"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test steps"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter expected result"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test data"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={exploratoryBddScenario}
                    onChange={(e) => setExploratoryBddScenario(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter BDD scenarios"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation Tag:
                    </label>
                    <input
                      type="text"
                      value={automationTag}
                      onChange={(e) => setAutomationTag(e.target.value)}
                      placeholder="Enter automation tag"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation ID:
                    </label>
                    <input
                      type="text"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      placeholder="Enter automation ID"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
      }
    } else {
      // Render edit mode based on template
      switch (templateId) {
        case TEMPLATE_BDD:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenario</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={bddScenario}
                    onChange={(e) => setBddScenario(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter BDD scenario in Given-When-Then format"
                    style={{ minHeight: "200px" }}
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={preconds}
                    onChange={(e) => setPreConds(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter preconditions"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter expected result"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test data"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation ID:
                    </label>
                    <input
                      type="text"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      placeholder="Enter automation ID"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_EXPLORATORY:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Mission</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter the mission for this exploratory session"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Goals</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter the goals for this exploratory session"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={preconds}
                    onChange={(e) => setPreConds(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter preconditions"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test steps"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter expected result"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test data"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={exploratoryBddScenario}
                    onChange={(e) => setExploratoryBddScenario(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter BDD scenarios"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation Tag:
                    </label>
                    <input
                      type="text"
                      value={automationTag}
                      onChange={(e) => setAutomationTag(e.target.value)}
                      placeholder="Enter automation tag"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation ID:
                    </label>
                    <input
                      type="text"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      placeholder="Enter automation ID"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_STEPS:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={preconds}
                    onChange={(e) => setPreConds(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter preconditions"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test steps"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter expected result"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test data"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps Separated</h2>
                  <button
                    onClick={handleAddStep}
                    style={{
                      backgroundColor: "var(--vscode-button-background)",
                      color: "var(--vscode-button-foreground)",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Add Step
                  </button>
                </div>
                <div className="section-content">
                  {stepsSeparated.map((step, index) => (
                    <div
                      key={index}
                      className="step-item"
                      style={{
                        marginBottom: "20px",
                        padding: "10px",
                        border: "1px solid var(--vscode-panel-border)",
                        borderRadius: "4px",
                      }}
                    >
                      <div
                        className="step-header"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          className="step-number"
                          style={{ fontWeight: "bold" }}
                        >
                          Step {index + 1}
                        </div>
                        <div className="step-actions">
                          <button
                            onClick={() => handleMoveStep(index, "up")}
                            disabled={index === 0}
                            style={{
                              marginRight: "5px",
                              opacity: index === 0 ? 0.5 : 1,
                              cursor: index === 0 ? "default" : "pointer",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveStep(index, "down")}
                            disabled={index === stepsSeparated.length - 1}
                            style={{
                              marginRight: "5px",
                              opacity:
                                index === stepsSeparated.length - 1 ? 0.5 : 1,
                              cursor:
                                index === stepsSeparated.length - 1
                                  ? "default"
                                  : "pointer",
                            }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleRemoveStep(index)}
                            style={{
                              backgroundColor: "var(--vscode-errorForeground)",
                              color: "white",
                              border: "none",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <textarea
                            value={step.content}
                            onChange={(e) =>
                              handleUpdateStep(index, "content", e.target.value)
                            }
                            className="full-width-textarea"
                            placeholder="Enter step description"
                            style={{
                              width: "100%",
                              minHeight: "150px",
                              border: "1px solid var(--vscode-panel-border)",
                              borderRadius: "4px",
                              padding: "8px",
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <textarea
                            value={step.expected}
                            onChange={(e) =>
                              handleUpdateStep(
                                index,
                                "expected",
                                e.target.value
                              )
                            }
                            className="full-width-textarea"
                            placeholder="Enter expected result for this step"
                            style={{
                              width: "100%",
                              minHeight: "150px",
                              border: "1px solid var(--vscode-panel-border)",
                              borderRadius: "4px",
                              padding: "8px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {stepsSeparated.length === 0 && (
                    <div style={{ marginBottom: "10px" }}>
                      No steps defined. Click "Add Step" to create your first
                      step.
                    </div>
                  )}
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={exploratoryBddScenario}
                    onChange={(e) => setExploratoryBddScenario(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter BDD scenarios"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation Tag:
                    </label>
                    <input
                      type="text"
                      value={automationTag}
                      onChange={(e) => setAutomationTag(e.target.value)}
                      placeholder="Enter automation tag"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation ID:
                    </label>
                    <input
                      type="text"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      placeholder="Enter automation ID"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        case TEMPLATE_TEXT:
        default:
          return (
            <>
              <div className="content-section">
                <div className="section-header">
                  <h2>Preconditions</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={preconds}
                    onChange={(e) => setPreConds(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter preconditions"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Steps</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test steps"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Expected Result</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter expected result"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Test Data</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter test data"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>BDD Scenarios</h2>
                </div>
                <div className="section-content">
                  <textarea
                    value={exploratoryBddScenario}
                    onChange={(e) => setExploratoryBddScenario(e.target.value)}
                    className="full-width-textarea"
                    placeholder="Enter BDD scenarios"
                  />
                </div>
              </div>
              <div className="content-section">
                <div className="section-header">
                  <h2>Automation</h2>
                </div>
                <div className="section-content">
                  <div style={{ marginBottom: "15px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation Tag:
                    </label>
                    <input
                      type="text"
                      value={automationTag}
                      onChange={(e) => setAutomationTag(e.target.value)}
                      placeholder="Enter automation tag"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "5px",
                        fontWeight: "bold",
                      }}
                    >
                      Automation ID:
                    </label>
                    <input
                      type="text"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                      placeholder="Enter automation ID"
                      className="text-input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
      }
    }
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
            {isEditing ? (
              <select
                value={typeId}
                onChange={(e) => setTypeId(Number(e.target.value))}
                className="select-input"
              >
                {caseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {caseTypes.find((t) => t.id === testCase.type_id)?.name ||
                  `Type ${testCase.type_id}`}
              </span>
            )}
          </div>
          <div className="meta-item">
            <span className="meta-label">Priority:</span>
            {isEditing ? (
              <select
                value={priorityId}
                onChange={(e) => setPriorityId(Number(e.target.value))}
                className="select-input"
              >
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {priorities.find((p) => p.id === testCase.priority_id)?.name ||
                  `P${testCase.priority_id}`}
              </span>
            )}
          </div>
          <div className="meta-item">
            <span className="meta-label">Template:</span>
            {isEditing ? (
              <select
                value={templateId}
                onChange={handleTemplateChange}
                className="select-input"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {templates.find((t) => t.id === testCase.template_id)?.name ||
                  `Template ${testCase.template_id}`}
              </span>
            )}
          </div>
          <div className="meta-item">
            <span className="meta-label">Estimate:</span>
            {isEditing ? (
              <input
                type="text"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g. 30m or 2h 30m"
                className="text-input"
              />
            ) : (
              <span>{testCase.estimate || "Not specified"}</span>
            )}
          </div>
          <div className="meta-item">
            <span className="meta-label">References:</span>
            {isEditing ? (
              <input
                type="text"
                value={refs}
                onChange={(e) => setRefs(e.target.value)}
                placeholder="e.g. JIRA-123, JIRA-456"
                className="text-input"
              />
            ) : (
              <span>{testCase.refs || "Not specified"}</span>
            )}
          </div>
        </div>
      </div>

      {renderTemplateFields()}

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
