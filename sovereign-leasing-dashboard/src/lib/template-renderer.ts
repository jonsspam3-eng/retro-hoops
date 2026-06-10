export function renderTemplate(
  input: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return input.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export const templateVariables = [
  "{{client_name}}",
  "{{listing_address}}",
  "{{apartment_number}}",
  "{{rent}}",
  "{{agent_name}}",
  "{{agent_phone}}",
  "{{missing_fields}}",
  "{{showing_times}}",
  "{{showing_date}}",
  "{{showing_time}}",
  "{{access_instructions}}",
  "{{application_link}}",
];
