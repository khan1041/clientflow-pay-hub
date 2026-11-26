
import OpenAI from "openai";

interface OnboardingInput {
  clientName: string;
  businessName?: string | null;
  businessGoal?: string | null;
  packageName: string;
  addOnNames: string[];
  amountFormatted: string;
}

export interface OnboardingResult {
  clientPlan: string;
  internalSteps: string;
  providerUsed: "openai" | "fallback";
}

export async function generateOnboardingPlan(
  input: OnboardingInput
): Promise<OnboardingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const businessLabel = input.businessName || `${input.clientName}'s Business`;
  const goalLabel = input.businessGoal || "Streamline client acquisition and onboarding";
  const addOnsLabel = input.addOnNames.length > 0 ? input.addOnNames.join(", ") : "None";

  if (!apiKey || apiKey.startsWith("sk-your_")) {
    return {
      clientPlan: `Welcome ${input.clientName}! Your "${input.packageName}" (${input.amountFormatted}) for ${businessLabel} is confirmed. Step 1: Share CRM & webhook access. Step 2: Align on "${goalLabel}". Step 3: Launch & test automated onboarding flow.`,
      internalSteps: `1. Verify payment & tag contact in GoHighLevel. 2. Configure onboarding pipeline for ${businessLabel}. 3. Deliver add-ons (${addOnsLabel}) and run end-to-end test.`,
      providerUsed: "fallback",
    };
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior B2B operations and automation strategist. Return strict JSON with keys 'clientPlan' (concise client welcome & 3-step onboarding summary) and 'internalSteps' (concise internal CRM & delivery checklist).",
        },
        {
          role: "user",
          content: JSON.stringify({
            clientName: input.clientName,
            businessName: businessLabel,
            businessGoal: goalLabel,
            packageName: input.packageName,
            addOns: addOnsLabel,
            amount: input.amountFormatted,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as {
      clientPlan?: string;
      internalSteps?: string;
    };

    return {
      clientPlan:
        parsed.clientPlan ||
        `Welcome ${input.clientName}! Your onboarding roadmap for ${businessLabel} is ready.`,
      internalSteps:
        parsed.internalSteps ||
        `Provision CRM workflow and kick off onboarding for ${businessLabel}.`,
      providerUsed: "openai",
    };
  } catch {
    return {
      clientPlan: `Welcome ${input.clientName}! Your "${input.packageName}" for ${businessLabel} is active. We will begin onboarding focused on: ${goalLabel}.`,
      internalSteps: `Fallback generated: Create onboarding task for ${businessLabel}, attach add-ons (${addOnsLabel}), and review goal "${goalLabel}".`,
      providerUsed: "fallback",
    };
  }
}

