import { TestCase, Attachment } from 'testrail-modern-client';
import { formatMarkdown, formatFileSize } from '../utils/format';

interface ExtendedTestCase extends TestCase {
  custom_bdd_given?: string;
  custom_bdd_when?: string;
  custom_bdd_then?: string;
  custom_testrail_bdd_scenario?: string;
}

export function getBDDSection(testCase: TestCase): string {
  const extendedTestCase = testCase as ExtendedTestCase;
  
  // Check for the single BDD scenario format
  if (extendedTestCase.custom_testrail_bdd_scenario) {
    return `
  <div class="section">
    <div class="section-header">
      <span>BDD Scenario</span>
    </div>
    <pre class="bdd-content">${extendedTestCase.custom_testrail_bdd_scenario}</pre>
  </div>`;
  }
  
  // Check for the Given/When/Then format
  if (extendedTestCase.custom_bdd_given || extendedTestCase.custom_bdd_when || extendedTestCase.custom_bdd_then) {
    return `
  <div class="section">
    <div class="section-header">
      <span>BDD</span>
    </div>
    <div class="section-content">
      ${extendedTestCase.custom_bdd_given ? `<div><strong>Given:</strong> ${formatMarkdown(extendedTestCase.custom_bdd_given)}</div>` : ''}
      ${extendedTestCase.custom_bdd_when ? `<div><strong>When:</strong> ${formatMarkdown(extendedTestCase.custom_bdd_when)}</div>` : ''}
      ${extendedTestCase.custom_bdd_then ? `<div><strong>Then:</strong> ${formatMarkdown(extendedTestCase.custom_bdd_then)}</div>` : ''}
    </div>
  </div>`;
  }
  
  // If neither format is present, return empty string
  return '';
}

export function getAttachmentsSection(attachments: Attachment[]): string {
  return `
  <div class="section">
    <div class="section-header">
      <span>Attachments (${attachments.length})</span>
      <button class="upload-button">Upload</button>
    </div>
    <div class="attachments">
      ${attachments
        .map(
          (attachment) => `
        <div class="attachment-card">
          <div class="attachment-preview">
            ${
              attachment.is_image
                ? `<img src="data:image/*;base64,${attachment.id}" class="preview-image" alt="${attachment.filename}" />`
                : `<div class="file-icon">📄</div>`
            }
          </div>
          <div class="attachment-info">
            <div class="attachment-name">${attachment.filename}</div>
            <div class="attachment-meta">
              ${formatFileSize(attachment.size)} • 
              ${new Date(attachment.created_on * 1000).toLocaleDateString()}
            </div>
          </div>
          <button class="delete-attachment-button" data-id="${attachment.data_id}">Delete</button>
        </div>
      `
        )
        .join('')}
    </div>
  </div>
  <div id="imageModal" class="modal">
    <span class="close">&times;</span>
    <img class="modal-content" id="modalImage" />
  </div>`;
} 