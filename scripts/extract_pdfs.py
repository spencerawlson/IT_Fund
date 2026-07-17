import argparse
import glob
import json
import os
import re
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit('Missing dependency: pypdf. Install it, then rerun this script.')

SOURCE_DIR = Path(__file__).resolve().parent.parent / 'Downloads' / 'Information_to_include_if_doesnt_exist'
OUT_DIR = Path(__file__).resolve().parent.parent / 'src' / 'data'
OUT_FILE = OUT_DIR / 'courseKnowledge.js'
INDEX_FILE = OUT_DIR / 'courseKnowledgeIndex.js'


def slugify(text: str) -> str:
    text = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return text or 'doc'


def chunk_text(text: str, max_chars: int = 900):
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    chunks = []
    current = []
    length = 0
    for paragraph in text.split('\n\n'):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        if length + len(paragraph) + 1 > max_chars and current:
            chunks.append('\n\n'.join(current))
            current = []
            length = 0
        current.append(paragraph)
        length += len(paragraph) + 2
    if current:
        chunks.append('\n\n'.join(current))
    return chunks


def extract_pdf(path: Path):
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        txt = page.extract_text() or ''
        txt = txt.replace('\r\n', '\n')
        pages.append(txt)
    full_text = '\n'.join(pages)
    return {
        'source': path.name,
        'slug': slugify(path.stem),
        'pages': len(reader.pages),
        'fullText': full_text,
        'chunks': chunk_text(full_text),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', default=str(SOURCE_DIR))
    parser.add_argument('--out-js', default=str(OUT_FILE))
    parser.add_argument('--index-js', default=str(INDEX_FILE))
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    pdf_paths = sorted(source_dir.glob('*.pdf'))
    if not pdf_paths:
        raise SystemExit(f'No PDFs found under: {source_dir}')

    docs = [extract_pdf(path) for path in pdf_paths]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    out_js = Path(args.out_js)
    payload = json.dumps(docs, ensure_ascii=True, indent=2)
    out_js.write_text(f'export const COURSE_KNOWLEDGE = {payload};\n', encoding='utf-8')

    index = []
    for doc in docs:
        index.append({
            'slug': doc['slug'],
            'source': doc['source'],
            'pages': doc['pages'],
            'chunks': len(doc['chunks']),
            'outline': [],
        })
    index_js = Path(args.index_js)
    index_js.write_text(f'export const COURSE_KNOWLEDGE_INDEX = {json.dumps(index, ensure_ascii=True, indent=2)};\n', encoding='utf-8')

    print(f'wrote {out_js}')
    print(f'wrote {index_js}')


if __name__ == '__main__':
    main()
