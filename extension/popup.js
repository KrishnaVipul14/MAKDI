document.addEventListener('DOMContentLoaded', () => {
  const autofillBtn = document.getElementById('autofill-btn');
  const statusText = document.getElementById('status-text');

  autofillBtn.addEventListener('click', () => {
    statusText.textContent = "Connecting to local MAKDI server...";
    
    // Check if backend is alive and get latest profile
    fetch('http://localhost:4000/api/profile')
      .then(r => {
        if (!r.ok) throw new Error('Local server not running');
        return r.json();
      }).then((data) => {
        statusText.textContent = "Autofilling...";
        
        const mockProfile = {
          firstName: data.name?.split(' ')[0] || '',
          lastName: data.name?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          phone: data.profile?.phone || '',
          linkedin: data.profile?.linkedin || '',
          github: data.profile?.github || '',
          location: data.profile?.location || ''
        };

        // Send to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill', data: mockProfile }, (response) => {
            if (response && response.success) {
              statusText.textContent = "Autofill complete! Please select your PDF for upload.";
            } else {
              statusText.textContent = "Autofill triggered.";
            }
          });
        });
      }).catch(e => {
        statusText.textContent = "Error: Please start MAKDI backend (http://localhost:4000)";
      });
  });
});
