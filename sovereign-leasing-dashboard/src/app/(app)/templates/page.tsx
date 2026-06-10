import { createTemplateAction } from "@/lib/actions";
import { listTemplates } from "@/lib/repository";
import { templateVariables } from "@/lib/template-renderer";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold">Email Templates</h2>
        <p className="mt-1 text-sm text-[#6d6f78]">
          Configure auto-send, draft-review, and manual modes with listing-specific placeholders.
        </p>
        <p className="mt-2 text-xs text-[#6d6f78]">Available variables: {templateVariables.join(", ")}</p>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
        <div className="card space-y-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded-xl border border-[#ece8e3] p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{template.name}</h3>
                <span className="rounded-full bg-[#f2ebe4] px-2 py-1 text-xs">{template.mode.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#6d6f78]">{template.category}</p>
              <p className="mt-2 text-sm font-medium">{template.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#5e6070]">{template.body}</p>
            </article>
          ))}
        </div>

        <form action={createTemplateAction} className="card space-y-3">
          <h3 className="text-lg font-semibold">Create template</h3>
          <input name="name" placeholder="Template name" required />
          <input name="category" placeholder="Category (e.g., INITIAL_REPLY)" required />
          <select name="mode" defaultValue="DRAFT_REVIEW">
            <option value="AUTO_SEND">Auto-send</option>
            <option value="DRAFT_REVIEW">Draft for review</option>
            <option value="MANUAL_ONLY">Manual only</option>
          </select>
          <input name="subject" placeholder="Subject" required />
          <textarea name="body" rows={8} placeholder="Email body" required />
          <button type="submit">Save template</button>
        </form>
      </section>
    </div>
  );
}
