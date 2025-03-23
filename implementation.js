async function execute_python({ code, packages }) {
  // Helper function to load the Pyodide script
  async function _loadScript(url) {
    if (!window.loadedScripts) {
      window.loadedScripts = {};
    }
    if (window.loadedScripts[url]) {
      return;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }).then(() => (window.loadedScripts[url] = true));
  }

  // Load Pyodide with the latest version
  await _loadScript("https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js");

  // Initialize Pyodide
  let pyodide;
  if (!window.pyodide) {
    try {
      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/",
        env: { HOME: "/home/pyodide" }
      });
      window.pyodide = pyodide; // Cache it globally for future use
    } catch (e) {
      return { error: `Failed to initialize Pyodide: ${e.message}` };
    }
  } else {
    pyodide = window.pyodide;
  }

  try {
    // Redirect standard output to a variable
    pyodide.runPython(`
      import io
      import sys
      sys.stdout = io.StringIO()
    `);

    // Package mappings for common aliases
    const packageMappings = {
      'sklearn': 'scikit-learn',
      'plt': 'matplotlib',
      'pd': 'pandas',
      'np': 'numpy',
      'stats': 'scipy'
    };

    // Track loaded packages for providing feedback to the user
    const loadedPackages = [];

    // Load packages with improved feedback
    if (packages && packages.length > 0) {
      // Show loading feedback in output
      pyodide.runPython(`print("Loading packages, please wait...")`);

      for (const packageName of packages) {
        try {
          // Use mapping if available
          const actualPackage = packageMappings[packageName] || packageName;
          await pyodide.loadPackage(actualPackage);
          loadedPackages.push(actualPackage);
          pyodide.runPython(`print(f"Loaded package: ${actualPackage}")`);
        } catch (e) {
          pyodide.runPython(`print(f"⚠️ Failed to load package: ${packageName} (${e.message})")`);
        }
      }

      // Add automatic imports for common packages
      let importCode = '';
      if (loadedPackages.includes('numpy')) importCode += 'import numpy as np\n';
      if (loadedPackages.includes('pandas')) importCode += 'import pandas as pd\n';
      if (loadedPackages.includes('matplotlib')) {
        importCode += `
import matplotlib
matplotlib.use("module://matplotlib_pyodide.wasm_backend")
import matplotlib.pyplot as plt

# Configure matplotlib for image output
import base64
from io import BytesIO

def show_plot():
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    print(f'<img src="data:image/png;base64,{img_str}" alt="Python generated plot" style="max-width:100%;height:auto;display:block;margin:15px 0;" />')
`;
      }

      if (importCode) {
        pyodide.runPython(importCode);
        pyodide.runPython(`print("Auto-imported packages: ${loadedPackages.join(', ')}")`);
      }
    }

    // Execute the Python code
    pyodide.runPython(code);

    // Get the captured output
    let output = pyodide.runPython("sys.stdout.getvalue()");

    // Apply minimal formatting for output readability without changing the expected return format
    output = output.replace(/\n/g, '\n'); // Preserve newlines

    // Reset standard output
    pyodide.runPython(`
      sys.stdout = sys.__stdout__
    `);

    return { output: output };
  } catch (error) {
    // Enhanced error handling while maintaining the expected return format
    let errorMessage = error.message || "Unknown error occurred";
    let suggestion = '';

    // Add specific suggestions for common errors
    if (errorMessage.includes('ModuleNotFoundError')) {
      suggestion = 'Try adding the missing module to the packages parameter.';
    } else if (errorMessage.includes('SyntaxError')) {
      suggestion = 'Check your Python syntax for errors.';
    } else if (errorMessage.includes('NameError')) {
      suggestion = 'Make sure all variables are defined before use.';
    } else if (errorMessage.includes('IndexError') || errorMessage.includes('KeyError')) {
      suggestion = 'Check your array/dictionary indices or keys.';
    } else if (errorMessage.includes('TypeError')) {
      suggestion = 'Verify your data types match the operation.';
    } else if (errorMessage.includes('ImportError')) {
      suggestion = 'Ensure all required packages are included and spelled correctly.';
    }

    // Add traceback information if possible
    let traceback = '';
    try {
      traceback = pyodide.runPython(
          `import traceback; traceback.format_exc()`
      );
    } catch (e) {
      // Continue if traceback isn't available
    }

    // Format a more helpful error message while maintaining the expected return structure
    const formattedError = `Error: ${errorMessage}` +
        (suggestion ? `\n\nSuggestion: ${suggestion}` : '') +
        (traceback ? `\n\nTraceback:\n${traceback}` : '');

    return { error: formattedError };
  }
}
