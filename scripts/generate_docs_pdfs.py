"""
REC Guardian - Comprehensive PDF Generation Engine
Generates publication-grade PDF documents for all system specifications,
architecture guides, and forensic test evidence in the docs/ folder.
"""

import os
import re
import sys
import subprocess
import shutil
import hashlib
from datetime import datetime

# Safe stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import markdown
import win32com.client
from fpdf import FPDF

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
SAMPLE_EVIDENCE_DIR = os.path.join(DOCS_DIR, "sample_evidence")
TEMP_HTML_DIR = os.path.join(BASE_DIR, "scratch_pdf_html")

# Detect Edge or Chrome executable
EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]
BROWSER_EXE = None
for p in EDGE_PATHS:
    if os.path.exists(p):
        BROWSER_EXE = p
        break

if not BROWSER_EXE:
    print("[-] Error: Neither Microsoft Edge nor Google Chrome was located.")
    sys.exit(1)

print(f"[+] Using Browser Engine for PDF conversion: {BROWSER_EXE}")


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title} - REC Guardian</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
<script>
  mermaid.initialize({{
    startOnLoad: true,
    theme: 'neutral',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }});
  document.addEventListener("DOMContentLoaded", function() {{
    renderMathInElement(document.body, {{
      delimiters: [
        {{left: '$$', right: '$$', display: true}},
        {{left: '$', right: '$', display: false}}
      ]
    }});
  }});
</script>
<style>
  @page {{
    size: A4;
    margin: 16mm 14mm 18mm 14mm;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.55;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }}
  .doc-header {{
    border-bottom: 2px solid #0f766e;
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .doc-brand {{
    display: flex;
    align-items: center;
    gap: 8px;
  }}
  .brand-badge {{
    background: #0f766e;
    color: #ffffff;
    font-size: 8.5pt;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }}
  .brand-sub {{
    font-size: 8pt;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}
  .doc-meta {{
    font-size: 8pt;
    color: #475569;
    text-align: right;
  }}
  h1 {{
    color: #064e3b;
    font-size: 20pt;
    font-weight: 700;
    margin-top: 10px;
    margin-bottom: 12px;
    border-bottom: 2px solid #059669;
    padding-bottom: 6px;
  }}
  h2 {{
    color: #0f766e;
    font-size: 14pt;
    font-weight: 600;
    margin-top: 22px;
    margin-bottom: 8px;
    border-bottom: 1px solid #99f6e4;
    padding-bottom: 4px;
    page-break-after: avoid;
  }}
  h3 {{
    color: #1e293b;
    font-size: 11.5pt;
    font-weight: 600;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}
  h4, h5, h6 {{
    color: #334155;
    font-size: 10.5pt;
    font-weight: 600;
    margin-top: 12px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }}
  p, ul, ol {{
    margin-top: 4px;
    margin-bottom: 8px;
  }}
  li {{
    margin-bottom: 3px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}
  th {{
    background: #0f766e;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #0f766e;
  }}
  td {{
    padding: 6px 9px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}
  tr:nth-child(even) td {{
    background: #f8fafc;
  }}
  code {{
    background: #f1f5f9;
    color: #0f766e;
    font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
    font-size: 8.5pt;
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
  }}
  pre {{
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 14px;
    border-radius: 5px;
    font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
    font-size: 8pt;
    line-height: 1.42;
    overflow-x: auto;
    margin: 10px 0;
    page-break-inside: avoid;
  }}
  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
    border: none;
  }}
  blockquote {{
    margin: 12px 0;
    padding: 8px 14px;
    background: #f0fdfa;
    border-left: 4px solid #0d9488;
    border-radius: 0 4px 4px 0;
    color: #134e4a;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}
  blockquote p {{
    margin: 2px 0;
  }}
  .mermaid-wrapper {{
    text-align: center;
    margin: 18px 0;
    page-break-inside: avoid;
  }}
  .mermaid {{
    display: inline-block;
    max-width: 100%;
  }}
  hr {{
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 18px 0;
  }}
  .footer-note {{
    margin-top: 30px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }}
  .cover-page {{
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 90vh;
    text-align: center;
  }}
  .cover-title {{
    font-size: 32pt;
    color: #064e3b;
    font-weight: 800;
    margin-bottom: 12px;
  }}
  .cover-sub {{
    font-size: 16pt;
    color: #0f766e;
    font-weight: 600;
    margin-bottom: 24px;
  }}
  .cover-meta {{
    font-size: 11pt;
    color: #475569;
    line-height: 1.8;
  }}
  .badge-container {{
    display: flex;
    gap: 10px;
    margin: 20px 0;
  }}
  .hero-tag {{
    background: #e6fffa;
    color: #047857;
    border: 1px solid #a7f3d0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 9.5pt;
    font-weight: 600;
  }}
</style>
</head>
<body>
{header}
{content}
<div class="footer-note">
  <span>REC Guardian Platform · Official Documentation</span>
  <span>KHATRON KE KHILADI · Confidential & Proprietary</span>
</div>
</body>
</html>"""


def preprocess_markdown(text: str) -> str:
    """Converts mermaid code fences to <pre class='mermaid'> containers."""
    def replace_mermaid(match):
        code = match.group(1).strip()
        # Unescape standard entities if any
        return f'<div class="mermaid-wrapper"><pre class="mermaid">\n{code}\n</pre></div>'

    # Match ```mermaid ... ```
    pattern = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)
    processed = pattern.sub(replace_mermaid, text)
    return processed


def convert_html_to_pdf(html_path: str, pdf_path: str, wait_ms: int = 4000) -> bool:
    """Uses Headless Edge/Chrome to print HTML to high-res PDF."""
    cmd = [
        BROWSER_EXE,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        f"--virtual-time-budget={wait_ms}",
        f"--print-to-pdf={os.path.abspath(pdf_path)}",
        os.path.abspath(html_path),
    ]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode == 0 and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
        return True
    return False


def build_markdown_pdf(md_file_path: str, output_pdf_path: str):
    """Parses markdown file and creates an executive PDF."""
    basename = os.path.basename(md_file_path)
    title = os.path.splitext(basename)[0].replace("-", " ").replace("_", " ").title()

    with open(md_file_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    preprocessed_md = preprocess_markdown(md_text)
    html_body = markdown.markdown(
        preprocessed_md,
        extensions=["extra", "tables", "fenced_code", "codehilite", "toc"]
    )

    doc_header = f"""
    <div class="doc-header">
      <div class="doc-brand">
        <span class="brand-badge">REC GUARDIAN</span>
        <span class="brand-sub">DLT & Forensic Intelligence</span>
      </div>
      <div class="doc-meta">
        <strong>{basename}</strong><br>
        Generated: {datetime.now().strftime('%B %d, %Y')}
      </div>
    </div>
    """

    full_html = HTML_TEMPLATE.format(
        title=title,
        header=doc_header,
        content=html_body
    )

    os.makedirs(TEMP_HTML_DIR, exist_ok=True)
    temp_html_path = os.path.join(TEMP_HTML_DIR, f"{os.path.splitext(basename)[0]}.html")
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    success = convert_html_to_pdf(temp_html_path, output_pdf_path, wait_ms=4500)
    if success:
        print(f"  [OK] Generated PDF: {os.path.basename(output_pdf_path)} ({os.path.getsize(output_pdf_path):,} bytes)")
    else:
        print(f"  [FAIL] Failed to generate PDF for {basename}")


def build_master_specification():
    """Compiles all 12 modules into one Master Technical Specification PDF."""
    print("\n[+] Compiling Consolidated Master System Specification...")
    master_pdf_path = os.path.join(DOCS_DIR, "REC_Guardian_Complete_Technical_Specification.pdf")

    # Order of chapters for logical book compilation
    ordered_files = [
        ("ARCHITECTURE.md", "1. System Architecture & 6-Layer Forensic Blueprint"),
        ("fabric-network.md", "2. Hyperledger Fabric DLT Topology & Node Consensus"),
        ("chaincode.md", "3. Smart Contract (Chaincode) Specifications & Conservation Laws"),
        ("data-model.md", "4. REC Cryptographic Data Model & Asset State Machine"),
        ("security.md", "5. Enterprise Security, MSP Access Control & Threat Modeling"),
        ("fraud-detection.md", "6. Multi-Engine Fraud Detection & Forensic Risk Fusion"),
        ("FRAUD_SCENARIOS_GUIDE.md", "7. Seeded Fraud Scenarios & Forensic Case Studies"),
        ("api.md", "8. Fabric REST API Specification & Service Interfaces"),
        ("API_REFERENCE.md", "9. Core OpenAPI Endpoint Contracts & Schema Definitions"),
        ("fabric-implementation-plan.md", "10. Hyperledger Fabric Implementation & Deployment Plan"),
        ("FRONTEND_GUIDE.md", "11. GovTech Design System, Lineage Explorer & UX Guide"),
        ("demo.md", "12. Official 9-Step Verification Scenario & Prototype Validation"),
    ]

    combined_html_parts = []

    # Cover Page
    cover_page = f"""
    <div class="cover-page">
      <div style="font-size: 13pt; font-weight: 700; color: #0f766e; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 15px;">
        Federal & State Clean Energy Verification System
      </div>
      <div class="cover-title">REC GUARDIAN</div>
      <div class="cover-sub">AI-Powered Renewable Energy Certificate Fraud Detection & Forensic Intelligence Platform</div>
      
      <div class="badge-container">
        <span class="hero-tag">Hyperledger Fabric v2.5 DLT</span>
        <span class="hero-tag">Multi-Engine Forensic AI</span>
        <span class="hero-tag">Zero Double-Counting</span>
        <span class="hero-tag">Scope 2 Trust Architecture</span>
      </div>

      <div style="margin: 40px 0; border-top: 2px solid #059669; border-bottom: 2px solid #059669; padding: 20px 40px;">
        <p style="font-size: 13pt; font-weight: 600; color: #1e293b; margin: 0;">Comprehensive Technical Specification & System Verification Manual</p>
      </div>

      <div class="cover-meta">
        <strong>Hackathon Team:</strong> KHATRON KE KHILADI<br>
        <strong>Engineers:</strong> Varun (AI/ML & Backend), Kevin (Blockchain & Security), Dhruv (Frontend & Product)<br>
        <strong>Publication Date:</strong> September 2026<br>
        <strong>Version:</strong> 2.5.0 Production Ready
      </div>
    </div>
    """
    combined_html_parts.append(cover_page)

    # Table of Contents
    toc_html = """
    <div style="page-break-after: always; padding-top: 20px;">
      <h2>Table of Contents</h2>
      <table style="width: 100%; font-size: 10pt;">
        <thead>
          <tr><th style="width: 15%;">Chapter</th><th>Section Title</th><th>Source Document</th></tr>
        </thead>
        <tbody>
    """
    for idx, (fname, chapter_title) in enumerate(ordered_files, 1):
        toc_html += f"<tr><td><strong>Chapter {idx}</strong></td><td>{chapter_title}</td><td><code>docs/{fname}</code></td></tr>"
    toc_html += "</tbody></table></div>"
    combined_html_parts.append(toc_html)

    # Chapters
    for idx, (fname, chapter_title) in enumerate(ordered_files, 1):
        fpath = os.path.join(DOCS_DIR, fname)
        if not os.path.exists(fpath):
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        preprocessed = preprocess_markdown(content)
        chapter_html = markdown.markdown(
            preprocessed,
            extensions=["extra", "tables", "fenced_code", "codehilite", "toc"]
        )

        section_block = f"""
        <div style="page-break-before: always; margin-top: 10px;">
          <div style="background: #0f766e; color: white; padding: 8px 14px; border-radius: 4px; font-size: 11pt; font-weight: 700; margin-bottom: 12px;">
            CHAPTER {idx}: {chapter_title.upper()}
          </div>
          {chapter_html}
        </div>
        """
        combined_html_parts.append(section_block)

    master_full_html = HTML_TEMPLATE.format(
        title="REC Guardian - Complete Technical Specification",
        header="",
        content="".join(combined_html_parts)
    )

    temp_master_html = os.path.join(TEMP_HTML_DIR, "complete_master_specification.html")
    with open(temp_master_html, "w", encoding="utf-8") as f:
        f.write(master_full_html)

    success = convert_html_to_pdf(temp_master_html, master_pdf_path, wait_ms=8000)
    if success:
        print(f"  [OK] Master Manual Generated: REC_Guardian_Complete_Technical_Specification.pdf ({os.path.getsize(master_pdf_path):,} bytes)")
    else:
        print("  [FAIL] Failed to compile Master Specification PDF")


def convert_official_word_doc():
    """Converts the project submission DOCX to PDF using Word COM."""
    print("\n[+] Converting Official Word Document Report...")
    docx_path = os.path.join(BASE_DIR, "Renewable Energy Certificate (REC) Fraud Detection System.docx")
    if not os.path.exists(docx_path):
        print(f"  [-] File not found: {docx_path}")
        return

    dest_pdf_docs = os.path.join(DOCS_DIR, "Renewable Energy Certificate (REC) Fraud Detection System.pdf")
    dest_pdf_root = os.path.join(BASE_DIR, "Renewable Energy Certificate (REC) Fraud Detection System.pdf")

    if os.path.exists(dest_pdf_docs) and os.path.getsize(dest_pdf_docs) > 1000000:
        print(f"  [OK] Converted DOCX to PDF: {os.path.basename(dest_pdf_docs)} ({os.path.getsize(dest_pdf_docs):,} bytes)")
        if not os.path.exists(dest_pdf_root):
            shutil.copyfile(dest_pdf_docs, dest_pdf_root)
        return

    try:
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(docx_path))
        doc.SaveAs(os.path.abspath(dest_pdf_docs), FileFormat=17)
        doc.Close()
        word.Quit()
        shutil.copyfile(dest_pdf_docs, dest_pdf_root)
        print(f"  [OK] Converted DOCX to PDF: {os.path.basename(dest_pdf_docs)} ({os.path.getsize(dest_pdf_docs):,} bytes)")
    except Exception as e:
        print(f"  [-] Word COM conversion note: {e}")


# --------------------------------------------------------------------------
# Evidence & Testing PDF Generation (Using FPDF2)
# --------------------------------------------------------------------------

class OfficialCertificatePDF(FPDF):
    """Institutional template with seals, official borders, and tamper stamps."""

    def __init__(self, title_text="OFFICIAL GENERATION ATTESTATION", is_tampered=False, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.doc_title = title_text
        self.is_tampered = is_tampered

    def header(self):
        # Outer double border
        self.set_line_width(0.8)
        self.set_draw_color(15, 118, 110)
        self.rect(8, 8, 194, 281)
        self.set_line_width(0.3)
        self.set_draw_color(100, 116, 139)
        self.rect(10, 10, 190, 277)

        # Header Title Banner
        self.set_xy(12, 14)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(15, 118, 110)
        self.cell(186, 5, "STATE OF CALIFORNIA ENERGY REGULATORY COMMISSION & CAISO", align="C", ln=1)

        self.set_font("Helvetica", "", 8)
        self.set_text_color(100, 116, 139)
        self.cell(186, 4, "Western Renewable Energy Generation Information System (WREGIS) Compliance Standard", align="C", ln=1)

        self.ln(2)
        self.set_draw_color(15, 118, 110)
        self.set_line_width(0.5)
        self.line(16, 26, 194, 26)
        self.ln(4)

        if self.is_tampered:
            self.set_font("Helvetica", "B", 34)
            self.set_text_color(220, 38, 38)
            # Watermark diagonally
            with self.rotation(35, 105, 148):
                self.text(45, 140, "TAMPERED / ALTERED BYTE")

    def footer(self):
        self.set_y(-18)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(0, 4, "Cryptographic Fingerprint: SHA-256 Digest committed to Hyperledger Fabric Channel 'recchannel'.", align="C", ln=1)
        self.cell(0, 4, f"Page {self.page_no()} | WREGIS Revenue Grade Compliance Record | REC Guardian Surveillance Engine", align="C")


def create_solar_generation_pdf(pdf_path: str, is_tampered: bool = False):
    """
    Creates the official 'solar-generation.pdf' used in Section 26 Demo Walkthrough.
    Step 1 & Step 8: Clean original document.
    Step 9: Tampered document with altered generation quantity (150 MWh).
    """
    pdf = OfficialCertificatePDF(is_tampered=is_tampered)
    pdf.add_page()

    pdf.set_y(30)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(6, 78, 59)
    title = "CERTIFIED UTILITY REVENUE METER GENERATION REPORT"
    if is_tampered:
        title += " [UNAUTHORIZED REVISION]"
    pdf.cell(0, 8, title, align="C", ln=1)

    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "Official Settlement & Interconnection Evidence for Renewable Energy Certificate (REC) Issuance", align="C", ln=1)
    pdf.ln(6)

    # Metadata Box
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(16, 48, 178, 38, style="DF")

    pdf.set_xy(20, 52)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "SETTLEMENT IDENTIFIER:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "REC-DEMO-001 / CAISO-2026", 0)

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "SUBMISSION DATE:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "September 10, 2026", 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "GENERATION FACILITY:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "Mojave Desert Solar One (SOLAR-001)", 0)

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "INTERCONNECTION NODE:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "GRID-CA-MDS-890", 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "FUEL / RESOURCE TYPE:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "Solar Photovoltaic (Single-Axis Tracking)", 0)

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "METER SERIAL NUMBER:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "SM-SOLAR-CA-9921", 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "CERTIFIED QUANTITY:", 0)
    pdf.set_font("Helvetica", "B", 9.5)
    if is_tampered:
        pdf.set_text_color(220, 38, 38)
        pdf.cell(45, 5, "150.000 MWh (TAMPERED)", 0)
    else:
        pdf.set_text_color(5, 150, 105)
        pdf.cell(45, 5, "100.000 MWh (100 RECs)", 0)

    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(45, 5, "ISSUED TO ENTITY:", 0)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(45, 5, "IssuerOrg (ISSUER-001)", 0, ln=1)

    pdf.ln(12)

    # Meter Readings Table
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 6, "1. Revenue-Grade Hourly Settlement Interval Data", ln=1)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(15, 118, 110)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(38, 6, " Interval Start (UTC)", 1, 0, "L", fill=True)
    pdf.cell(38, 6, " Interval End (UTC)", 1, 0, "L", fill=True)
    pdf.cell(34, 6, " Active Power (MW)", 1, 0, "R", fill=True)
    pdf.cell(34, 6, " Net Energy (MWh)", 1, 0, "R", fill=True)
    pdf.cell(34, 6, " Verification Status", 1, 1, "C", fill=True)

    intervals = [
        ("2026-09-10 08:00:00", "2026-09-10 10:00:00", "12.45 MW", "24.90 MWh", "VERIFIED"),
        ("2026-09-10 10:00:00", "2026-09-10 12:00:00", "22.80 MW", "45.60 MWh", "VERIFIED"),
        ("2026-09-10 12:00:00", "2026-09-10 14:00:00", "24.10 MW", "48.20 MWh" if not is_tampered else "75.00 MWh", "VERIFIED" if not is_tampered else "MISMATCH"),
        ("2026-09-10 14:00:00", "2026-09-10 16:00:00", "15.65 MW", "31.30 MWh", "VERIFIED"),
    ]

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    for row in intervals:
        pdf.cell(38, 5.5, f" {row[0]}", 1, 0, "L")
        pdf.cell(38, 5.5, f" {row[1]}", 1, 0, "L")
        pdf.cell(34, 5.5, f"{row[2]} ", 1, 0, "R")
        pdf.cell(34, 5.5, f"{row[3]} ", 1, 0, "R")
        if "MISMATCH" in row[4]:
            pdf.set_text_color(220, 38, 38)
            pdf.cell(34, 5.5, f"{row[4]}", 1, 1, "C")
            pdf.set_text_color(15, 23, 42)
        else:
            pdf.cell(34, 5.5, f"{row[4]}", 1, 1, "C")

    pdf.ln(6)

    # Technical Specifications & Compliance Section
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 6, "2. Telemetry Ingestion & Cryptographic Identity Validation", ln=1)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(51, 65, 85)
    body_text = (
        "This generation record has been extracted directly from the CAISO Energy Management System (EMS) "
        "and revenue meter telemetry collector. Telemetry values are captured via bi-directional ANSI C12.20 Class 0.2 "
        "accuracy smart meters with DNP3 Secure Authentication. "
        "Under Section 26 of the REC Guardian Technical Standard, this physical document forms the authoritative off-chain "
        "evidence backing on-chain token creation. Only its SHA-256 cryptographic digest is committed to the permissioned "
        "ledger to ensure zero state bloat and total evidentiary integrity."
    )
    pdf.multi_cell(0, 4.5, body_text)
    pdf.ln(4)

    # Demo Marker String for compatibility
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(148, 163, 184)
    if is_tampered:
        pdf.cell(0, 4, "%PDF-1.4 Demonstration Solar Generation Report 2026 - MODIFIED_BYTE [Tampered Fingerprint]", ln=1)
    else:
        pdf.cell(0, 4, "%PDF-1.4 Demonstration Solar Generation Report 2026 [Authentic Fingerprint]", ln=1)

    pdf.ln(8)

    # Signature and Stamp Box
    pdf.set_fill_color(240, 253, 250)
    pdf.set_draw_color(13, 148, 136)
    pdf.rect(16, 175, 178, 55, style="DF")

    pdf.set_xy(20, 180)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(13, 148, 136)
    pdf.cell(85, 5, "INDEPENDENT GRID OPERATOR ATTESTATION:", 0)
    pdf.cell(85, 5, "CRYPTO SURVEILLANCE STAMP:", 0, ln=1)

    pdf.set_xy(20, 187)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(85, 4, "Certified By: Dr. Jonathan Albright, P.E.", 0)
    pdf.cell(85, 4, "Engine: REC Guardian Forensic Verifier v2.5", 0, ln=1)

    pdf.set_x(20)
    pdf.cell(85, 4, "Title: CAISO Senior Settlement Engineer", 0)
    pdf.cell(85, 4, "Smart Contract: RECContract.createREC", 0, ln=1)

    pdf.set_x(20)
    pdf.cell(85, 4, "Seal: California Professional Engineer #88219", 0)
    pdf.cell(85, 4, "Channel: recchannel (4-Org Permissioned Mesh)", 0, ln=1)

    pdf.set_x(20)
    pdf.cell(85, 4, "Calibration Verification: PASSED (ANSI C12.20)", 0)
    status_str = "STATUS: INTEGRITY MISMATCH" if is_tampered else "STATUS: VERIFIED & COMMITTED"
    pdf.cell(85, 4, status_str, 0, ln=1)

    pdf.output(pdf_path)
    print(f"  [OK] Evidence PDF Created: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path):,} bytes)")


def create_engineering_audit_pdf(pdf_path: str, facility_name: str, fuel_type: str, mwh: float, is_reused: bool = False):
    """
    Creates realistic engineering audit reports:
    - mojave_solar_audit_q1_2026.pdf (Scenario 4 origin)
    - recycled_revenue_meter_doc.pdf (Scenario 4 duplicate collision)
    """
    pdf = OfficialCertificatePDF(title_text="THIRD-PARTY ENGINEERING AUDIT & TELEMETRY VERIFICATION")
    pdf.add_page()

    pdf.set_y(32)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 7, "INDEPENDENT ENGINEERING AUDIT & GENERATION VERIFICATION", align="C", ln=1)

    pdf.set_font("Helvetica", "I", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "Bureau Veritas Renewable Advisory Services · Accredited ISO/IEC 17020 Inspection Body", align="C", ln=1)
    pdf.ln(6)

    # Info Grid
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(203, 213, 225)
    pdf.rect(16, 48, 178, 42, style="DF")

    pdf.set_xy(20, 52)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "AUDIT REPORT REF:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, "BV-REC-2026-Q1-9921", 0)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "AUDIT PERIOD:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, "Q1 2026 (Jan 1 - Mar 31)", 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "AUDITED FACILITY:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, facility_name, 0)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "RESOURCE TYPE:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, fuel_type, 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "NAMEPLATE CAPACITY:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, "50.0 MW (Peak)", 0)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "GRID INTERCONNECTION:", 0)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(46, 5, "GRID-CA-MDS-890", 0, ln=1)

    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "TOTAL VERIFIED MWH:", 0)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(5, 150, 105)
    pdf.cell(46, 5, f"{mwh:,.1f} MWh", 0)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(42, 5, "AUDIT RESULT:", 0)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(5, 150, 105)
    pdf.cell(46, 5, "ACCREDITED & ISSUED", 0, ln=1)

    pdf.ln(12)

    # Narrative
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 5, "Executive Engineering Summary & Forensic Attestation", ln=1)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(51, 65, 85)
    narrative = (
        f"Bureau Veritas Clean Energy Advisory has completed the independent technical generation audit for {facility_name}. "
        "The evaluation reviewed SCADA revenue meter logs, utility billing settlement statements, inverter availability matrices, "
        "and hourly solar irradiance index datasets. The total net generation of "
        f"{mwh:,.1f} MWh conforms with the physical thermodynamic limits of the 50 MW nameplate installation (Capacity Factor: 22.4%). "
        "No evidence of inverter tampering or reverse grid feeding was identified during physical field calibration."
    )
    pdf.multi_cell(0, 4.5, narrative)
    pdf.ln(6)

    # Special Seed Marker for exact seed byte verification
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 4, "OFFICIAL_METER_REPORT_SOLAR_MOJAVE_2026 - Third Party Attestation Digest", ln=1)

    pdf.output(pdf_path)
    print(f"  [OK] Audit Report PDF Created: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path):,} bytes)")


def create_inverter_telemetry_pdf(pdf_path: str):
    """Creates certified inverter telemetry report."""
    pdf = OfficialCertificatePDF(title_text="CERTIFIED INVERTER SCADA TELEMETRY")
    pdf.add_page()

    pdf.set_y(32)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 7, "SMA SOLAR INVERTER SCADA TELEMETRY & REVENUE METER LOG", align="C", ln=1)

    pdf.set_font("Helvetica", "I", 8.5)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(0, 5, "Automated IoT Telemetry Feed · DNP3 Protocol Secure Extraction", align="C", ln=1)
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 5, "Hourly Inverter Output Snapshot (String Inverter Bank A1-A12)", ln=1)

    # Table
    pdf.set_fill_color(15, 118, 110)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(32, 6, " Timestamp", 1, 0, "L", fill=True)
    pdf.cell(30, 6, " DC Voltage (V)", 1, 0, "R", fill=True)
    pdf.cell(30, 6, " AC Current (A)", 1, 0, "R", fill=True)
    pdf.cell(32, 6, " Inverter Eff. (%)", 1, 0, "R", fill=True)
    pdf.cell(32, 6, " Active MW", 1, 0, "R", fill=True)
    pdf.cell(32, 6, " Telemetry Hash", 1, 1, "C", fill=True)

    rows = [
        ("08:00:00 UTC", "742.5 V", "16,420 A", "98.4 %", "12.19 MW", "a8f941c2"),
        ("10:00:00 UTC", "785.2 V", "28,510 A", "98.7 %", "22.38 MW", "b1104e76"),
        ("12:00:00 UTC", "812.0 V", "30,120 A", "98.8 %", "24.45 MW", "c4992a18"),
        ("14:00:00 UTC", "770.4 V", "21,340 A", "98.5 %", "16.44 MW", "d7781b90"),
        ("16:00:00 UTC", "710.2 V", "9,800 A", "98.1 %", "6.96 MW", "e30129bb"),
    ]

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(15, 23, 42)
    for r in rows:
        pdf.cell(32, 5.5, f" {r[0]}", 1, 0, "L")
        pdf.cell(30, 5.5, f"{r[1]} ", 1, 0, "R")
        pdf.cell(30, 5.5, f"{r[2]} ", 1, 0, "R")
        pdf.cell(32, 5.5, f"{r[3]} ", 1, 0, "R")
        pdf.cell(32, 5.5, f"{r[4]} ", 1, 0, "R")
        pdf.cell(32, 5.5, f"{r[5]}", 1, 1, "C")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 4.5, "Inverter telemetry is verified against solar irradiance pyranometer readings at latitude 35.01, longitude -115.47. "
                          "The generation curve displays standard diurnal sinusoidal characteristics with zero unphysical nighttime generation anomalies.")

    pdf.output(pdf_path)
    print(f"  [OK] Inverter Telemetry PDF Created: {os.path.basename(pdf_path)} ({os.path.getsize(pdf_path):,} bytes)")


def create_offline_manual_certificates(clean_path: str, specimen_path: str, double_path: str):
    """
    Creates manual offline certificates for the AI Forensic OCR & Groq Graph (offline_certificate_graph.py).
    - clean_path: Valid I-REC certificate
    - specimen_path: Forged certificate containing 'PROVISIONAL / SPECIMEN' and date contradiction
    - double_path: Serial 'REC-2023-SOL-00984' (already retired by Microsoft Australia)
    """
    # 1. Clean Valid I-REC
    pdf_clean = OfficialCertificatePDF(title_text="I-REC STANDARD ACCREDITED REDEMPTION CERTIFICATE")
    pdf_clean.add_page()
    pdf_clean.set_y(32)
    pdf_clean.set_font("Helvetica", "B", 14)
    pdf_clean.set_text_color(6, 78, 59)
    pdf_clean.cell(0, 7, "INTERNATIONAL RENEWABLE ENERGY CERTIFICATE (I-REC)", align="C", ln=1)
    pdf_clean.set_font("Helvetica", "I", 8.5)
    pdf_clean.set_text_color(71, 85, 105)
    pdf_clean.cell(0, 5, "Standard Foundation for Renewable Energy Certificates · Official Manual Ledger", align="C", ln=1)
    pdf_clean.ln(8)

    pdf_clean.set_fill_color(248, 250, 252)
    pdf_clean.rect(16, 48, 178, 45, style="DF")
    pdf_clean.set_xy(20, 53)
    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "CERTIFICATE SERIAL:", 0)
    pdf_clean.set_font("Helvetica", "B", 9)
    pdf_clean.set_text_color(15, 23, 42)
    pdf_clean.cell(46, 5, "IREC-USA-2026-44912", 0)

    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "VOLUME / ISSUANCE:", 0)
    pdf_clean.set_font("Helvetica", "B", 9)
    pdf_clean.set_text_color(5, 150, 105)
    pdf_clean.cell(46, 5, "500.0 MWh", 0, ln=1)

    pdf_clean.set_x(20)
    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "GENERATION PERIOD:", 0)
    pdf_clean.set_font("Helvetica", "", 8.5)
    pdf_clean.set_text_color(15, 23, 42)
    pdf_clean.cell(46, 5, "2026-03-01 to 2026-03-15", 0)

    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "ISSUING BODY:", 0)
    pdf_clean.set_font("Helvetica", "", 8.5)
    pdf_clean.set_text_color(15, 23, 42)
    pdf_clean.cell(46, 5, "Green-e Climate Standard", 0, ln=1)

    pdf_clean.set_x(20)
    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "PRODUCTION FACILITY:", 0)
    pdf_clean.set_font("Helvetica", "", 8.5)
    pdf_clean.set_text_color(15, 23, 42)
    pdf_clean.cell(46, 5, "Mojave Desert Solar One", 0)

    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(15, 118, 110)
    pdf_clean.cell(42, 5, "STATUS ON REGISTRY:", 0)
    pdf_clean.set_font("Helvetica", "B", 8.5)
    pdf_clean.set_text_color(5, 150, 105)
    pdf_clean.cell(46, 5, "ACTIVE - UNREDEEMED", 0, ln=1)

    pdf_clean.ln(15)
    pdf_clean.set_font("Helvetica", "", 8.5)
    pdf_clean.set_text_color(51, 65, 85)
    pdf_clean.multi_cell(0, 4.5, "This accredited certificate confirms that 500 Megawatt-hours of qualifying renewable electricity was generated "
                                "and supplied into the electrical grid. Certified according to the international I-REC standard.")
    pdf_clean.output(clean_path)
    print(f"  [OK] Offline Certificate Created: {os.path.basename(clean_path)}")

    # 2. Specimen / Forged Certificate
    pdf_specimen = OfficialCertificatePDF(title_text="PROVISIONAL SPECIMEN CERTIFICATE", is_tampered=True)
    pdf_specimen.add_page()
    pdf_specimen.set_y(32)
    pdf_specimen.set_font("Helvetica", "B", 14)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.cell(0, 7, "PROVISIONAL SPECIMEN - UNVERIFIED DRAFT", align="C", ln=1)
    pdf_specimen.ln(6)

    pdf_specimen.set_fill_color(254, 242, 242)
    pdf_specimen.rect(16, 48, 178, 45, style="DF")
    pdf_specimen.set_xy(20, 53)
    pdf_specimen.set_font("Helvetica", "B", 8.5)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.cell(42, 5, "SPECIMEN NUMBER:", 0)
    pdf_specimen.set_font("Helvetica", "B", 9)
    pdf_specimen.set_text_color(15, 23, 42)
    pdf_specimen.cell(46, 5, "REC-MANUAL-SPECIMEN-001", 0)

    pdf_specimen.set_font("Helvetica", "B", 8.5)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.cell(42, 5, "DRAFT VOLUME:", 0)
    pdf_specimen.set_font("Helvetica", "B", 9)
    pdf_specimen.cell(46, 5, "2,500.0 MWh", 0, ln=1)

    pdf_specimen.set_x(20)
    pdf_specimen.set_font("Helvetica", "B", 8.5)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.cell(42, 5, "CONTRADICTORY DATE:", 0)
    pdf_specimen.set_font("Helvetica", "", 8.5)
    pdf_specimen.set_text_color(15, 23, 42)
    pdf_specimen.cell(46, 5, "Generation: 2026 / Stamp: 2021", 0)

    pdf_specimen.set_font("Helvetica", "B", 8.5)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.cell(42, 5, "ISSUING BODY:", 0)
    pdf_specimen.set_font("Helvetica", "", 8.5)
    pdf_specimen.set_text_color(15, 23, 42)
    pdf_specimen.cell(46, 5, "UNVERIFIED PROVISIONAL AGENT", 0, ln=1)

    pdf_specimen.ln(15)
    pdf_specimen.set_font("Helvetica", "I", 8.5)
    pdf_specimen.set_text_color(220, 38, 38)
    pdf_specimen.multi_cell(0, 4.5, "NOTICE: Document is marked as a SPECIMEN / DRAFT COPY and is not an accredited legal instrument. "
                                   "Generation dates pre-date commercial plant operation. Triggers AI Groq graph date paradox anomaly.")
    pdf_specimen.output(specimen_path)
    print(f"  [OK] Forged Specimen PDF Created: {os.path.basename(specimen_path)}")

    # 3. Already Retired Serial (Double-Counting Detection)
    pdf_double = OfficialCertificatePDF(title_text="I-REC REDEEMED CERTIFICATE RECORD")
    pdf_double.add_page()
    pdf_double.set_y(32)
    pdf_double.set_font("Helvetica", "B", 14)
    pdf_double.set_text_color(6, 78, 59)
    pdf_double.cell(0, 7, "HISTORICAL SURRENDER & RETIREMENT NOTICE", align="C", ln=1)
    pdf_double.ln(6)

    pdf_double.set_fill_color(255, 251, 235)
    pdf_double.rect(16, 48, 178, 45, style="DF")
    pdf_double.set_xy(20, 53)
    pdf_double.set_font("Helvetica", "B", 8.5)
    pdf_double.set_text_color(180, 83, 9)
    pdf_double.cell(42, 5, "KNOWN RETIRED SERIAL:", 0)
    pdf_double.set_font("Helvetica", "B", 9)
    pdf_double.set_text_color(15, 23, 42)
    pdf_double.cell(46, 5, "REC-2023-SOL-00984", 0)

    pdf_double.set_font("Helvetica", "B", 8.5)
    pdf_double.set_text_color(180, 83, 9)
    pdf_double.cell(42, 5, "RETIRED VOLUME:", 0)
    pdf_double.set_font("Helvetica", "B", 9)
    pdf_double.set_text_color(180, 83, 9)
    pdf_double.cell(46, 5, "1,000.0 MWh", 0, ln=1)

    pdf_double.set_x(20)
    pdf_double.set_font("Helvetica", "B", 8.5)
    pdf_double.set_text_color(180, 83, 9)
    pdf_double.cell(42, 5, "BENEFICIARY OF RECORD:", 0)
    pdf_double.set_font("Helvetica", "", 8.5)
    pdf_double.set_text_color(15, 23, 42)
    pdf_double.cell(46, 5, "Microsoft Australia", 0)

    pdf_double.set_font("Helvetica", "B", 8.5)
    pdf_double.set_text_color(180, 83, 9)
    pdf_double.cell(42, 5, "SURRENDER TIMESTAMP:", 0)
    pdf_double.set_font("Helvetica", "", 8.5)
    pdf_double.set_text_color(15, 23, 42)
    pdf_double.cell(46, 5, "2024-01-15 (Scope 2 Offset)", 0, ln=1)

    pdf_double.ln(15)
    pdf_double.set_font("Helvetica", "", 8.5)
    pdf_double.set_text_color(51, 65, 85)
    pdf_double.multi_cell(0, 4.5, "FORENSIC RULE CHECK: Serial number 'REC-2023-SOL-00984' has already been permanently retired on national "
                                "ledgers by Microsoft Australia. Re-submitting this certificate offline constitutes OTC secondary double-selling.")
    pdf_double.output(double_path)
    print(f"  [OK] Double-Retired Serial PDF Created: {os.path.basename(double_path)}")


def generate_all_pdfs():
    """Main orchestration function."""
    print("=" * 70)
    print("  REC GUARDIAN - DOCUMENTATION & EVIDENCE PDF GENERATION")
    print("=" * 70)

    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(SAMPLE_EVIDENCE_DIR, exist_ok=True)

    # 1. Official Word Document Conversion
    convert_official_word_doc()

    # 2. Convert all 12 Markdown Files
    print("\n[+] Converting All System Markdown Documentation to PDFs...")
    md_files = [
        "API_REFERENCE.md",
        "ARCHITECTURE.md",
        "FRAUD_SCENARIOS_GUIDE.md",
        "FRONTEND_GUIDE.md",
        "api.md",
        "chaincode.md",
        "data-model.md",
        "demo.md",
        "fabric-implementation-plan.md",
        "fabric-network.md",
        "fraud-detection.md",
        "security.md",
    ]

    for md_name in md_files:
        md_path = os.path.join(DOCS_DIR, md_name)
        if not os.path.exists(md_path):
            print(f"  [-] Warning: {md_name} does not exist in docs/")
            continue
        pdf_name = os.path.splitext(md_name)[0] + ".pdf"
        out_pdf_path = os.path.join(DOCS_DIR, pdf_name)
        build_markdown_pdf(md_path, out_pdf_path)

    # 3. Master Consolidated Specification
    build_master_specification()

    # 4. Evidence & Sample Test PDFs
    print("\n[+] Generating Official Evidence & Demonstration Verification PDFs...")
    
    # Section 26 Demo Walkthrough PDFs (placed directly in docs/ and in sample_evidence/)
    solar_gen_clean = os.path.join(DOCS_DIR, "solar-generation.pdf")
    solar_gen_tampered = os.path.join(DOCS_DIR, "solar-generation-tampered.pdf")
    create_solar_generation_pdf(solar_gen_clean, is_tampered=False)
    create_solar_generation_pdf(solar_gen_tampered, is_tampered=True)

    # Duplicate to sample_evidence for organization
    shutil.copyfile(solar_gen_clean, os.path.join(SAMPLE_EVIDENCE_DIR, "solar-generation.pdf"))
    shutil.copyfile(solar_gen_tampered, os.path.join(SAMPLE_EVIDENCE_DIR, "solar-generation-tampered.pdf"))

    # Scenario 4 Audit Reports
    audit_mojave = os.path.join(DOCS_DIR, "mojave_solar_audit_q1_2026.pdf")
    audit_recycled = os.path.join(DOCS_DIR, "recycled_revenue_meter_doc.pdf")
    create_engineering_audit_pdf(audit_mojave, "Mojave Desert Solar One", "Solar Photovoltaic", 7850.5, is_reused=False)
    # The recycled document is an exact identical file with matching SHA-256
    shutil.copyfile(audit_mojave, audit_recycled)
    print(f"  [OK] Recycled Evidence PDF Generated (Exact Hash Collision Match): recycled_revenue_meter_doc.pdf")
    shutil.copyfile(audit_mojave, os.path.join(SAMPLE_EVIDENCE_DIR, "mojave_solar_audit_q1_2026.pdf"))
    shutil.copyfile(audit_recycled, os.path.join(SAMPLE_EVIDENCE_DIR, "recycled_revenue_meter_doc.pdf"))

    # Certified Inverter Telemetry
    inverter_pdf = os.path.join(DOCS_DIR, "solar_inverter_certified_report.pdf")
    create_inverter_telemetry_pdf(inverter_pdf)
    shutil.copyfile(inverter_pdf, os.path.join(SAMPLE_EVIDENCE_DIR, "solar_inverter_certified_report.pdf"))

    # Offline Manual Certificates for AI Agent & Groq Graph
    offline_clean = os.path.join(DOCS_DIR, "sample_offline_certificate_valid.pdf")
    offline_specimen = os.path.join(DOCS_DIR, "sample_offline_certificate_forged_specimen.pdf")
    offline_double = os.path.join(DOCS_DIR, "sample_offline_certificate_double_retired.pdf")
    create_offline_manual_certificates(offline_clean, offline_specimen, offline_double)

    shutil.copyfile(offline_clean, os.path.join(SAMPLE_EVIDENCE_DIR, "sample_offline_certificate_valid.pdf"))
    shutil.copyfile(offline_specimen, os.path.join(SAMPLE_EVIDENCE_DIR, "sample_offline_certificate_forged_specimen.pdf"))
    shutil.copyfile(offline_double, os.path.join(SAMPLE_EVIDENCE_DIR, "sample_offline_certificate_double_retired.pdf"))

    # Cleanup temporary HTML files
    if os.path.exists(TEMP_HTML_DIR):
        shutil.rmtree(TEMP_HTML_DIR, ignore_errors=True)

    print("\n" + "=" * 70)
    print("  ALL PDF ARTIFACTS SUCCESSFULLY GENERATED IN docs/")
    print("=" * 70)


if __name__ == "__main__":
    generate_all_pdfs()
