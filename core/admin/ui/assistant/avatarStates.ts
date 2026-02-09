export type AssistantAvatarState = "idle" | "thinking" | "answer";

export type AssistantAvatarStateDescriptor = {
  label: string;
  ringClassName: string;
  glowClassName: string;
};

export const assistantAvatarStateMap: Record<
  AssistantAvatarState,
  AssistantAvatarStateDescriptor
> = {
  idle: {
    label: "Idle",
    ringClassName: "ring-primary/20",
    glowClassName: "bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20",
  },
  thinking: {
    label: "Thinking",
    ringClassName: "ring-amber-400/40",
    glowClassName: "bg-gradient-to-br from-amber-300/35 via-primary/20 to-secondary/20",
  },
  answer: {
    label: "Answer",
    ringClassName: "ring-emerald-400/40",
    glowClassName: "bg-gradient-to-br from-emerald-300/35 via-secondary/20 to-primary/20",
  },
};
