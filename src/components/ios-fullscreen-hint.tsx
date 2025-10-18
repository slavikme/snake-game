"use client";

import { useEffect, useState } from "react";
import { HiMiniXMark } from "react-icons/hi2";

const IOSFullscreenHint = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = localStorage.getItem("ios-fullscreen-hint-dismissed");
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    // Check if it's iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check if running in standalone mode (already added to home screen)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    // Show hint only on iOS devices not in standalone mode
    if (isIOS && !isStandalone) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("ios-fullscreen-hint-dismissed", "true");
    setDismissed(true);
    setShow(false);
  };

  if (!show || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white text-sm">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Dismiss"
      >
        <HiMiniXMark className="w-5 h-5" />
      </button>

      <div className="pr-8">
        <p className="font-semibold mb-2">
          🎮 Get Fullscreen Experience on iPhone
        </p>
        <p className="text-white/80 mb-2">
          iOS Safari doesn&apos;t support fullscreen mode. Install as an app:
        </p>
        <ol className="list-decimal list-inside text-white/80 space-y-1.5 ml-2 mb-2">
          <li>
            Tap the Share button (
            <svg
              className="inline w-4 h-4 mx-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z" />
            </svg>
            ) at the bottom
          </li>
          <li>
            Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong>
          </li>
          <li>
            Tap <strong>&quot;Add&quot;</strong> in the top right
          </li>
          <li>
            <strong>If you already added it, remove the old icon first</strong>
          </li>
          <li>Launch from your home screen for fullscreen mode</li>
        </ol>
        <p className="text-xs text-white/60">
          💡 The Safari address bar will be hidden when launched from home
          screen
        </p>
      </div>
    </div>
  );
};

export default IOSFullscreenHint;
