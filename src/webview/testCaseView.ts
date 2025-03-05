import { TestCase, Attachment } from 'testrail-modern-client';
import { formatMarkdown, formatDate } from '../utils/format';
import { commonStyles } from './styles';
import { getBDDSection, getAttachmentsSection } from './helpers';

export function getTestCaseWebviewContent(
  testCase: TestCase,
  host: string,
  attachments: Attachment[] = []
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TestCase: ${testCase.title}</title>
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="header">
        <div class="section-header">
          <h1 id="title-content">${testCase.title}</h1>
          <button class="icon-button" onclick="editAllSections()">
            <span>✏️</span> Edit
          </button>
        </div>
        <div id="title-edit" style="display: none;">
          <textarea id="title-textarea" style="min-height: 40px">${testCase.title}</textarea>
        </div>
        <div id="edit-mode-indicator" class="edit-mode-indicator">
          Editing Mode - Make your changes and click Save when done
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <a href="${host}/index.php?/cases/view/${testCase.id}" target="_blank">View in TestRail</a>
          </div>
          <div class="meta-item">
            <span class="meta-label">ID:</span>
            <span>C${testCase.id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Created:</span>
            <span>${formatDate(testCase.created_on)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Updated:</span>
            <span>${formatDate(testCase.updated_on)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Type:</span>
            <span>Type ${testCase.type_id}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Priority:</span>
            <span>P${testCase.priority_id}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>References</span>
        </div>
        <div id="refs-content" class="section-content">${formatMarkdown(testCase.refs || '')}</div>
        <div id="refs-edit" style="display: none;">
          <textarea id="refs-textarea">${testCase.refs || ''}</textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Preconditions</span>
        </div>
        <div id="custom_preconds-content" class="section-content">${formatMarkdown(
          testCase.custom_preconds || ''
        )}</div>
        <div id="custom_preconds-edit" style="display: none;">
          <textarea id="custom_preconds-textarea">${testCase.custom_preconds || ''}</textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Steps</span>
        </div>
        <div id="custom_steps-content" class="section-content">${formatMarkdown(
          testCase.custom_steps || ''
        )}</div>
        <div id="custom_steps-edit" style="display: none;">
          <textarea id="custom_steps-textarea">${testCase.custom_steps || ''}</textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span>Expected Result</span>
        </div>
        <div id="custom_expected-content" class="section-content">${formatMarkdown(
          testCase.custom_expected || ''
        )}</div>
        <div id="custom_expected-edit" style="display: none;">
          <textarea id="custom_expected-textarea">${testCase.custom_expected || ''}</textarea>
        </div>
      </div>

      <div class="edit-actions" id="edit-actions" style="display: none;">
        <button class="secondary" onclick="cancelAllEdits()">Cancel</button>
        <button class="primary" onclick="saveAllEdits()">Save Changes</button>
      </div>

      ${getBDDSection(testCase)}
      ${getAttachmentsSection(attachments)}

      <script>
        const vscode = acquireVsCodeApi();
        const editableSections = ['title', 'refs', 'custom_preconds', 'custom_steps', 'custom_expected'];

        function editAllSections() {
          editableSections.forEach(section => {
            document.getElementById(\`\${section}-content\`).style.display = 'none';
            document.getElementById(\`\${section}-edit\`).style.display = 'block';
          });
          document.getElementById('edit-actions').style.display = 'flex';
          document.getElementById('edit-mode-indicator').style.display = 'block';
        }

        function cancelAllEdits() {
          editableSections.forEach(section => {
            document.getElementById(\`\${section}-content\`).style.display = 'block';
            document.getElementById(\`\${section}-edit\`).style.display = 'none';
          });
          document.getElementById('edit-actions').style.display = 'none';
          document.getElementById('edit-mode-indicator').style.display = 'none';
        }

        function saveAllEdits() {
          const saveButton = document.querySelector('.edit-actions button.primary');
          saveButton.textContent = 'Saving...';
          saveButton.disabled = true;
          
          const updates = {};
          
          editableSections.forEach(section => {
            const content = document.getElementById(\`\${section}-textarea\`).value;
            updates[section] = content;
          });
          
          vscode.postMessage({
            command: 'updateTestCase',
            data: updates
          });

          // Add a timeout before closing edit mode
          setTimeout(() => {
            cancelAllEdits();
            showSaveConfirmation();
          }, 500);
        }
        
        function showSaveConfirmation() {
          const confirmation = document.createElement('div');
          confirmation.style.position = 'fixed';
          confirmation.style.bottom = '20px';
          confirmation.style.right = '20px';
          confirmation.style.background = 'var(--vscode-editorInfo-background)';
          confirmation.style.color = 'var(--vscode-editorInfo-foreground)';
          confirmation.style.padding = '10px 16px';
          confirmation.style.borderRadius = '4px';
          confirmation.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          confirmation.style.zIndex = '1000';
          confirmation.textContent = 'Changes saved successfully';
          
          document.body.appendChild(confirmation);
          
          setTimeout(() => {
            confirmation.style.opacity = '0';
            confirmation.style.transition = 'opacity 0.5s';
            setTimeout(() => confirmation.remove(), 500);
          }, 3000);
        }

        function deleteTestCase() {
          vscode.postMessage({
            command: 'deleteTestCase'
          });
        }

        (() => {
          // Add upload button click handler
          const uploadButton = document.querySelector('.upload-button');
          uploadButton?.addEventListener('click', () => {
            vscode.postMessage({
              command: 'upload'
            });
          });

          // Add delete attachment button click handlers
          const deleteAttachmentButtons = document.querySelectorAll('.delete-attachment-button');
          deleteAttachmentButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              const target = e.target;
              if (!target || !(target instanceof HTMLElement)) return;
              
              const idStr = target.dataset.id;
              console.log('Delete button clicked, ID:', idStr);
              if (!idStr) return;
              
              vscode.postMessage({
                command: 'confirmDeleteAttachment',
                id: idStr
              });
            });
          });

          // Image preview modal
          const modal = document.getElementById('imageModal');
          const modalImg = document.getElementById('modalImage');
          const closeBtn = document.querySelector('.close');
          
          // Handle attachment data messages
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'attachmentData') {
              const images = document.querySelectorAll(\`img[src="data:image/*;base64,\${message.id}"]\`);
              images.forEach(img => {
                img.src = \`data:image/*;base64,\${message.data}\`;
              });
            } else if (message.type === 'refreshAttachments') {
              const attachmentsContainer = document.querySelector('.attachments');
              if (attachmentsContainer) {
                attachmentsContainer.innerHTML = message.attachments
                  .map(
                    (attachment) => \`
                  <div class="attachment-card">
                    <div class="attachment-preview">
                      \${
                        attachment.is_image
                          ? \`<img src="data:image/*;base64,\${attachment.id}" class="preview-image" alt="\${attachment.filename}" />\`
                          : \`<div class="file-icon">📄</div>\`
                      }
                    </div>
                    <div class="attachment-info">
                      <div class="attachment-name">\${attachment.filename}</div>
                      <div class="attachment-meta">
                        \${formatFileSize(attachment.size)} • 
                        \${new Date(attachment.created_on * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <button class="delete-attachment-button" data-id="\${attachment.data_id}">Delete</button>
                  </div>
                \`
                  )
                  .join('');

                // Re-attach event listeners
                attachEventListeners();
              }
            }
          });

          function attachEventListeners() {
            // Remove existing event listeners first
            document.querySelectorAll('.delete-attachment-button').forEach(button => {
              button.replaceWith(button.cloneNode(true));
            });
            document.querySelectorAll('.preview-image').forEach(img => {
              img.replaceWith(img.cloneNode(true));
            });

            // Attach preview image click handlers
            document.querySelectorAll('.preview-image').forEach(img => {
              img.addEventListener('click', function() {
                modal.style.display = "block";
                modalImg.src = this.src;
              });
            });

            // Attach delete button handlers
            document.querySelectorAll('.delete-attachment-button').forEach(button => {
              button.addEventListener('click', (e) => {
                const target = e.target;
                if (!target || !(target instanceof HTMLElement)) return;
                
                const idStr = target.dataset.id;
                console.log('Delete button clicked, ID:', idStr);
                if (!idStr) return;
                
                vscode.postMessage({
                  command: 'confirmDeleteAttachment',
                  id: idStr
                });
              });
            });

            // Request attachment data for all images
            document.querySelectorAll('img[src^="data:image/*;base64,"]').forEach(img => {
              const id = img.src.split(',')[1];
              vscode.postMessage({
                command: 'getAttachment',
                id
              });
            });
          }

          // Attach initial event listeners
          attachEventListeners();

          // Modal close handlers
          closeBtn.addEventListener('click', function() {
            modal.style.display = "none";
          });
          
          modal.addEventListener('click', function(e) {
            if (e.target === modal) {
              modal.style.display = "none";
            }
          });
        })();
      </script>
    </body>
    </html>
  `;
} 