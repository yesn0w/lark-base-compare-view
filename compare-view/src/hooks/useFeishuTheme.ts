import { useEffect, useState } from 'react';
import {
  getHostTheme,
  subscribeToHostTheme,
  type HostTheme,
} from '../services/baseAdapter';

export type AppTheme = 'light' | 'dark';

export const toAppTheme = (theme: HostTheme): AppTheme =>
  theme === 'DARK' ? 'dark' : 'light';

const getBrowserTheme = (): AppTheme => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Keeps the view aligned with Feishu's current appearance. The browser setting
 * is only used when the Feishu bridge is unavailable, such as standalone local
 * development in a normal browser.
 */
export const useFeishuTheme = (): AppTheme => {
  const [theme, setTheme] = useState<AppTheme>(getBrowserTheme);

  useEffect(() => {
    let active = true;
    let hostThemeKnown = false;
    let receivedThemeEvent = false;
    let unsubscribe: (() => void) | undefined;
    let removeBrowserListener: (() => void) | undefined;

    const applyHostTheme = (hostTheme: HostTheme) => {
      hostThemeKnown = true;

      if (active) {
        setTheme(toAppTheme(hostTheme));
      }
    };

    const attachBrowserFallback = () => {
      if (
        typeof window === 'undefined' ||
        !window.matchMedia ||
        removeBrowserListener
      ) {
        return;
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => {
        if (active && !hostThemeKnown) {
          setTheme(event.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      removeBrowserListener = () => mediaQuery.removeEventListener('change', handleChange);
    };

    try {
      unsubscribe = subscribeToHostTheme((hostTheme) => {
        receivedThemeEvent = true;
        applyHostTheme(hostTheme);
      });
    } catch {
      attachBrowserFallback();
    }

    try {
      void getHostTheme()
        .then((hostTheme) => {
          if (!receivedThemeEvent) {
            applyHostTheme(hostTheme);
          }
        })
        .catch(attachBrowserFallback);
    } catch {
      attachBrowserFallback();
    }

    return () => {
      active = false;
      unsubscribe?.();
      removeBrowserListener?.();
    };
  }, []);

  return theme;
};
