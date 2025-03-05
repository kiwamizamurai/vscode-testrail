import { Test, Result, Status, Run } from 'testrail-modern-client';

export async function getResultWebviewContent(
    test: Test, 
    results: Result[], 
    statuses: Status[], 
    host: string,
    parentRun?: Run
  ): Promise<string> {
    const statusMap = new Map<number, Status>();
    statuses.forEach(status => statusMap.set(status.id, status));
    
    const getStatusName = (statusId: number): string => {
      const status = statusMap.get(statusId);
      return status ? status.name : 'Unknown';
    };
    
    const getStatusClass = (statusId: number): string => {
      switch (statusId) {
        case 1: return 'status-passed';
        case 2: return 'status-blocked';
        case 3: return 'status-untested';
        case 4: return 'status-retest';
        case 5: return 'status-failed';
        default: return 'status-unknown';
      }
    };
    
    const formatDate = (timestamp: number): string => {
      return new Date(timestamp * 1000).toLocaleString();
    };
    
    const resultsHtml = results.length > 0 
      ? results.map((result, _index) => `
        <div class="result-card ${getStatusClass(result.status_id)}">
          <div class="result-header">
            <span class="result-status">${getStatusName(result.status_id)}</span>
            <span class="result-date">${formatDate(result.created_on)}</span>
          </div>
          <div class="result-body">
            ${result.comment ? `<div class="result-comment"><strong>Comment:</strong> ${result.comment}</div>` : ''}
            ${result.defects ? `<div class="result-defects"><strong>Defects:</strong> ${result.defects}</div>` : ''}
            ${result.elapsed ? `<div class="result-elapsed"><strong>Elapsed:</strong> ${result.elapsed}</div>` : ''}
            ${result.version ? `<div class="result-version"><strong>Version:</strong> ${result.version}</div>` : ''}
          </div>
          <div class="result-footer">
            <button class="view-in-testrail" onclick="openInTestRail(${result.id})">View in TestRail</button>
          </div>
        </div>
      `).join('')
      : '<div class="no-results">No results found for this test.</div>';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Results</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
          }
          .test-info {
            margin-bottom: 20px;
          }
          .test-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .test-details {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px;
            margin-bottom: 20px;
          }
          .test-details div:nth-child(odd) {
            font-weight: bold;
          }
          .results-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .result-card {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
          }
          .result-header {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .result-body {
            padding: 10px;
          }
          .result-footer {
            padding: 10px;
            display: flex;
            justify-content: flex-end;
            border-top: 1px solid var(--vscode-panel-border);
          }
          .result-status {
            font-weight: bold;
          }
          .status-passed {
            border-left: 5px solid #4CAF50;
          }
          .status-failed {
            border-left: 5px solid #F44336;
          }
          .status-blocked {
            border-left: 5px solid #FF9800;
          }
          .status-untested {
            border-left: 5px solid #9E9E9E;
          }
          .status-retest {
            border-left: 5px solid #2196F3;
          }
          .status-unknown {
            border-left: 5px solid #9C27B0;
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
            overflow: hidden;
          }
          .test-section h3 {
            margin: 0;
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .test-section-content {
            padding: 10px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .actions {
            display: flex;
            gap: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Test Results</h1>
          <div class="actions">
            <button id="addResultBtn">Add Result</button>
            <button id="refreshBtn">Refresh</button>
          </div>
        </div>
        
        <div class="test-info">
          <div class="test-title">${test.title}</div>
          <div class="test-details">
            <div>Test ID:</div>
            <div>${test.id}</div>
            <div>Run:</div>
            <div>${parentRun ? parentRun.name : 'Unknown'}</div>
            <div>Status:</div>
            <div class="${getStatusClass(test.status_id)}">${getStatusName(test.status_id)}</div>
            ${test.case_id ? `
              <div>Case ID:</div>
              <div>${test.case_id}</div>
            ` : ''}
            <div>TestRail:</div>
            <div><a href="${host}/index.php?/tests/view/${test.id}" target="_blank">View in TestRail</a></div>
          </div>
        </div>
        
        ${(test as any).custom_preconds ? `
        <div class="test-section">
          <h3>Preconditions</h3>
          <div class="test-section-content">${(test as any).custom_preconds.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
        
        ${(test as any).custom_steps ? `
        <div class="test-section">
          <h3>Steps</h3>
          <div class="test-section-content">${(test as any).custom_steps.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
        
        ${(test as any).custom_expected ? `
        <div class="test-section">
          <h3>Expected Results</h3>
          <div class="test-section-content">${(test as any).custom_expected.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}
        
        <h2>Results History (${results.length})</h2>
        <div class="results-container">
          ${resultsHtml}
        </div>
        
        <script>
          (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('addResultBtn').addEventListener('click', () => {
              vscode.postMessage({
                command: 'addResult'
              });
            });
            
            document.getElementById('refreshBtn').addEventListener('click', () => {
              vscode.postMessage({
                command: 'refresh'
              });
            });
            
            window.openInTestRail = (resultId) => {
              window.open('${host}/index.php?/results/view/' + resultId, '_blank');
            };
          })();
        </script>
      </body>
      </html>
    `;
  }
  