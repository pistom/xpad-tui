// Quick test to verify editor validation works
import which from 'which';

function validateEditor(editorCmd) {
  const baseCommand = editorCmd.split(/\s+/)[0];
  try {
    which.sync(baseCommand);
    console.log(`✓ Editor '${baseCommand}' found`);
    return true;
  } catch {
    console.error(`✗ Editor '${baseCommand}' not found. Please check that it is installed and available in your PATH.`);
    return false;
  }
}

// Test with valid editors
console.log('Testing valid editors:');
validateEditor('vi');
validateEditor('nano');

// Test with invalid editor
console.log('\nTesting invalid editor:');
validateEditor('nonexistenteditor123');

// Test with editor with arguments
console.log('\nTesting editor with arguments:');
validateEditor('vi -n');
