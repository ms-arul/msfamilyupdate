# MS Family — Technical Design, System Architecture & Engineering Documentation

This directory contains the source files and compiler script for the **MS Family** system documentation. It is designed to compile into a professional, print-ready A4 PDF format using Markdown-to-HTML translation and Google Chrome's headless print engine.

## Directory Structure

```text
documentation/
│
├── src/                        # Markdown and HTML source chapters (01 to 40)
│   ├── 01_cover.html           # HTML cover page template
│   ├── 02_table_of_contents.md # Table of contents index
│   ├── 03_executive_summary.md # Executive vision and mission
│   ├── ...
│   └── 40_appendix.md          # Technical appendix and glossary
│
├── diagrams/                   # Rendered SVG vector diagrams (saved by the compiler)
│
├── styles.css                  # Custom styling system for PDF printing
│
├── compiler.py                 # Automated Markdown-to-HTML parser and PDF compiler
│
└── README.md                   # Setup and execution guide
```

## Setup Instructions

### 1. Requirements
Ensure you have the following installed on your system:
* **Python 3.x**
* **Google Chrome** (installed at the default path `C:\Program Files\Google\Chrome\Application\chrome.exe` on Windows)

### 2. Python Dependencies
Install the required Markdown conversion library:
```bash
pip install markdown
```

## Compilation Instructions

Run the compiler script from the project root directory:
```bash
python documentation/compiler.py
```

### How It Works:
1. **Source Assembly:** The script reads all files in `documentation/src/` in alphabetical order (from `01_cover.html` to `40_appendix.md`).
2. **Mermaid Rendering:** If a Markdown file contains a Mermaid diagram, the compiler converts the diagram code into a URL-safe Base64 string, fetches the rendered vector SVG from `mermaid.ink`, caches the SVG in the `diagrams/` folder, and inlines the SVG inside the document.
3. **Markdown Translation:** Convert all Markdown source text into standard HTML using the Python `markdown` library with `extra` and `codehilite` extensions.
4. **Style Integration:** Inject custom styling from `documentation/styles.css` (defining typographic scales, spacing, table borders, and print page parameters) into the combined HTML document.
5. **Headless Chrome Render:** Execute Google Chrome in headless print mode to export a PDF with custom running headers, footers, page numbering, and margin overrides:
   * **Output PDF:** `documentation/MS_Family_Architecture_Documentation.pdf`
   * **Output Combined HTML:** `documentation/combined.html`
