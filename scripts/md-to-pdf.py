# -*- coding: utf-8 -*-
"""
Markdown → PDF 排版脚本（比赛交付文档用）
用法：python scripts/md-to-pdf.py docs/01-软件设计文档.md docs/01-软件设计文档.pdf
支持：标题层级、无序/有序列表、表格、代码块、引用、分隔线、页脚页码。
"""
import re
import sys
from fpdf import FPDF

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msyhl.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
    r"/System/Library/Fonts/PingFang.ttc",
    r"/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]

CINNABAR = (176, 58, 46)
INK = (43, 37, 32)
SOFT = (107, 95, 82)
LINE = (222, 212, 198)
CODE_BG = (245, 242, 237)


def pick_font():
    import os
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit("未找到可用的中文字体，请手动修改 FONT_CANDIDATES")


class DocPDF(FPDF):
    def __init__(self, font_path, doc_title):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.font_path = font_path
        self.doc_title = doc_title
        self.add_font("CN", "", font_path)
        self.add_font("CN", "B", font_path)
        self.add_font("CN", "I", font_path)
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(20, 18, 20)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-13)
        self.set_draw_color(*LINE)
        self.line(20, self.get_y(), 190, self.get_y())
        self.set_font("CN", "", 8)
        self.set_text_color(*SOFT)
        self.cell(0, 6, self.doc_title, align="L")
        self.cell(0, 6, "第 %d 页" % self.page_no(), align="R")


def sanitize(text):
    """中文字体缺少的符号做等价替换，保证 PDF 无缺字方框。"""
    mapping = {
        "↔": "与",
        "✅": "[已完成]",
        "⚠️": "[待补充]",
        "⚠": "[待补充]",
        "🧳": "", "🏛": "", "🍜": "", "📚": "", "✨": "", "💬": "",
        "🎙": "", "🍽": "", "📍": "", "🤖": "", "🎬": "", "💡": "", "🎯": "",
    }
    for k, v in mapping.items():
        text = text.replace(k, v)
    # 兜底：清除非 BMP 字符（表情符号），避免字体缺字警告
    return "".join(ch for ch in text if ord(ch) <= 0xFFFF or ch in "，。、；：！？")


def strip_inline(text):
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"`(.+?)`", r"\1", text)
    text = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"\1", text)
    return sanitize(text).strip()


def is_table_sep(line):
    return bool(re.match(r"^\s*\|[\s:\-|]+\|\s*$", line))


def parse_table_rows(lines, i):
    rows = []
    while i < len(lines) and lines[i].strip().startswith("|"):
        if not is_table_sep(lines[i]):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows.append([strip_inline(c) for c in cells])
        i += 1
    return rows, i


def render(pdf, md_text):
    lines = md_text.splitlines()
    i = 0
    first_h1 = True

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        # 代码块
        if stripped.startswith("```"):
            i += 1
            block = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1
            pdf.set_font("CN", "", 8.3)
            pdf.set_fill_color(*CODE_BG)
            pdf.set_text_color(60, 55, 50)
            x = pdf.get_x()
            for bl in block:
                pdf.set_x(x)
                pdf.multi_cell(0, 4.4, sanitize(bl) if bl.strip() else " ", fill=True)
            pdf.ln(2)
            continue

        # 分隔线
        if re.match(r"^-{3,}$", stripped):
            pdf.ln(1)
            pdf.set_draw_color(*LINE)
            y = pdf.get_y()
            pdf.line(20, y, 190, y)
            pdf.ln(3)
            i += 1
            continue

        # 标题
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = strip_inline(m.group(2))
            if level == 1 and first_h1:
                first_h1 = False
                pdf.ln(6)
                pdf.set_font("CN", "B", 20)
                pdf.set_text_color(*CINNABAR)
                pdf.multi_cell(0, 10, text, align="C")
                pdf.ln(2)
            elif level == 2:
                pdf.ln(4)
                pdf.set_font("CN", "B", 14.5)
                pdf.set_text_color(*CINNABAR)
                pdf.multi_cell(0, 8, text)
                pdf.set_draw_color(*CINNABAR)
                y = pdf.get_y() + 0.6
                pdf.line(20, y, 190, y)
                pdf.ln(3.4)
            elif level == 3:
                pdf.ln(2.6)
                pdf.set_font("CN", "B", 12.2)
                pdf.set_text_color(*INK)
                pdf.multi_cell(0, 6.6, text)
                pdf.ln(1)
            else:
                pdf.ln(1.6)
                pdf.set_font("CN", "B", 11)
                pdf.set_text_color(*INK)
                pdf.multi_cell(0, 6, text)
            i += 1
            continue

        # 表格
        if stripped.startswith("|"):
            rows, i = parse_table_rows(lines, i)
            if rows:
                pdf.set_font("CN", "", 9)
                pdf.set_text_color(*INK)
                with pdf.table(
                    col_widths=None,
                    line_height=4.8,
                    cell_fill_color=(250, 246, 240),
                    cell_fill_mode="ROWS",
                    text_align="LEFT",
                    padding=(1.4, 1.6, 1.4, 1.6),
                    first_row_as_headings=True,
                ) as table:
                    for row in rows:
                        tr = table.row()
                        for cell in row:
                            tr.cell(cell)
                pdf.ln(2.4)
            continue

        # 引用
        if stripped.startswith(">"):
            pdf.set_font("CN", "", 9.6)
            pdf.set_text_color(*SOFT)
            pdf.set_x(24)
            pdf.multi_cell(166, 5.4, strip_inline(stripped.lstrip("> ")))
            pdf.set_x(20)
            pdf.ln(1.6)
            i += 1
            continue

        # 列表
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", raw)
        if m:
            indent = len(m.group(1))
            marker = "•" if m.group(2) in ("-", "*") else m.group(2)
            pdf.set_font("CN", "", 10.2)
            pdf.set_text_color(*INK)
            pdf.set_x(20 + 4 + indent * 2)
            pdf.multi_cell(0, 5.6, marker + " " + strip_inline(m.group(3)))
            pdf.ln(0.4)
            i += 1
            continue

        # 空行
        if not stripped:
            pdf.ln(1.8)
            i += 1
            continue

        # 普通段落
        pdf.set_font("CN", "", 10.4)
        pdf.set_text_color(*INK)
        pdf.multi_cell(0, 6.0, strip_inline(stripped))
        pdf.ln(0.6)
        i += 1


def main():
    if len(sys.argv) < 3:
        raise SystemExit("用法: python md-to-pdf.py <input.md> <output.pdf>")
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "r", encoding="utf-8") as f:
        md = f.read()
    title_match = re.search(r"^#\s+(.*)$", md, re.M)
    doc_title = strip_inline(title_match.group(1)) if title_match else "交付文档"
    pdf = DocPDF(pick_font(), doc_title)
    pdf.add_page()
    render(pdf, md)
    pdf.output(dst)
    print("已生成: " + dst + " | 共 " + str(pdf.page_no()) + " 页")


if __name__ == "__main__":
    main()
