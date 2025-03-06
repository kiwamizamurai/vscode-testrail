export const commonStyles = `
  body { 
    padding: 16px; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  .header { 
    margin-bottom: 24px; 
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 16px;
  }
  .meta-info { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
    gap: 12px;
    margin: 16px 0;
  }
  .meta-item { 
    display: flex; 
    gap: 8px;
    align-items: center;
  }
  .meta-label { 
    font-weight: 500; 
    color: var(--vscode-descriptionForeground);
  }
  .section { 
    margin-bottom: 24px; 
    background: var(--vscode-editor-background);
    border-radius: 6px;
    padding: 16px;
  }
  .section-header { 
    font-weight: 500; 
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-content {
    min-height: 100px; 
    white-space: pre-wrap;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
  }
  button {
    padding: 8px 16px; 
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background-color 0.2s, transform 0.1s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
  }
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  button:active {
    transform: translateY(1px);
  }
  button:focus {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
  button.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  button.secondary:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  button.primary {
    font-weight: 600;
  }
  button.icon-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .edit-mode-indicator {
    background: var(--vscode-editorInfo-background);
    color: var(--vscode-editorInfo-foreground);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
    display: none;
  }
  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
    padding: 12px;
    background: var(--vscode-editor-background);
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border);
  }
  textarea {
    width: 100%;
    min-height: 200px;
    padding: 8px;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 2px;
  }
  a {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .attachments {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .attachment-card {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .attachment-preview {
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--vscode-editor-background);
    overflow: hidden;
  }
  .preview-image {
    max-width: 100%;
    max-height: 100%;
    cursor: pointer;
  }
  .file-icon {
    font-size: 48px;
    color: var(--vscode-descriptionForeground);
  }
  .attachment-info {
    padding: 8px;
    flex-grow: 1;
  }
  .attachment-name {
    font-weight: 500;
    margin-bottom: 4px;
    word-break: break-all;
  }
  .attachment-meta {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
  .delete-attachment-button {
    margin: 8px;
    background: var(--vscode-errorForeground);
  }
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: var(--vscode-editor-background);
    padding: 20px;
    border-radius: 6px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .modal-content h2 {
    margin-top: 0;
    margin-bottom: 16px;
  }
  .form-group {
    margin-bottom: 16px;
  }
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
  .form-group input, .form-group select {
    width: 100%;
    padding: 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
  }
  .button-row {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }
  .button-group {
    display: flex;
    gap: 8px;
  }
  .close {
    position: absolute; 
    right: 32px;
    top: 16px;
    color: #f1f1f1;
    font-size: 40px;
    font-weight: bold;
    cursor: pointer;
  }
  .close:hover {
    color: #bbb;
  }
  .upload-button {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .upload-button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  .no-results {
    padding: 20px;
    text-align: center;
    color: var(--vscode-disabledForeground);
  }
  .test-section {
    margin-bottom: 20px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 16px;
  }
  .test-section h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: var(--vscode-editor-foreground);
  }
  .test-title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .test-details {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
    margin-bottom: 24px;
  }
  .test-details > div:nth-child(odd) {
    font-weight: 500;
    color: var(--vscode-descriptionForeground);
  }
  .result-card {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .result-header {
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--vscode-editor-background);
  }
  .result-status {
    font-weight: 600;
  }
  .result-date {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
  .result-body {
    padding: 16px;
  }
  .result-body > div {
    margin-bottom: 8px;
  }
  .result-footer {
    padding: 8px 16px;
    background: var(--vscode-editor-background);
    display: flex;
    justify-content: flex-end;
  }
  .status-passed {
    color: #4CAF50;
  }
  .status-failed {
    color: #F44336;
  }
  .status-blocked {
    color: #FF9800;
  }
  .status-untested {
    color: #9E9E9E;
  }
  .status-retest {
    color: #2196F3;
  }
  .select-input {
    width: 100%;
    padding: 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
  }
`; 