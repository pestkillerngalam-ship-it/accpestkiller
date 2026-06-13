---
Task ID: 1
Agent: Main Agent
Task: Analisis PDF referensi invoice + redesign invoice PDF profesional + auto-process faktur pajak image

Work Log:
- Extracted and analyzed uploaded PDF invoice reference (invoice-INV_PESTKILLER_2026_0001.pdf) using VLM
- Reference design: Rentokil-style professional invoice with logo, company info, INVOICE title, customer box, items table, totals, terbilang, bank info, signature
- Verified current codebase state - all previous fixes already pushed (Neraca, invoice improvements, etc.)
- Confirmed Neraca calculation is correct (already fixed in commit 0b3e387)
- Confirmed invoice improvements already implemented (auto due date, auto description, DPP inclusive tax)
- Completely rewrote invoice-detail.tsx: removed separate "Faktur Pajak" tab, redesigned generatePrintHTML() to match reference
- Updated invoice-form.tsx: auto-process uploaded faktur pajak image (resize max 1400px + JPEG compress 85%)
- Pushed all changes to GitHub (commit a1df0a9)

Stage Summary:
- PDF invoice redesigned to match professional reference (Rentokil-style)
- Faktur pajak form integrated into invoice form (one unified form)
- Uploaded faktur images auto-processed (resize + compress) for optimal PDF embedding
- Tax invoice image in PDF: properly sized (max-height 320pt), framed, with dashed separator
- Tab layout simplified: 2 tabs (Invoice + Aksi) instead of 3
- Single-item invoices hide Qty column for cleaner look
- Successfully pushed to GitHub, Vercel will auto-deploy