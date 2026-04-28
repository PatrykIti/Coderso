import type { ContentTemplateProps } from "../site/renderPublicEntry";

import ContentDetailTemplate from "./content-detail";
import ContentListTemplate from "./content-list";

export default function ContentTemplate(props: ContentTemplateProps) {
  if (props.variant === "detail") {
    return <ContentDetailTemplate {...props} />;
  }

  return <ContentListTemplate {...props} />;
}
