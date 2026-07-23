import type { SVGProps } from "react";
import { Globe, X as XIcon } from "lucide-react";

import {
  FacebookBrandIcon,
  GitHubBrandIcon,
  InstagramBrandIcon,
  LinkedInBrandIcon,
  TwitchBrandIcon,
  TwitterBrandIcon,
  YouTubeBrandIcon,
} from "../../ui/brandIcons";
import type { FooterSocialType } from "./footerContract";

function FooterMonogramIcon({ text, ...props }: { text: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="12" cy="12" r="9" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fill="currentColor"
        stroke="none"
      >
        {text}
      </text>
    </svg>
  );
}

export function FooterSocialIcon({ type }: { type: FooterSocialType }) {
  const iconClassName = "h-4 w-4";

  switch (type) {
    case "linkedin":
      return <LinkedInBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "twitter":
      return <TwitterBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "x":
      return <XIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "github":
      return <GitHubBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "youtube":
      return <YouTubeBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "facebook":
      return <FacebookBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "instagram":
      return <InstagramBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "twitch":
      return <TwitchBrandIcon className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
    case "tiktok":
      return <FooterMonogramIcon text="TT" className={iconClassName} aria-hidden="true" />;
    case "discord":
      return <FooterMonogramIcon text="D" className={iconClassName} aria-hidden="true" />;
    case "pinterest":
      return <FooterMonogramIcon text="P" className={iconClassName} aria-hidden="true" />;
    case "mastodon":
      return <FooterMonogramIcon text="M" className={iconClassName} aria-hidden="true" />;
    case "snapchat":
      return <FooterMonogramIcon text="S" className={iconClassName} aria-hidden="true" />;
    case "custom":
    default:
      return <Globe className={iconClassName} aria-hidden="true" strokeWidth={1.8} />;
  }
}
