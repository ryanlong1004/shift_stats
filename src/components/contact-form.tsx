"use client";

import { useState, useTransition } from "react";

type FieldErrors = Partial<
  Record<"name" | "email" | "subject" | "message", string[]>
>;

export function ContactForm({
  defaultEmail = "",
  defaultName = "",
}: {
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const payload = (await response.json()) as {
        message?: string;
        fieldErrors?: FieldErrors;
      };

      if (!response.ok) {
        if (payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setStatus({
          ok: false,
          message: payload.message ?? "Something went wrong.",
        });
        return;
      }

      setStatus({
        ok: true,
        message: payload.message ?? "Message sent successfully.",
      });
      setSubject("");
      setMessage("");
    });
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950";
  const errorClass = "mt-1 text-xs text-rose-600";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[1.75rem] border border-slate-900/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
            maxLength={100}
          />
          {fieldErrors.name && (
            <p className={errorClass}>{fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
            autoComplete="email"
          />
          {fieldErrors.email && (
            <p className={errorClass}>{fieldErrors.email[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
          required
          maxLength={200}
          placeholder="e.g. Bug report, Feature request, General question"
        />
        {fieldErrors.subject && (
          <p className={errorClass}>{fieldErrors.subject[0]}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className={`${inputClass} resize-y`}
          required
          minLength={10}
          maxLength={5000}
          placeholder="Describe the issue or request in as much detail as possible."
        />
        {fieldErrors.message && (
          <p className={errorClass}>{fieldErrors.message[0]}</p>
        )}
      </div>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || status?.ok === true}
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Sending…" : status?.ok ? "Sent!" : "Send message"}
      </button>
    </form>
  );
}
