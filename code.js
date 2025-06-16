// This plugin will detect text selection in Figma and enhance UX copy

// Show the plugin UI
figma.showUI(__html__, { 
  width: 360, 
  height: 600,
  title: "AutoText — AI copy writer"
});

// Variable to store the currently selected text node
let currentTextNode = null;

// Function to check if a text node is selected
async function checkTextSelection() {
  const selection = figma.currentPage.selection;
  
  console.log('=== Checking Selection ===');
  console.log('Number of items selected:', selection.length);
  
  if (selection.length > 0) {
    const node = selection[0];
    console.log('Selected node type:', node.type);
    console.log('Selected node name:', node.name);
    
    // Check if it's a text node
    if (node.type === 'TEXT') {
      currentTextNode = node;
      
      try {
        // Try to get the text content
        const text = node.characters;
        console.log('Text content:', text);
        console.log('Text length:', text.length);
        
        // Send the text to the UI
        figma.ui.postMessage({
          type: 'selectionChanged',
          text: text,
          hasSelection: true
        });
        
        console.log('Message sent to UI with text');
      } catch (error) {
        console.error('Error getting text:', error);
        // Still notify UI that text is selected even if we can't read it
        figma.ui.postMessage({
          type: 'selectionChanged',
          text: '[Text selected but cannot read]',
          hasSelection: true
        });
      }
    } else {
      console.log('Selected item is not a text node');
      currentTextNode = null;
      figma.ui.postMessage({
        type: 'selectionChanged',
        text: null,
        hasSelection: false
      });
    }
  } else {
    console.log('Nothing selected');
    currentTextNode = null;
    figma.ui.postMessage({
      type: 'selectionChanged',
      text: null,
      hasSelection: false
    });
  }
}

// Listen for selection changes in Figma
figma.on('selectionchange', () => {
  console.log('!!! Selection change event fired !!!');
  checkTextSelection();
});

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  console.log('=== Message from UI ===');
  console.log('Message type:', msg.type);
  
  if (msg.type === 'requestSelection') {
    console.log('UI is requesting current selection');
    await checkTextSelection();
  } 
  else if (msg.type === 'applyText' && msg.text) {
    console.log('Applying text:', msg.text);
    
    if (currentTextNode) {
      try {
        // Load all fonts used in the text node
        if (currentTextNode.fontName !== figma.mixed) {
          console.log('Loading font:', currentTextNode.fontName);
          await figma.loadFontAsync(currentTextNode.fontName);
        } else {
          // Text has mixed fonts, load all of them
          console.log('Text has mixed fonts, loading all...');
          const len = currentTextNode.characters.length;
          for (let i = 0; i < len; i++) {
            await figma.loadFontAsync(currentTextNode.getRangeFontName(i, i + 1));
          }
        }
        
        // Update the text
        currentTextNode.characters = msg.text;
        console.log('Text updated successfully');
        
        // Notify UI of success
        figma.ui.postMessage({
          type: 'textUpdated',
          success: true
        });
        
        // Show notification in Figma
        figma.notify('Text updated successfully! 🍋');
        
      } catch (error) {
        console.error('Error updating text:', error);
        figma.notify('Error: ' + error.message);
        
        figma.ui.postMessage({
          type: 'textUpdated',
          success: false,
          error: error.message
        });
      }
    } else {
      console.log('No text node selected');
      figma.notify('Please select a text layer first');
    }
  }
  else if (msg.type === 'saveApiKey') {
    try {
      if (msg.apiKey) {
        await figma.clientStorage.setAsync('autotext-api-key', msg.apiKey);
        console.log('[Plugin] API key saved successfully');
      } else {
        await figma.clientStorage.deleteAsync('autotext-api-key');
        console.log('[Plugin] API key removed successfully');
      }
    } catch (err) {
      console.error('[Plugin] Error saving API key:', err);
    }
  }
  else if (msg.type === 'loadApiKey') {
    try {
      const apiKey = await figma.clientStorage.getAsync('autotext-api-key');
      figma.ui.postMessage({
        type: 'apiKeyLoaded',
        apiKey: apiKey
      });
      console.log('[Plugin] API key loaded successfully');
    } catch (err) {
      console.error('[Plugin] Error loading API key:', err);
    }
  }
  else if (msg.type === 'ping') {
    // Respond to ping to check if communication is working
    console.log('Received ping from UI');
    figma.ui.postMessage({ type: 'pong' });
  }
};

// Initial setup
console.log('=== Plugin Started ===');
console.log('Checking initial selection in 100ms...');

// Check for initial selection after a short delay
setTimeout(() => {
  checkTextSelection();
}, 100);