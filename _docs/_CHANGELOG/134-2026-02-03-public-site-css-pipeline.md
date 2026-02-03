# Public site CSS pipeline

- added dedicated public CSS build (`dist/site`) with Tailwind sources for widgets
- injected resolved theme tokens as CSS variables for public rendering
- wired public runtime to load `/site` assets instead of admin CSS
