document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');
  const tokenInput = document.getElementById('token-input');
  const saveBtn = document.getElementById('save-token');
  const autofillBtn = document.getElementById('autofill-btn');
  const statusText = document.getElementById('status-text');

  // Check if token exists
  chrome.storage.local.get(['makdiToken'], (res) => {
    if (res.makdiToken) {
      authSection.style.display = 'none';
      mainSection.style.display = 'block';
    }
  });

  saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (token) {
      chrome.storage.local.set({ makdiToken: token }, () => {
        authSection.style.display = 'none';
        mainSection.style.display = 'block';
      });
    }
  });

  autofillBtn.addEventListener('click', () => {
    statusText.textContent = "Fetching profile...";
    chrome.storage.local.get(['makdiToken'], (res) => {
      const token = res.makdiToken;
      
      // Fetch profile from backend
      // Normally you'd want a specific endpoint that returns flattened profile data
      // For this demo we'll assume we get user data and send to content script
      fetch('http://localhost:4000/api/jobs', { // just a dummy check
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => {
        if (!r.ok) throw new Error('Auth failed');
        return r.json();
      }).then(() => {
        statusText.textContent = "Autofilling...";
        
        // Mock profile data for extension (in real app, fetch from /api/profile/me)
        const mockProfile = {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "1234567890",
          linkedin: "https://linkedin.com/in/johndoe",
          github: "https://github.com/johndoe",
          experience: "5"
        };

        // Send to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill', data: mockProfile }, (response) => {
            if (response && response.success) {
              statusText.textContent = "Autofill complete! Please select your PDF for upload.";
            } else {
              statusText.textContent = "Could not autofill this page.";
            }
          });
        });
      }).catch(e => {
        statusText.textContent = "Error: " + e.message;
      });
    });
  });
});
