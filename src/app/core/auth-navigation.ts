import { PRIMARY_OUTLET, Router } from '@angular/router';

/** Accept only existing, primary-outlet workspace routes as post-login destinations. */
export function safeReturnUrl(router: Router, value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value))
    return '/overview';
  try {
    const tree = router.parseUrl(value);
    const primary = tree.root.children[PRIMARY_OUTLET];
    if (
      Object.keys(tree.root.children).length !== 1 ||
      !primary ||
      Object.keys(primary.children).length
    )
      return '/overview';
    const paths = primary.segments.map((segment) => segment.path);
    const [first] = paths;
    const single = [
      'overview',
      'policies',
      'investigations',
      'evidence',
      'evaluations',
      'settings',
    ];
    if (
      (paths.length === 1 && single.includes(first)) ||
      (paths.length === 2 && first === 'investigations' && /^[a-zA-Z0-9-]+$/.test(paths[1]))
    )
      return value;
  } catch {
    // Malformed links must not prevent the login page from opening.
  }
  return '/overview';
}
