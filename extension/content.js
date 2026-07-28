chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    const data = request.data;
    
    const inputs = document.querySelectorAll('input, select, textarea');
    let filledCount = 0;

    inputs.forEach(input => {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      
      const match = [name, id, placeholder].join(' ');

      if (match.includes('first') && match.includes('name')) {
        simulateTyping(input, data.firstName);
        filledCount++;
      } else if (match.includes('last') && match.includes('name')) {
        simulateTyping(input, data.lastName);
        filledCount++;
      } else if (match.includes('email')) {
        simulateTyping(input, data.email);
        filledCount++;
      } else if (match.includes('phone') || match.includes('mobile')) {
        simulateTyping(input, data.phone);
        filledCount++;
      } else if (match.includes('linkedin')) {
        simulateTyping(input, data.linkedin);
        filledCount++;
      } else if (match.includes('github')) {
        simulateTyping(input, data.github);
        filledCount++;
      }
      // Cannot programmatically set <input type="file"> for resume
    });

    sendResponse({ success: true, count: filledCount });
  }
  return true;
});

function simulateTyping(element, value) {
  if (!element || !value) return;
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
