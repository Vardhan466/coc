import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-slate-950 transition shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Club Of Competition App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
          title="Install on iOS"
        >
          <Download className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-install-title"
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 id="ios-install-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Install on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">1.</span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-white">Share <Share className="w-3.5 h-3.5 inline" /></strong> button in the Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">2.</span>
                  <span>
                    Scroll down and select <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-2.5 text-sm font-bold hover:opacity-90 transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
