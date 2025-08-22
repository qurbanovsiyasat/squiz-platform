import React from 'react'

// This component is already referenced in the imports, keeping it for compatibility
export default function SocialMediaLinks() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600 dark:text-slate-400">Follow us on social media:</p>
      <div className="flex justify-center gap-6 mt-4">
        <a 
          href="https://www.tiktok.com/@mathl1ne?_t=ZS-8yzOMgEcoxI&_r=1" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="TikTok"
          className="bg-white dark:bg-gray-900 rounded-full p-3 shadow hover:shadow-lg transition-transform hover:scale-110 border-2 border-slate-100 dark:border-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-800 hover:text-fuchsia-500 dark:text-white" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.16 20.68a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.68Z"/></svg>
        </a>
        <a 
          href="https://t.me/+OoVdf3w_6HtiNjAy" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Telegram"
          className="bg-white dark:bg-gray-900 rounded-full p-3 shadow hover:shadow-lg transition-transform hover:scale-110 border-2 border-sky-100 dark:border-sky-800"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-sky-500 hover:text-sky-700 dark:text-sky-300" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.789l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434Z"/></svg>
        </a>
        <a 
          href="https://www.instagram.com/mathl1ne?igsh=MWNrZWhkeGlncHh5Yw==" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="bg-white dark:bg-gray-900 rounded-full p-3 shadow hover:shadow-lg transition-transform hover:scale-110 border-2 border-pink-100 dark:border-pink-800"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-pink-500 hover:text-pink-700 dark:text-pink-400" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
        <a 
          href="https://youtube.com/@cingizkazmov6736?si=rWSwLyhY1EngH9m5" 
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="bg-white dark:bg-gray-900 rounded-full p-3 shadow hover:shadow-lg transition-transform hover:scale-110 border-2 border-red-100 dark:border-red-800"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-600 hover:text-red-800 dark:text-red-400" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </a>
      </div>
    </div>
  )
}
