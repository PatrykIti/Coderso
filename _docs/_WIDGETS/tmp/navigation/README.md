# Navigation Research Cards

Security note: navigation is public output but editor writes are internal admin.
Manual links must be validated as safe relative/admin-approved URLs; no secrets.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Flowbite React Navbar | https://flowbite-react.com/docs/components/navbar | docs-example | Flowbite React is MIT; verify docs terms. | Responsive navbar with brand, toggle, collapse, links, CTA. | `logo`, `links`, `mobileMode`, `cta`, `sticky`. | Keep | Summarize only. |
| Flowbite Navbar | https://flowbite.com/docs/components/navbar/ | docs-example | MIT core; verify docs terms. | Dropdowns, mega menu hooks, active state, responsive collapse. | `links[].children`, `activeState`, `dropdownMode`. | Adapt | Summarize only. |
| daisyUI navbar | https://daisyui.com/components/navbar/ | open-source | MIT package; verify. | Start/center/end regions with dropdown/mobile menu. | `regions`, `alignment`, `mobileDropdown`. | Adapt | Summarize only. |
| Preline navbar | https://preline.co/docs/navbar.html | docs-example | Terms require verification. | Header with collapse, dropdowns, offcanvas, and CTA. | `mobileMode`, `dropdownMode`, `cta`, `style.surface`. | Adapt | Summarize only. |
| Tailwind UI navbars | https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/navbars | premium-reference | Paid reference only. | Application/site nav variants with menus, avatar, and actions. | `variant`, `cta`, `secondaryLinks`, `sticky`. | Adapt | Reference UX only. |
| WordPress Navigation block | https://wordpress.org/documentation/article/navigation-block/ | docs-example | Documentation reference. | Manual or menu-source navigation with submenu and overlay mobile menu. | `source.mode`, `menuId`, `links`, `mobileOverlay`. | Keep | Summarize behavior only. |
| Shopify header/menu | https://shopify.dev/docs/storefronts/themes/navigation-search/navigation | docs-example | Shopify docs terms. | Storefront menu sources and nested menu links. | `source.menuHandle`, `links[].children`, `commerceSearch`. | Adapt | Summarize behavior. |
| HyperUI headers | https://www.hyperui.dev/components/marketing/headers | open-source | MIT library; verify. | Marketing headers with logo, links, CTA, and mobile menu. | `layout.mode`, `cta`, `mobileMode`. | Adapt | Summarize only. |
| shadcn navigation menu | https://ui.shadcn.com/docs/components/navigation-menu | open-source | MIT-style registry; verify per component. | Accessible navigation menu with grouped dropdown content. | `dropdownMode`, `groups`, `keyboardNav`. | Adapt | Summarize behavior only. |
| Aceternity navbar menu | https://ui.aceternity.com/components/navbar-menu | docs-example | License/terms vary; verify. | Animated navbar/menu interaction with visual transitions. | `motion`, `hoverPreview`, `reducedMotion`. | Reject | Reference only; avoid animation-heavy nav default. |
