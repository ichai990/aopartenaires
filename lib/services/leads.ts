import "server-only";

/**
 * Leads du site vitrine AO Partenaires : lus depuis le Google Sheet du
 * formulaire via l'Apps Script (doGet + jeton — voir google-apps-script.gs
 * dans le dépôt de la landing).
 */

export type SiteLead = {
  date: string;
  nom: string;
  entreprise: string;
  metier: string;
  zone: string;
  tel: string;
  email: string;
};

export type LeadsFeedResult = {
  /** false = variables d'environnement absentes. */
  configured: boolean;
  /** "SCRIPT_NOT_UPDATED" = le script Google n'expose pas encore le flux JSON. */
  error?: string;
  leads: SiteLead[];
};

export async function fetchSiteLeads(): Promise<LeadsFeedResult> {
  const url = process.env.LEADS_FEED_URL;
  const token = process.env.LEADS_FEED_TOKEN;
  if (!url || !token) return { configured: false, leads: [] };

  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    // Ancien script encore déployé : doGet renvoie le texte de test.
    if (!text.trim().startsWith("{")) {
      return { configured: true, error: "SCRIPT_NOT_UPDATED", leads: [] };
    }
    const data = JSON.parse(text) as {
      result: string;
      message?: string;
      leads?: SiteLead[];
    };
    if (data.result !== "ok" || !Array.isArray(data.leads)) {
      return {
        configured: true,
        error: data.message ?? "Réponse inattendue du script Google.",
        leads: [],
      };
    }
    // Les plus récents d'abord.
    return { configured: true, leads: [...data.leads].reverse() };
  } catch (e) {
    return {
      configured: true,
      error: e instanceof Error ? e.message : "Flux injoignable.",
      leads: [],
    };
  }
}
