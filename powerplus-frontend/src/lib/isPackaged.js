// True when running inside an installed/packaged app (Android APK, Windows
// MSIX/Store, or browser "Install") rather than a normal browser tab.
// The Downloads page is hidden in that case — no point offering installers
// from inside the installed app.
export function isPackagedApp() {
  if (typeof window === 'undefined') return false
  if (document.referrer.startsWith('android-app://')) return true
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  if (window.navigator?.standalone) return true // iOS
  return new URLSearchParams(window.location.search).get('packaged') === '1'
}
