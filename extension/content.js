let makdiToken = null;
let profileData = null;
let currentTailoredPdfUrl = null;

// Initialize
chrome.storage.local.get(['makdiToken'], (result) => {
  if (result.makdiToken) {
    makdiToken = result.makdiToken;
    fetchProfileData();
  }
});

// Watch for token updates from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.makdiToken) {
    makdiToken = changes.makdiToken.newValue;
    fetchProfileData();
  }
});

async function fetchProfileData() {
  try {
    const apiBase = 'http://localhost:4000'; // Assuming local backend, or replace dynamically
    const res = await fetch(`${apiBase}/api/profile`, {
      headers: { 'Authorization': `Bearer ${makdiToken}` }
    });
    const data = await res.json();
    if (data.profile) {
      profileData = data.profile;
      profileData.email = data.email;
      profileData.name = data.name;
      injectMakdiWidget();
    }
  } catch (err) {
    console.error('MAKDI Extension: Failed to fetch profile', err);
  }
}

function injectMakdiWidget() {
  if (document.getElementById('makdi-extension-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'makdi-extension-widget';
  widget.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    border: 1px solid #e5e7eb;
    overflow: hidden;
    transition: all 0.3s ease;
  `;

  // Determine current job from page title for fetching tailored resume
  const pageTitle = document.title;
  
  widget.innerHTML = `
    <div style="background: #f8fafc; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="background: #1B7A3D; color: white; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🕸️</div>
        <span style="font-weight: 700; color: #111827; font-size: 15px;">MAKDI AI</span>
      </div>
      <button id="makdi-close-btn" style="background: none; border: none; cursor: pointer; color: #6b7280; font-size: 18px; padding: 0;">&times;</button>
    </div>
    <div style="padding: 16px;">
      <div style="background: #DFF5E1; color: #0F5C2C; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 16px; font-weight: 600; font-size: 13px;">
        ✨ Unlimited Free AI Active
      </div>
      
      <button id="makdi-autofill-btn" style="background: #10B981; color: white; border: none; width: 100%; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 16px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); transition: background 0.2s;">
        Autofill Application
      </button>

      <div style="margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px;">
          📄 Tailored Resume
        </div>
        <div style="padding: 12px; font-size: 13px; color: #6b7280; text-align: center;" id="makdi-resume-status">
          Fetching best match...
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  document.getElementById('makdi-close-btn').addEventListener('click', () => {
    widget.style.display = 'none';
  });

  const autofillBtn = document.getElementById('makdi-autofill-btn');
  autofillBtn.addEventListener('click', () => performAutofill(autofillBtn));

  fetchTailoredResume(pageTitle);
  attachSubmitListener();
}

async function fetchTailoredResume(jobTitle) {
  try {
    const apiBase = 'http://localhost:4000';
    // Fetch profile and their tailored resumes
    const res = await fetch(`${apiBase}/api/profile`, {
      headers: { 'Authorization': `Bearer ${makdiToken}` }
    });
    const data = await res.json();
    
    // Attempt to fetch tailored resume specifically for this job
    const tailorRes = await fetch(`${apiBase}/api/applications/tailored?title=${encodeURIComponent(jobTitle)}`, {
      headers: { 'Authorization': `Bearer ${makdiToken}` }
    });
    const tailorData = await tailorRes.json();
    
    if (tailorData.pdfUrl) {
      currentTailoredPdfUrl = tailorData.pdfUrl;
    }
    
    const resumeStatus = document.getElementById('makdi-resume-status');
    if (resumeStatus) {
      if (currentTailoredPdfUrl) {
        resumeStatus.innerHTML = `<span style="color: #10B981; font-weight: 600;">Ready to apply</span><br/><span style="font-size: 11px;">Will auto-attach to file inputs</span>`;
      } else {
        resumeStatus.innerHTML = `<span style="color: #F59E0B; font-weight: 600;">Default Resume Selected</span><br/><span style="font-size: 11px;">No tailored resume found for this role</span>`;
      }
    }
  } catch(e) {
    console.error(e);
  }
}

async function performAutofill(btnElement) {
  if (!profileData) return;
  
  btnElement.innerHTML = 'Filling...';
  btnElement.style.opacity = '0.8';

  const inputs = document.querySelectorAll('input, select, textarea');
  let filledCount = 0;

  inputs.forEach(input => {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const type = input.type || '';
    const match = [name, id, placeholder].join(' ');

    if (type === 'file' && input.accept?.includes('pdf')) {
      if (currentTailoredPdfUrl) {
        fetchResumeBlobAndAttach(input, currentTailoredPdfUrl);
        filledCount++;
      }
    } else if (match.includes('first') && match.includes('name')) {
      simulateTyping(input, profileData.name.split(' ')[0] || '');
      filledCount++;
    } else if (match.includes('last') && match.includes('name')) {
      simulateTyping(input, profileData.name.split(' ').slice(1).join(' ') || '');
      filledCount++;
    } else if (match.includes('name')) {
      simulateTyping(input, profileData.name);
      filledCount++;
    } else if (match.includes('email')) {
      simulateTyping(input, profileData.email);
      filledCount++;
    } else if (match.includes('phone') || match.includes('mobile')) {
      simulateTyping(input, profileData.phone);
      filledCount++;
    } else if (match.includes('location') || match.includes('city') || match.includes('address')) {
      simulateTyping(input, profileData.location);
      filledCount++;
    } else if (match.includes('linkedin')) {
      simulateTyping(input, "https://linkedin.com/in/" + profileData.name.replace(/\\s+/g, ''));
      filledCount++;
    } else if (match.includes('github')) {
      simulateTyping(input, "https://github.com/" + profileData.name.replace(/\\s+/g, ''));
      filledCount++;
    } else if (match.includes('salary') || match.includes('expect')) {
      simulateTyping(input, profileData.salary_min?.toString() || '');
      filledCount++;
    }
  });

  setTimeout(() => {
    btnElement.innerHTML = '✨ Autofill Complete';
    btnElement.style.background = '#059669';
  }, 500);
}

function simulateTyping(element, value) {
  if (!element || !value) return;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function fetchResumeBlobAndAttach(inputElement, pdfUrl) {
  try {
    const res = await fetch(`http://localhost:4000${pdfUrl}`);
    const blob = await res.blob();
    const filename = pdfUrl.split('/').pop() || 'Resume.pdf';
    
    const file = new File([blob], filename, { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    inputElement.files = dataTransfer.files;
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (err) {
    console.error('Failed to fetch/attach resume', err);
  }
}

function attachSubmitListener() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, input[type="submit"]');
    if (!btn) return;
    
    const text = (btn.innerText || btn.value || '').toLowerCase();
    if (text.includes('submit') || text.includes('apply')) {
      // Mark as applied in backend (fire and forget)
      if (makdiToken) {
        fetch('http://localhost:4000/api/applications/track-external', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${makdiToken}`
          },
          body: JSON.stringify({ url: window.location.href, title: document.title })
        }).catch(err => console.log('Track err:', err));
      }
    }
  });
}
