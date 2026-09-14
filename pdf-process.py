import json
import re
from pathlib import Path

def get_pdf_page_count(filepath: Path) -> int:
    """Extract page count from PDF binary without external heavy dependencies."""
    with open(filepath, "rb") as f:
        content = f.read()
    # Search for /Count <num> entries in page tree
    counts = [int(m.group(1)) for m in re.finditer(rb"/Count\s+(\d+)", content)]
    if counts:
        return max(counts)
    # Fallback to counting /Type /Page objects
    pages = list(re.finditer(rb"/Type\s*/Page\b", content))
    return max(1, len(pages))

def main():
    """
    Scans 'pdf-source' for PDF files and cover images, generating
    a lightweight 'books.json' for client-side rendering via PDF.js.
    """
    project_root = Path(__file__).resolve().parent
    source_dir = project_root / 'pdf'
    books_json_path = project_root / 'pdf-data.json'

    if not source_dir.exists():
        print(f"Source directory '{source_dir}' not found.")
        return

    pdf_files = sorted(list(source_dir.glob('*.pdf')))
    if not pdf_files:
        print("No PDF files found.")
        return

    books_data = []

    for pdf_path in pdf_files:
        book_name = pdf_path.stem
        cover_source_path = source_dir / f"{book_name}-cover.png"
        cover_url = f"pdf/{book_name}-cover.png" if cover_source_path.exists() else ""

        try:
            page_count = get_pdf_page_count(pdf_path)
        except Exception as e:
            print(f"Failed to read page count for {pdf_path.name}: {e}")
            page_count = 1

        book_info = {
            "id": book_name,
            "title": book_name.replace('-', ' ').strip(),
            "cover": cover_url,
            "pdfUrl": f"pdf/{pdf_path.name}",
            "pages": page_count
        }
        books_data.append(book_info)
        print(f"Processed: {book_name} ({page_count} pages)")

    with open(books_json_path, 'w', encoding='utf-8') as f:
        json.dump(books_data, f, indent=4, ensure_ascii=False)

    print(f"Generated {books_json_path.name} with {len(books_data)} books.")

if __name__ == '__main__':
    main()

