import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';
import { safeReturnUrl } from './auth-navigation';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  await auth.restoreSession();
  return auth.isAuthenticated() || auth.loginUrl(state.url);
};

export const loginGuard: CanActivateFn = async (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.restoreSession();
  return (
    !auth.isAuthenticated() ||
    router.parseUrl(safeReturnUrl(router, route.queryParamMap.get('returnUrl')))
  );
};
