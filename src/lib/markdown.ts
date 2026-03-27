function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    html.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      html.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      html.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      html.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      listItems.push(`<li>${formatInline(trimmed.slice(2))}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushList();
  flushParagraph();

  return html.join("");
}

export function extractTextExcerpt(markdown: string, limit = 180) {
  const plain = markdown
    .replace(/[#>*`-]/g, " ")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit).trim()}...`;
}
