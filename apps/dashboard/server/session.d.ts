import 'cookie-session';

declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      authed?: boolean;
    }
  }
}

export {};
