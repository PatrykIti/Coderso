import { DefaultRuntimePageShell, type PageTemplateProps } from "../site/pageRuntime";

export default function DefaultPageTemplate(props: PageTemplateProps) {
  return <DefaultRuntimePageShell {...props} />;
}

