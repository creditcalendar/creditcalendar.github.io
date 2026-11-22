export function isPublished(data, now = new Date()) {
  return !data.draft && new Date(data.date).getTime() <= now.getTime();
}

export function postURL(id) {
  return `/posts/${id.split('/').map(encodeURIComponent).join('/')}/`;
}

export function taxonomyURL(kind, name) {
  return `/${kind}/${encodeURIComponent(name)}/`;
}

export function matchesSearch(text, query) {
  const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('en-US');
  const haystack = normalize(text);
  return normalize(query).trim().split(/\s+/u).every((term) => haystack.includes(term));
}
