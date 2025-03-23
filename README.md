# Enhanced Python Interpreter for TypingMind

A powerful TypingMind plugin that enables AI assistants to execute Python code directly in your browser using Pyodide's WebAssembly runtime. This enhanced version features improved package management, better error handling, and seamless visualization support.

![Python Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/240px-Python-logo-notext.svg.png)

## 🌟 Features

- **Browser-Based Python Execution**: Run Python code without leaving your chat interface
- **Enhanced Package Support**:
    - Pre-configured data science essentials (NumPy, Pandas, Matplotlib, SciPy)
    - Package alias support (use 'np' for 'numpy', 'pd' for 'pandas', etc.)
    - Automatic imports for common packages
    - Real-time package loading feedback
- **Smart Error Handling**:
    - Contextual suggestions for common Python errors
    - Detailed tracebacks for debugging
    - User-friendly error formatting
- **Visualization Capabilities**:
    - Built-in matplotlib integration with `show_plot()` helper
    - Formatted pandas DataFrame display
    - Image generation and display
- **Latest Technology**:
    - Pyodide 0.27.4 (latest stable release)
    - WebAssembly optimizations for performance

## 📋 Installation

To install this plugin in your TypingMind Custom instance:

### Method 1: Direct GitHub URL

1. Navigate to your TypingMind admin panel
2. Go to Plugins → Add Plugin
3. Enter this repository URL
4. Click Install

### Method 2: Manual Installation

1. Clone this repository
2. In your TypingMind admin panel, go to Plugins → Add Plugin
3. Upload the `implementation.js` and `plugin.json` files
4. Configure and enable the plugin

## 🚀 Usage Examples

### Basic Example
```python
# Simple calculation
import math
result = math.sqrt(16) + math.pi
print(f"The result is: {result:.4f}")
```

### Data Analysis with Pandas
```python
import pandas as pd

# Create a simple DataFrame
data = {
    'Name': ['Alice', 'Bob', 'Charlie', 'David'],
    'Age': [25, 30, 35, 40],
    'Score': [85.5, 90.2, 78.8, 92.7]
}
df = pd.DataFrame(data)

# Display summary statistics
print(df.describe())
```

### Visualization with Matplotlib
```python
import matplotlib.pyplot as plt
import numpy as np

# Generate data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create plot
plt.figure(figsize=(8, 4))
plt.plot(x, y, 'b-', label='sin(x)')
plt.title('Sine Wave')
plt.xlabel('x')
plt.ylabel('sin(x)')
plt.grid(True)
plt.legend()

# Display the plot
show_plot()
```

### Using Package Aliases
You can use shorter aliases in the packages parameter:
```
Packages: ["np", "pd", "plt"]
```

Instead of:
```
Packages: ["numpy", "pandas", "matplotlib"]
```

## ⚙️ Supported Packages

This plugin supports many Python packages including:

- `numpy` - Numerical computing
- `pandas` - Data analysis and manipulation
- `matplotlib` - Data visualization
- `scipy` - Scientific computing
- `scikit-learn` - Machine learning algorithms
- And other packages available in the Pyodide distribution

## ⚠️ Limitations

- Browser-based execution has memory and performance constraints
- Some packages with binary dependencies may not work
- First execution may have a brief warmup delay
- Complex visualizations may affect performance

## 🔒 Security

All Python code executes in a sandboxed WebAssembly environment within the browser, providing isolation from both the server and the user's system.

## 🙏 Acknowledgements

This project is an enhanced version inspired by [benhaotang/typingmind-python-with-package](https://github.com/benhaotang/typingmind-python-with-package). Special thanks to Benhao Tang for the original implementation that made this improvement possible.

Also thanks to:
- [Pyodide Project](https://github.com/pyodide/pyodide) for enabling Python in WebAssembly
- [TypingMind](https://www.typingmind.com/) for their extensible AI chat platform

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Developed with ❤️ for the TypingMind and AI community.