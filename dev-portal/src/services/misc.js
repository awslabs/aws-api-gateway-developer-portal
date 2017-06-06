export function getQueryString() {
  const { search: q } = window.location

  if (!q) return {}

  return (/^[?#]/.test(q) ? q.slice(1) : q)
    .split('&')
    .reduce((params, param) => {
      let [ key, value ] = param.split('=');
      params[key] = value ? decodeURIComponent(value) : '';
      return params;
    }, { })
}
