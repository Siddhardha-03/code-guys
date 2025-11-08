import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
        isDark
          ? 'bg-slate-900 text-slate-100 shadow-inner ring-1 ring-slate-700'
          : 'bg-white text-slate-700 shadow ring-1 ring-slate-200'
      }`}
    >
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          isDark
            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 text-white'
            : 'bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 text-white'
        }`}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
