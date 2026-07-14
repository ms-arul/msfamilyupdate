import os
import re
import subprocess
import sys
import hashlib
import json

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))
SRC_DIR = os.path.join(BASE_DIR, 'sop_src')
DIAGRAMS_DIR = os.path.join(BASE_DIR, 'diagrams')
OUTPUT_HTML = os.path.join(BASE_DIR, 'sop_combined.html')
OUTPUT_PDF = os.path.join(BASE_DIR, 'MS_Family_SOP_Manual.pdf')
STYLES_FILE = os.path.join(BASE_DIR, 'sop_styles.css')
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# Make sure directories exist
os.makedirs(SRC_DIR, exist_ok=True)
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

try:
    import markdown
except ImportError:
    print("Error: 'markdown' python library is not installed. Please run: pip install markdown")
    sys.exit(1)

def compile_mermaid_offline(mermaid_code, code_hash):
    """
    Compiles Mermaid diagram locally to SVG using local mmdc CLI and host Chrome.
    """
    temp_mmd_path = os.path.join(DIAGRAMS_DIR, f"temp_{code_hash}.mmd")
    output_svg_path = os.path.join(DIAGRAMS_DIR, f"mermaid_{code_hash}.svg")
    puppeteer_config_path = os.path.join(BASE_DIR, 'puppeteer-config-sop.json')
    
    # Write code to temp file
    with open(temp_mmd_path, 'w', encoding='utf-8') as f:
        f.write(mermaid_code)
        
    # Write Puppeteer configuration pointing to host Chrome installation
    with open(puppeteer_config_path, 'w', encoding='utf-8') as pf:
        json.dump({
            "executablePath": CHROME_PATH,
            "args": ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
        }, pf)
        
    print(f"  [mmdc] Compiling diagram offline for hash: {code_hash}...")
    
    # Run local mmdc via npx with Puppeteer config file
    cmd = ["npx", "mmdc", "-i", temp_mmd_path, "-o", output_svg_path, "-b", "transparent", "-p", puppeteer_config_path]
    try:
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True
        )
        
        # Clean up temp files
        if os.path.exists(temp_mmd_path):
            os.remove(temp_mmd_path)
        if os.path.exists(puppeteer_config_path):
            os.remove(puppeteer_config_path)
            
        if result.returncode == 0 and os.path.exists(output_svg_path):
            # Read output SVG
            with open(output_svg_path, 'r', encoding='utf-8') as f:
                svg_data = f.read()
            return svg_data
        else:
            # If compile failed, raise error
            err_msg = result.stderr if result.stderr else "Unknown error compiling diagram"
            raise RuntimeError(f"Mermaid CLI exited with code {result.returncode}. Error: {err_msg}")
            
    except Exception as e:
        if os.path.exists(temp_mmd_path):
            os.remove(temp_mmd_path)
        if os.path.exists(puppeteer_config_path):
            os.remove(puppeteer_config_path)
        raise e

def get_mermaid_svg(mermaid_code):
    """
    Renders Mermaid code locally and caches output.
    """
    code_hash = hashlib.md5(mermaid_code.encode('utf-8')).hexdigest()
    cache_path = os.path.join(DIAGRAMS_DIR, f"mermaid_{code_hash}.svg")
    
    # If cached version exists, return it
    if os.path.exists(cache_path):
        print(f"  [Cache Hit] Using cached SVG: mermaid_{code_hash}.svg")
        with open(cache_path, 'r', encoding='utf-8') as f:
            return f.read()
            
    # Compile locally offline
    try:
        svg_data = compile_mermaid_offline(mermaid_code, code_hash)
        
        # Optimize SVG (remove XML declaration & DOCTYPE to clean up inlining)
        svg_data = re.sub(r'<\?xml.*?\?>', '', svg_data)
        svg_data = re.sub(r'<!DOCTYPE.*?>', '', svg_data)
        
        # Write back to cache optimized version
        with open(cache_path, 'w', encoding='utf-8') as f:
            f.write(svg_data)
            
        return svg_data
    except Exception as e:
        print(f"  [Warning] Local Mermaid compile failed: {e}")
        # Return fallback error representation in HTML
        fallback = f"""
        <div class="diagram-fallback" style="padding:20px; border:2px dashed #ef4444; background:#fef2f2; color:#b91c1c; border-radius:12px; margin:15px 0; text-align:left;">
            <strong style="color:#ef4444;">[Offline Rendering Error] Diagram Ingestion Failed</strong><br>
            Mermaid compiler reported syntax or processing failure. Code block reference:<br>
            <pre style="background:#0b0f19; color:#f8fafc; padding:12px; margin-top:8px; font-size:8pt; border-radius:8px; border:1px solid #1e293b; overflow-x:auto;">{mermaid_code}</pre>
        </div>
        """
        return fallback

def process_mermaid_blocks(content):
    """
    Finds ```mermaid blocks and parses them.
    """
    pattern = re.compile(r'```mermaid\s*\n(.*?)\n```', re.DOTALL)
    
    def replacer(match):
        code = match.group(1)
        
        # Extract diagram ID if present, else make hashed one
        id_match = re.search(r'%%\s*id:\s*([a-zA-Z0-9_-]+)', code)
        diag_id = id_match.group(1) if id_match else f"diag-{hashlib.md5(code.encode('utf-8')).hexdigest()[:8]}"
        
        svg_content = get_mermaid_svg(code)
        
        # Extract caption
        caption_match = re.search(r'%%\s*caption:\s*(.*?)\n', code)
        caption_text = caption_match.group(1) if caption_match else ""
        
        caption_html = ""
        if caption_text:
            caption_html = f'<div class="diagram-caption" id="caption-{diag_id}">%%CAPTION_PLACEHOLDER_{diag_id}%%: {caption_text}</div>'
            
        return f'<div class="diagram-container" id="{diag_id}">\n{svg_content}\n{caption_html}\n</div>'
        
    return pattern.sub(replacer, content)

def compile_sop():
    print("=" * 60)
    print("MS Family Standard Operating Procedures (SOP) Compiler")
    print("=" * 60)
    
    # 1. Read Stylesheet
    if not os.path.exists(STYLES_FILE):
        print(f"Error: Stylesheet not found at {STYLES_FILE}")
        sys.exit(1)
        
    with open(STYLES_FILE, 'r', encoding='utf-8') as f:
        styles_content = f.read()
        
    # 2. Get list of files in sop_src/
    src_files = sorted([f for f in os.listdir(SRC_DIR) if f.endswith(('.html', '.md'))])
    
    if not src_files:
        print(f"Error: No source files found in {SRC_DIR}")
        sys.exit(1)
        
    print(f"Found {len(src_files)} source documents in sop_src/ directory.")
    
    # 3. Assemble HTML body
    combined_body = []
    
    for filename in src_files:
        filepath = os.path.join(SRC_DIR, filename)
        print(f"Processing: {filename}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            file_content = f.read()
            
        if filename.endswith('.html'):
            # Directly append HTML cover/template parts
            combined_body.append(file_content)
        elif filename.endswith('.md'):
            # Convert Mermaid blocks to inlined SVGs
            file_content = process_mermaid_blocks(file_content)
            
            # Convert Markdown to HTML
            # Enable extra (tables, footnotes, etc.) and codehilite (syntax highlighting with line numbers)
            html_chunk = markdown.markdown(file_content, extensions=['extra', 'codehilite'])
            
            # Add page wrapper
            section_class = "watermarked-content"
            if "cover" in filename:
                section_class = "cover-container"
            
            # Wrap in section block with page break trigger
            combined_body.append(f"""
            <div class="{section_class} page-break" id="{os.path.splitext(filename)[0]}">
                {html_chunk}
            </div>
            """)
            
    # Assemble HTML document structure
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MS Family — Standard Operating Procedures (SOP) Manual</title>
    <style>
        {styles_content}
    </style>
</head>
<body>
    <!-- Fixed Subtle Watermark on all pages -->
    <div class="watermark-container">
        <div class="watermark-text">MS Family Operations Manual</div>
    </div>
    
    {chr(10).join(combined_body)}
</body>
</html>
"""

    # 4. Run Auto-Numbering & Cross-Referencing Engine
    print("Executing Auto-Numbering Engine...")
    
    diagram_count = 0
    table_count = 0
    ref_map = {} # Maps ids like "#diag-arch" to labels like "Diagram 2"
    
    # Find all diagram containers and tables to catalog them
    # Table markers: <!-- table: Table Title -->
    table_caption_pattern = re.compile(r'<!--\s*table:\s*(.*?)\s*-->\s*<table>', re.DOTALL)
    
    # We will do a multi-pass approach. First, assign numbers and log refs.
    # Pass 1: Catalog Diagrams
    diagram_pattern = re.compile(r'<div class="diagram-container" id="([a-zA-Z0-9_-]+)">', re.DOTALL)
    for match in diagram_pattern.finditer(full_html):
        diag_id = match.group(1)
        diagram_count += 1
        ref_map[f"#{diag_id}"] = f"Diagram {diagram_count}"
        
    # Pass 1b: Catalog Tables
    matches = list(table_caption_pattern.finditer(full_html))
    for match in matches:
        table_title = match.group(1)
        table_count += 1
        sanitized_title = re.sub(r'[^a-zA-Z0-9_-]', '', table_title.lower().replace(' ', '-'))
        table_id = f"table-{sanitized_title}"
        ref_map[f"#{table_id}"] = f"Table {table_count}"

    print(f"  Cataloged {diagram_count} Diagrams and {table_count} numbered Tables.")

    # Pass 2: Replace placeholders & Inject Captions
    # Replace diagram caption placeholders
    for diag_id, label in ref_map.items():
        if label.startswith("Diagram"):
            placeholder = f"%%CAPTION_PLACEHOLDER_{diag_id[1:]}%%"
            full_html = full_html.replace(placeholder, label)
            
    # Inject table caption divs above the actual tables
    table_index = 0
    def table_replacer(match):
        nonlocal table_index
        table_index += 1
        title = match.group(1)
        sanitized_title = re.sub(r'[^a-zA-Z0-9_-]', '', title.lower().replace(' ', '-'))
        table_id = f"table-{sanitized_title}"
        
        return f"""
        <div class="table-caption-container" id="{table_id}">
            Table {table_index}: {title}
        </div>
        <table>
        """
        
    full_html = table_caption_pattern.sub(table_replacer, full_html)
    
    # Pass 3: Resolve Cross-References in HTML links
    for ref_id, final_label in ref_map.items():
        link_pattern = re.compile(rf'<a href="{ref_id}">.*?</a>', re.DOTALL)
        full_html = link_pattern.sub(f'<a href="{ref_id}">{final_label}</a>', full_html)

    # Save combined HTML
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(full_html)
        
    print(f"Combined HTML generated successfully at {OUTPUT_HTML}")
    
    # 5. Run Headless Chrome to compile PDF
    if not os.path.exists(CHROME_PATH):
        print(f"Error: Chrome executable not found at {CHROME_PATH}")
        print("Please edit the CHROME_PATH variable in compiler.py to match your installation.")
        sys.exit(1)
        
    print(f"Executing Google Chrome to generate PDF...")
    
    # Custom headers/footers templates (Premium SOP styling)
    header_html = """
    <div style="font-size: 7.5pt; font-family: 'Inter', sans-serif; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
        <span style="font-weight: 700; color: #0b1530;">MS FAMILY SYSTEM OPERATIONS</span>
        <span style="text-transform: uppercase; letter-spacing: 0.5px;">Standard Operating Procedures (SOP) Manual</span>
    </div>
    """
    
    footer_html = """
    <div style="font-size: 7.5pt; font-family: 'Inter', sans-serif; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 24px; border-top: 1px solid #e2e8f0; margin-top: 10px;">
        <span style="font-weight: 700; color: #ef4444;">RESTRICTED &amp; CONFIDENTIAL</span>
        <span>Version v1.0.0-Enterprise | Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>
    """
    
    chrome_cmd = [
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--print-to-pdf-no-header",  # Suppresses default URL/date header
        f"--print-to-pdf={OUTPUT_PDF}",
        "--display-header-footer",
        f"--header-template={header_html}",
        f"--footer-template={footer_html}",
        OUTPUT_HTML
    ]
    
    try:
        result = subprocess.run(chrome_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"PDF generated successfully at {OUTPUT_PDF}")
        print(f"Total size: {os.path.getsize(OUTPUT_PDF) / (1024 * 1024):.2f} MB")
    except subprocess.CalledProcessError as e:
        print(f"Error running Chrome: {e}")
        print(f"Stdout: {e.stdout.decode('utf-8')}")
        print(f"Stderr: {e.stderr.decode('utf-8')}")
        sys.exit(1)
        
    print("\nSOP Manual Compilation Complete!")
    print("=" * 60)

if __name__ == "__main__":
    compile_sop()
