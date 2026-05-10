# Footer Research Cards

Security note: footer is public output but editor writes are internal admin.
Manual links must be validated as safe URLs; newsletter/contact embeds must keep
their public-write security owned by backend services.

| Source | URL | Access type | License/terms summary | Observed UX pattern | Useful Coderso fields/options | Decision | Copy policy |
|---|---|---|---|---|---|---|---|
| Flowbite React Footer | https://flowbite-react.com/docs/components/footer | docs-example | Flowbite React is MIT; verify docs terms. | Footer with logo, link groups, copyright, social icons. | `logo`, `columns`, `copyright`, `socialLinks`. | Keep | Summarize only. |
| Flowbite Footer | https://flowbite.com/docs/components/footer/ | docs-example | MIT core; verify docs terms. | Multi-column footer, newsletter, social, language/currency patterns. | `columns`, `newsletterSlot`, `socialLinks`, `localeLinks`. | Adapt | Summarize only. |
| daisyUI footer | https://daisyui.com/components/footer/ | open-source | MIT package; verify. | Footer sections with title labels, nav links, and icon rows. | `columns[].title`, `links`, `socialLinks`, `style.variant`. | Keep | Summarize only. |
| Preline footer | https://preline.co/docs/footer.html | docs-example | Terms require verification. | Responsive footer with columns, CTA, newsletter, and legal row. | `columns`, `cta`, `newsletter`, `legalLinks`. | Adapt | Summarize only. |
| Tailwind UI footers | https://tailwindcss.com/plus/ui-blocks/marketing/sections/footers | premium-reference | Paid reference only. | Premium footer layouts with newsletter and dense link taxonomy. | `layout.mode`, `columns`, `newsletterPlacement`, `legalRow`. | Adapt | Reference UX only. |
| WordPress Navigation/Menu blocks | https://wordpress.org/documentation/article/navigation-block/ | docs-example | Documentation reference. | Footer menus can reuse navigation sources and nested links. | `source.menuId`, `columns`, `links`. | Keep | Summarize behavior only. |
| Shopify footer menus | https://shopify.dev/docs/storefronts/themes/navigation-search/navigation | docs-example | Shopify docs terms. | Storefront footer menu columns with policy/social/newsletter slots. | `source.menuHandles`, `policyLinks`, `socialLinks`. | Adapt | Summarize behavior. |
| HyperUI footers | https://www.hyperui.dev/components/marketing/footers | open-source | MIT library; verify. | Marketing footers with link columns, logo, description, and social links. | `brand.description`, `columns`, `socialLinks`, `spacing`. | Adapt | Summarize only. |
| shadcn blocks footer examples | https://www.shadcn.io/blocks | docs-example | Verify block license before reuse. | SaaS/footer blocks with grouped links and CTA/newsletter surfaces. | `columns`, `cta`, `newsletter`, `style.surface`. | Adapt | Summarize only. |
| Mailchimp footer signup | https://mailchimp.com/help/add-a-signup-form-to-your-website/ | docs-example | Mailchimp terms; provider reference. | Footer newsletter signup with consent and provider action. | `newsletter.enabled`, `consent`, `integrationReference`. | Adapt | Summarize only; backend owns provider secrets. |
