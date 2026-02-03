export const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

export const matchesTemplateCategory = (
  templateCategory: string,
  filter: string
) => {
  if (filter === "all") return true;
  return (
    normalizeCategoryValue(templateCategory) === normalizeCategoryValue(filter)
  );
};
