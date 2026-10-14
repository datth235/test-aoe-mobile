function standalone(): boolean {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  return appleNavigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
}

export function fullscreenActive(): boolean {
  return !!document.fullscreenElement || standalone();
}

function notice(message: string): void {
  const element = document.getElementById('fullscreen-notice');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => { element.hidden = true; }, 6500);
}

let hideTimer = 0;

function unavailableMessage(): string {
  if (/iPhone|iPad|iPod/.test(navigator.userAgent))
    return 'To fill the screen on iPhone: Share → Add to Home Screen, then open the game from its icon.';
  return 'Fullscreen is unavailable here. Open the game directly in your browser or install it to your home screen.';
}

export async function enterFullscreen(showFailure = true): Promise<boolean> {
  if (fullscreenActive()) return true;
  const root = document.documentElement;
  if (!root.requestFullscreen || document.fullscreenEnabled === false) {
    if (showFailure) notice(unavailableMessage());
    return false;
  }
  try {
    await root.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
    if (orientation?.lock) void orientation.lock('landscape').catch(() => undefined);
    return true;
  } catch {
    if (showFailure) notice(unavailableMessage());
    return false;
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); }
    catch { notice('The browser could not exit fullscreen. Use its system back control.'); }
    return;
  }
  if (standalone()) {
    notice('The game is already running as a full-screen app.');
    return;
  }
  await enterFullscreen();
}
