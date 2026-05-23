const ALLOWED_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6','p','br','hr','strong','em','b','i','u',
  'ul','ol','li','a','span','div','section','blockquote','pre','code',
  'table','thead','tbody','tr','th','td','img','sup','sub','small',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'class']),
  img: new Set(['src', 'alt', 'width', 'height', 'class']),
  td: new Set(['class', 'colspan', 'rowspan']),
  th: new Set(['class', 'colspan', 'rowspan']),
  '*': new Set(['class', 'id', 'style']),
};

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s>][\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/data\s*:\s*text\/html/gi, 'blocked:')
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s>][\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s>][\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s>][\s\S]*?<\/form>/gi, '')
    .replace(/<input[\s>][^>]*>/gi, '')
    .replace(/<textarea[\s>][\s\S]*?<\/textarea>/gi, '')
    .replace(/<button[\s>][\s\S]*?<\/button>/gi, '');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
