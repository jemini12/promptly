import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { SiteNav } from "@/components/site-nav";
import { LinkButton } from "@/components/ui/link-button";
import { uiText } from "@/content/ui-text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: uiText.help.title,
  description: uiText.help.description,
};

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);

  return (
    <main className="page-shell">
      <SiteNav signedIn={signedIn} />
      <section className="content-shell max-w-4xl py-10">
        <h1 className="text-3xl font-semibold text-zinc-900">{uiText.help.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{uiText.help.description}</p>
        {!signedIn ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton
              href="/signin?callbackUrl=/jobs/new"
              variant="primary"
              size="sm"
            >
              {uiText.help.cta.createJob}
            </LinkButton>
            <LinkButton
              href="/signin?callbackUrl=/dashboard"
              variant="secondary"
              size="sm"
            >
              {uiText.help.cta.viewDashboard}
            </LinkButton>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.quickStart.title}</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.quickStart.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.templatesAndVariables.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.templatesAndVariables.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.postPrompt.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.postPrompt.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.channelSetup.title}</h2>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
              {uiText.help.channelSetup.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.customWebhook.title}</h2>
            <p className="mt-2 text-sm text-zinc-700">{uiText.help.customWebhook.description}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-zinc-900">Headers JSON</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-700">
                  {uiText.help.customWebhook.examples.headers}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-900">Payload JSON</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-700">
                  {uiText.help.customWebhook.examples.payload}
                </pre>
              </div>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.customWebhook.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.preview.title}</h2>
            <p className="mt-2 text-sm text-zinc-700">
              {uiText.help.preview.description}
            </p>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.webSearch.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.webSearch.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.runHistory.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.runHistory.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="surface-card">
            <h2 className="text-sm font-semibold text-zinc-900">{uiText.help.support.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {uiText.help.support.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
