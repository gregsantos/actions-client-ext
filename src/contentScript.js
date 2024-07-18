// content.js
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'action-overlay';
  overlay.innerHTML = `
    <div class="overlay-content">
      <h2 id="action-title">Action Data</h2>
      <p id="action-description"></p>
      <div id="action-metadata"></div>
      <div id="button-container">
        <button id="close-overlay">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('close-overlay').addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  return overlay;
}

function showOverlay(data) {
  const overlay = document.getElementById('action-overlay') || createOverlay();
  const title = document.getElementById('action-title');
  const description = document.getElementById('action-description');
  const metadata = document.getElementById('action-metadata');
  const buttonContainer = document.getElementById('button-container');

  title.textContent = data.title || 'Action Data';
  description.textContent = data.description || 'No description available';
  metadata.innerHTML = '';

  // Clear existing metadata label buttons
  const existingButtons = buttonContainer.querySelectorAll(
    'button:not(#close-overlay)'
  );
  existingButtons.forEach((button) => button.remove());

  Object.entries(data.metadata || {}).forEach(([key, value]) => {
    const metadataItem = document.createElement('div');
    metadataItem.className = 'metadata-item';
    metadataItem.innerHTML = `
      <h3>${key}</h3>
      <p>${value.description || 'No description available'}</p>
      <button class="metadata-value">${value.label || key}: ${
      value.value || 'N/A'
    }</button>
    `;
    metadata.appendChild(metadataItem);

    // Create label button
    const labelButton = document.createElement('button');
    labelButton.textContent = value.label || key;
    labelButton.classList.add('label-button');
    labelButton.addEventListener('click', () => {
      console.log(`Clicked label button for ${key}`);
      // Add any specific action for label button click here
    });
    buttonContainer.insertBefore(labelButton, buttonContainer.firstChild);
  });

  overlay.style.display = 'flex';
}

function handleLinks() {
  const links = document.querySelectorAll('a[href*="?action="]');

  links.forEach((link) => {
    link.addEventListener('click', function (event) {
      event.preventDefault();

      const url = new URL(this.href);
      const encodedAction = url.searchParams.get('action');

      if (encodedAction) {
        const decodedAction = decodeURIComponent(encodedAction);
        const actionUrl = decodedAction.startsWith(':')
          ? decodedAction.slice(1)
          : decodedAction;
        fetchActionData(actionUrl);
      }
    });
  });
}

function fetchActionData(actionUrl) {
  console.log('Fetching action data from:', actionUrl);
  fetch(actionUrl)
    .then((response) => response.json())
    .then((data) => {
      console.log('Action data:', data);
      showOverlay(data);
    })
    .catch((error) => {
      console.error('Error fetching action data:', error);
    });
}

// Inject CSS
const style = document.createElement('style');
style.textContent = `
  #action-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  .overlay-content {
    background-color: white;
    padding: 30px;
    border-radius: 15px;
    width: 80%;
    max-width: 800px;
    max-height: 90%;
    overflow-y: auto;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }
  #action-title {
    font-size: 24px;
    margin-bottom: 15px;
  }
  #action-description {
    font-size: 16px;
    margin-bottom: 20px;
  }
  .metadata-item {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 10px;
  }
  .metadata-item h3 {
    font-size: 18px;
    margin-bottom: 10px;
  }
  .metadata-item p {
    font-size: 14px;
    margin-bottom: 10px;
  }
  .metadata-value {
    font-size: 14px;
    padding: 8px 12px;
    border: none;
    background-color: #e9ecef;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .metadata-value:hover {
    background-color: #dee2e6;
  }
  #button-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-top: 20px;
  }
  #button-container button {
    margin-left: 10px;
    margin-bottom: 10px;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  #close-overlay {
    background-color: #dc3545;
    color: white;
  }
  #close-overlay:hover {
    background-color: #c82333;
  }
  .label-button {
    background-color: #007bff;
    color: white;
  }
  .label-button:hover {
    background-color: #0056b3;
  }
`;
document.head.appendChild(style);

// Run the handler when the page loads
handleLinks();

// Re-run the handler when the page content changes (e.g., for single-page applications)
const observer = new MutationObserver(handleLinks);
observer.observe(document.body, { childList: true, subtree: true });
