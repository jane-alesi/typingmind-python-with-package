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

  // Browser compatibility check
  function checkBrowserCompatibility() {
    const ua = navigator.userAgent;
    if (/Chrome\/89\./.test(ua) || /Chrome\/90\./.test(ua)) {
      warning = "Warning: Chrome 89-90 has known WebAssembly bugs affecting NumPy. Consider updating your browser.";
    }

    return null;
  }

  // Add styles for better output formatting (only once)
  if (!window.pyodideStylesAdded) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pyodide-loading-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .pyodide-loading {
        margin: 8px 0;
        font-style: italic;
        color: #555;
      }
      .pyodide-loading::before {
        content: "";
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid #ccc;
        border-top-color: #07d;
        border-radius: 50%;
        margin-right: 8px;
        animation: pyodide-loading-spin 1s linear infinite;
      }
      .pyodide-output {
        font-family: monospace;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 4px;
        overflow-x: auto;
        margin: 10px 0;
        white-space: pre-wrap;
        line-height: 1.4;
      }
      .pyodide-error {
        background-color: #fff0f0;
        border-left: 4px solid #ff4040;
        padding: 10px;
        margin: 10px 0;
        font-family: monospace;
      }
      .suggestion {
        margin-top: 10px;
        color: #575;
        font-style: italic;
      }
      .package-success {
        color: #383;
      }
      .package-error {
        color: #a33;
      }
      table {
        border-collapse: collapse;
        margin: 15px 0;
        width: 100%;
      }
      th {
        background-color: #e0e0e0;
        padding: 8px;
        text-align: left;
        border: 1px solid #ddd;
      }
      td {
        padding: 8px;
        border: 1px solid #ddd;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    `;
    document.head.appendChild(style);
    window.pyodideStylesAdded = true;
  }

  // Load Pyodide with the latest version
  await _loadScript("https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js");

  // Initialize Pyodide with improved error handling
  let pyodide;
  if (!window.pyodide) {
    try {
      // Show initialization message
      if (window.pyodideInitializing) {
        return { output: '<div class="pyodide-loading">Pyodide is still initializing. Please try again in a moment...</div>' };
      }

      window.pyodideInitializing = true;

      pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/",
        env: { HOME: "/home/pyodide" },
        stdout: (text) => {
          // Capture stdout during initialization
          if (text.includes("Loading") || text.includes("Error")) {
            console.log("Pyodide setup:", text);
          }
        }
      });

      window.pyodide = pyodide; // Cache it globally for future use
      window.pyodideInitializing = false;
    } catch (e) {
      window.pyodideInitializing = false;
      return { error: `Failed to initialize Pyodide: ${e.message}` };
    }
  } else {
    pyodide = window.pyodide;
  }

  try {
    // Check browser compatibility
    const compatWarning = checkBrowserCompatibility();

    // Redirect standard output to a variable
    pyodide.runPython(`
      import io
      import sys
      sys.stdout = io.StringIO()
    `);

    if (compatWarning) {
      pyodide.runPython(`print("${compatWarning}")`);
    }

    // Package mappings for common aliases
    const packageMappings = {
      'sklearn': 'scikit-learn',
      'plt': 'matplotlib',
      'pd': 'pandas',
      'np': 'numpy',
      'stats': 'scipy',
      'sympy': 'sympy',
      'tf': 'tensorflow',
      'cv': 'opencv-python',
      'cv2': 'opencv-python'
    };

    // Track loaded packages for providing feedback to the user
    const loadedPackages = [];

    // Load packages with improved feedback
    if (packages && packages.length > 0) {
      // Show loading feedback in output
      pyodide.runPython(`print('<div class="pyodide-loading">Loading packages, please wait...</div>')`);

      // FIX 1: Create Python helper functions for package reporting
      pyodide.runPython(`
        def report_package_success(pkg_name):
            print(f'<span class="package-success">✓ Loaded package: {pkg_name}</span>')
            
        def report_package_error(pkg_name, error_msg):
            print(f'<span class="package-error">⚠️ Failed to load package: {pkg_name} ({error_msg})</span>')
      `);

      for (const packageName of packages) {
        try {
          // Use mapping if available
          const actualPackage = packageMappings[packageName] || packageName;

          // Debug log to trace package loading
          console.log("Loading package:", packageName, "mapped to:", actualPackage);

          // Load the package
          await pyodide.loadPackage(actualPackage);
          loadedPackages.push(actualPackage);

          // FIX 2: Properly pass JavaScript variables to Python context
          pyodide.globals.set("current_package", actualPackage);
          pyodide.runPython(`report_package_success(current_package)`);
        } catch (e) {
          // FIX 3: Properly handle errors with Python context variables
          pyodide.globals.set("current_package", packageName);
          pyodide.globals.set("error_message", e.message || "Unknown error");
          pyodide.runPython(`report_package_error(current_package, error_message)`);
        }
      }

      // Add automatic imports for common packages with optimized configuration
      let importCode = '';
      if (loadedPackages.includes('numpy')) importCode += 'import numpy as np\n';
      if (loadedPackages.includes('pandas')) {
        importCode += `
import pandas as pd
# Configure pandas display options for better HTML output
pd.set_option('display.max_rows', 20)
pd.set_option('display.max_columns', 10)
pd.set_option('display.precision', 3)
pd.set_option('display.width', 1000)
pd.set_option('display.html.table_schema', True)
`;
      }

      if (loadedPackages.includes('matplotlib')) {
        importCode += `
import matplotlib
# Configure matplotlib for optimal web display
matplotlib.use("module://matplotlib_pyodide.wasm_backend")
import matplotlib.pyplot as plt
plt.rcParams['figure.figsize'] = (8, 5)  # Default figure size
plt.rcParams['figure.dpi'] = 100  # Default DPI
plt.rcParams['savefig.bbox'] = 'tight'  # Tight bounding box

# Configure matplotlib for image output
import base64
from io import BytesIO

def show_plot(dpi=100, format='png', figsize=None, **kwargs):
    """Display the current matplotlib figure as an inline image.
    
    Parameters:
    -----------
    dpi : int, default 100
        Resolution of the output image
    format : str, default 'png'
        Format of the output image ('png', 'jpg', 'svg')
    figsize : tuple, optional
        Figure size (width, height) in inches
    **kwargs : dict
        Additional parameters to pass to plt.savefig
    """
    if figsize:
        plt.gcf().set_size_inches(figsize)
    
    buf = BytesIO()
    plt.savefig(buf, format=format, dpi=dpi, bbox_inches='tight', **kwargs)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()
    print(f'<img src="data:image/{format};base64,{img_str}" alt="Python generated plot" style="max-width:100%;height:auto;display:block;margin:15px 0;" />')

# Add memory monitoring utility
def memory_status():
    """Report current WebAssembly memory usage"""
    import sys
    used = sys.modules['pyodide']._module.HEAP8.buffer.byteLength / (1024*1024)
    print(f"Memory usage: {used:.2f} MB")
`;
      }

      if (importCode) {
        pyodide.runPython(importCode);

        // FIX 4: Use proper JavaScript string concatenation for package list
        const packageListStr = loadedPackages.join(', ');
        // Pass the JavaScript string directly to print
        pyodide.runPython(`print('<span style="color:#575;">Auto-imported packages: ${packageListStr}</span>')`);
      }
    }

    // Execute the Python code
    pyodide.runPython(code);

    // Get the captured output
    let output = pyodide.runPython("sys.stdout.getvalue()");

    // Apply minimal formatting for output readability while maintaining compatibility
    // Detect if the output contains HTML - ensure proper display
    const containsHTML = /<[a-z][\s\S]*>/i.test(output);

    // Format output based on content type
    if (!containsHTML) {
      output = `<pre style="white-space:pre-wrap;word-break:break-word;">${output}</pre>`;
    }

    // Reset standard output
    pyodide.runPython(`
      sys.stdout = sys.__stdout__
    `);

    return { output: output };
  } catch (error) {
    // Enhanced error handling with optimized suggestions
    let errorMessage = error.message || "Unknown error occurred";
    let suggestion = '';

    // Add specific suggestions for common errors
    if (errorMessage.includes('ModuleNotFoundError')) {
      suggestion = 'Try adding the missing module to the packages parameter. Check for correct package naming (e.g., use "scikit-learn" not "sklearn").';
    } else if (errorMessage.includes('SyntaxError')) {
      suggestion = 'Check your Python syntax for errors. Common issues include missing colons, parentheses, or indentation problems.';
    } else if (errorMessage.includes('NameError')) {
      suggestion = 'Make sure all variables are defined before use. Check for typos in variable names.';
    } else if (errorMessage.includes('IndexError') || errorMessage.includes('KeyError')) {
      suggestion = 'Check your array/dictionary indices or keys. Ensure the key or index exists before accessing it.';
    } else if (errorMessage.includes('TypeError')) {
      suggestion = 'Verify your data types match the operation. Check function arguments and operation types.';
    } else if (errorMessage.includes('ImportError')) {
      suggestion = 'Ensure all required packages are included and spelled correctly in the packages parameter.';
    } else if (errorMessage.includes('MemoryError') || errorMessage.includes('memory') || errorMessage.includes('allocation')) {
      suggestion = 'The operation exceeded available memory. Try reducing data size or using more efficient operations.';

      // Try to recover memory
      try {
        pyodide.runPython(`
          import gc
          gc.collect()
          print("Memory cleared - you may continue with smaller datasets")
        `);
      } catch (e) {
        // Silently continue if recovery fails
      }
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
