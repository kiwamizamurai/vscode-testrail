import { Test, Run, Result, Status } from 'testrail-modern-client';
import { formatDate } from '../utils/format';
import { commonStyles } from './styles';

function getStatusClass(statusId: number): string {
  switch (statusId) {
    case 1:
      return 'status-passed';
    case 5:
      return 'status-failed';
    case 2:
      return 'status-blocked';
    case 3:
      return 'status-untested';
    case 4:
      return 'status-retest';
    default:
      return '';
  }
}

function getStatusName(statusId: number, statuses?: Status[]): string {
  if (statuses) {
    const status = statuses.find(s => s.id === statusId);
    if (status) {
      return status.name;
    }
  }

  switch (statusId) {
    case 1:
      return 'Passed';
    case 5:
      return 'Failed';
    case 2:
      return 'Blocked';
    case 3:
      return 'Untested';
    case 4:
      return 'Retest';
    default:
      return `Status ${statusId}`;
  }
}

export function getTestWebviewContent(
  test: Test,
  results: Result[],
  statuses: Status[],
  host: string,
  parentRun?: Run
): string {
  const resultsHtml = results.length > 0 
    ? results.map((result, _index) => `
      <div class="result-card ${getStatusClass(result.status_id)}">
        <div class="result-header">
          <span class="result-status">${getStatusName(result.status_id, statuses)}</span>
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
      <title>Test: ${test.title}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="test-info">
          <div class="test-title">${test.title}</div>
          <div class="test-details">
            <div>Test ID:</div>
            <div>${test.id}</div>
            <div>Run:</div>
            <div>${parentRun ? parentRun.name : 'Unknown'}</div>
            <div>Status:</div>
            <div class="${getStatusClass(test.status_id)}">${getStatusName(test.status_id, statuses)}</div>
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
          (() => {
            const vscode = acquireVsCodeApi();
            
            window.openInTestRail = (resultId) => {
              window.open('${host}/index.php?/results/view/' + resultId, '_blank');
            };
          })();
        </script>
      </div>
    </body>
    </html>
  `;
} 