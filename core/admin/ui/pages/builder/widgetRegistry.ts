import type { WidgetDefinition } from "./types";

export const widgetRegistry: WidgetDefinition[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Top-of-page hero with headline and call to action.",
    variants: [
      { id: "centered", label: "Centered", description: "Centered copy." },
      { id: "split", label: "Split", description: "Text + media split." },
    ],
    wizard: {
      prompt: "Choose your hero layout",
      options: [
        { id: "centered", label: "Centered", description: "Single column." },
        { id: "split", label: "Split", description: "Two column." },
      ],
    },
  },
  {
    type: "compare-timeline",
    label: "Compare Timeline",
    description: "Side-by-side timeline comparison block.",
    variants: [
      {
        id: "dual-track-highlight",
        label: "Dual Track",
        description: "Two tracks with highlight segments.",
      },
      {
        id: "stacked",
        label: "Stacked",
        description: "Stacked timelines with markers.",
      },
    ],
    wizard: {
      prompt: "Pick a compare timeline style",
      options: [
        {
          id: "dual-track-highlight",
          label: "Dual Track",
          description: "Best for side-by-side comparisons.",
        },
        {
          id: "stacked",
          label: "Stacked",
          description: "Great for long processes.",
        },
      ],
    },
  },
  {
    type: "newsletter",
    label: "Newsletter",
    description: "Signup call-to-action block.",
    variants: [
      { id: "inline", label: "Inline", description: "Inline form." },
      { id: "card", label: "Card", description: "Card with highlight." },
    ],
    wizard: {
      prompt: "Choose a newsletter style",
      options: [
        { id: "inline", label: "Inline", description: "Simple form." },
        { id: "card", label: "Card", description: "Card layout." },
      ],
    },
  },
];
