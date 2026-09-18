const SPLASH_DISMISSED_KEY = 'hello-fellow-voter:splash-dismissed';

export function isSplashPermanentlyDismissed(): boolean {
  return localStorage.getItem(SPLASH_DISMISSED_KEY) === 'true';
}

export function dismissSplashPermanently(): void {
  localStorage.setItem(SPLASH_DISMISSED_KEY, 'true');
}
