import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendContactEmail, isMailerConfigured } from "@/lib/mailer";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  email: z.string().email("Enter a valid email address."),
  subject: z.string().min(1, "Subject is required.").max(200),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters.")
    .max(5000),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = consumeRateLimit(request, {
    key: "contact",
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many submissions. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  if (!isMailerConfigured()) {
    return NextResponse.json(
      {
        message:
          "Contact form is not available — email delivery is not configured.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await sendContactEmail({
      fromName: parsed.data.name,
      fromEmail: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error("[contact] sendMail failed:", detail);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV !== "production"
            ? `Failed to send message: ${detail}`
            : "Failed to send message. Please try again later.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Message sent successfully." });
}
