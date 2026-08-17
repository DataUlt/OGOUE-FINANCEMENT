import { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

// ============================================================
// Dossiers de financement, cote INSTITUTION
// ------------------------------------------------------------
// Les PME constituent et deposent leurs dossiers depuis l'app OGOUE
// (voir financing.controller.js). L'institution les instruit ici :
// elle les consulte et fait avancer leur statut.
// ============================================================

/** Statuts qu'une institution peut appliquer, selon l'etat courant du dossier. */
const TRANSITIONS: Record<string, string[]> = {
  depose: ["en_examen", "complement_requis", "accepte", "refuse"],
  en_examen: ["complement_requis", "accepte", "refuse"],
  // complement_requis : la main est rendue a la PME, qui doit redeposer.
  // accepte / refuse : le dossier est clos.
};

/** Statuts qui cloturent un dossier et fixent la date de decision. */
const STATUTS_FINAUX = ["accepte", "refuse"];

/** Un brouillon appartient encore a la PME : l'institution ne doit pas le voir. */
const STATUTS_VISIBLES = ["depose", "en_examen", "complement_requis", "accepte", "refuse"];

/**
 * Bucket PRIVE des pieces de dossier, sur ce meme projet Supabase.
 * Doit rester aligne avec OGOUE/backend/src/utils/financing-storage.js,
 * qui y depose les fichiers.
 */
const BUCKET_PIECES = "dossiers-financement";

const SELECT_APPLICATION = `
  id, status, amount_requested, duration_months, purpose,
  submitted_at, decided_at, decision_note, created_at, updated_at,
  pmes ( id, company_name, rccm_number, nif_number, sector, activity_description ),
  credit_products ( id, name, objective, amount_min, amount_max, duration_min_months, duration_max_months, interest_type )
`;

function transformApplication(row: any) {
  return {
    id: row.id,
    status: row.status,
    amountRequested: row.amount_requested === null ? null : Number(row.amount_requested),
    durationMonths: row.duration_months,
    purpose: row.purpose,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    pme: row.pmes
      ? {
          id: row.pmes.id,
          companyName: row.pmes.company_name,
          rccmNumber: row.pmes.rccm_number,
          nifNumber: row.pmes.nif_number,
          sector: row.pmes.sector,
          activityDescription: row.pmes.activity_description,
        }
      : null,
    product: row.credit_products
      ? {
          id: row.credit_products.id,
          name: row.credit_products.name,
          objective: row.credit_products.objective,
          amountMin: Number(row.credit_products.amount_min) || 0,
          amountMax: Number(row.credit_products.amount_max) || 0,
          durationMinMonths: row.credit_products.duration_min_months,
          durationMaxMonths: row.credit_products.duration_max_months,
          interestType: row.credit_products.interest_type,
        }
      : null,
  };
}

/**
 * Retrouve l'institution de l'utilisateur connecte.
 * Meme resolution que dans creditProducts.getInstitutionProducts.
 */
async function getInstitutionForUser(req: AuthRequest) {
  if (!req.user) throw new AppError("Not authenticated", 401);

  const { data: institution, error } = await supabase
    .from("institutions")
    .select("id, name")
    .eq("user_id", req.user.id)
    .single();

  if (error || !institution) {
    throw new AppError("Institution not found", 404);
  }

  return institution;
}

export const applicationsController = {
  /**
   * GET /api/applications
   * Dossiers adresses a l'institution connectee. Les brouillons sont
   * exclus : ils appartiennent encore a la PME.
   */
  list: async (req: AuthRequest, res: Response) => {
    try {
      const institution = await getInstitutionForUser(req);

      const { status } = req.query;
      let query = supabase
        .from("loan_applications")
        .select(SELECT_APPLICATION)
        .eq("institution_id", institution.id)
        .in("status", STATUTS_VISIBLES);

      if (typeof status === "string" && STATUTS_VISIBLES.includes(status)) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("submitted_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur list applications:", error);
        throw new AppError("Failed to fetch applications", 500);
      }

      res.json({ applications: (data || []).map(transformApplication) });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur list applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  },

  /**
   * GET /api/applications/:id
   * Detail d'un dossier, avec ses pieces et son historique.
   */
  getOne: async (req: AuthRequest, res: Response) => {
    try {
      const institution = await getInstitutionForUser(req);
      const { id } = req.params;

      const { data: application, error } = await supabase
        .from("loan_applications")
        .select(SELECT_APPLICATION)
        .eq("id", id)
        .eq("institution_id", institution.id)
        .in("status", STATUTS_VISIBLES)
        .maybeSingle();

      if (error) {
        console.error("❌ Erreur getOne application:", error);
        throw new AppError("Failed to fetch application", 500);
      }
      if (!application) throw new AppError("Dossier introuvable", 404);

      const [{ data: documents }, { data: history }] = await Promise.all([
        supabase
          .from("application_documents")
          .select("id, name, required_document_id, uploaded_at")
          .eq("application_id", id)
          .order("uploaded_at", { ascending: true }),
        supabase
          .from("application_status_history")
          .select("status, note, changed_by, created_at")
          .eq("application_id", id)
          .order("created_at", { ascending: true }),
      ]);

      res.json({
        ...transformApplication(application),
        // Pas d'URL ici : le bucket est prive. Chaque piece s'ouvre via
        // /documents/:docId/url, qui signe un lien valable 5 minutes.
        documents: (documents || []).map((d) => ({
          id: d.id,
          name: d.name,
          requiredDocumentId: d.required_document_id,
          uploadedAt: d.uploaded_at,
        })),
        history: (history || []).map((h) => ({
          status: h.status,
          note: h.note,
          changedBy: h.changed_by,
          at: h.created_at,
        })),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur getOne application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  },

  /**
   * GET /api/applications/:id/documents/:docId/url
   * Lien de telechargement a duree limitee. Le bucket des pieces est
   * prive : c'est le seul moyen d'ouvrir un justificatif, et il exige
   * que le dossier soit bien adresse a cette institution.
   */
  getDocumentUrl: async (req: AuthRequest, res: Response) => {
    try {
      const institution = await getInstitutionForUser(req);
      const { id, docId } = req.params;

      const { data: application } = await supabase
        .from("loan_applications")
        .select("id")
        .eq("id", id)
        .eq("institution_id", institution.id)
        .in("status", STATUTS_VISIBLES)
        .maybeSingle();

      if (!application) throw new AppError("Dossier introuvable", 404);

      const { data: document } = await supabase
        .from("application_documents")
        .select("id, name, storage_path")
        .eq("id", docId)
        .eq("application_id", id)
        .maybeSingle();

      if (!document) throw new AppError("Pièce introuvable", 404);

      const { data, error } = await supabase.storage
        .from(BUCKET_PIECES)
        .createSignedUrl(document.storage_path, 300);

      if (error || !data?.signedUrl) {
        console.error("❌ Erreur URL signée:", error?.message);
        throw new AppError("Lien de téléchargement indisponible", 500);
      }

      res.json({ url: data.signedUrl, name: document.name });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur getDocumentUrl:", error);
      res.status(500).json({ error: "Failed to create download link" });
    }
  },

  /**
   * PATCH /api/applications/:id/status
   * Fait avancer le dossier. La transition est validee ici, jamais
   * sur la foi du frontend.
   */
  updateStatus: async (req: AuthRequest, res: Response) => {
    try {
      const institution = await getInstitutionForUser(req);
      const { id } = req.params;
      const { status, note } = req.body || {};

      if (!status || typeof status !== "string") {
        throw new AppError("Le statut est obligatoire", 400);
      }

      const { data: application, error: readError } = await supabase
        .from("loan_applications")
        .select("id, status")
        .eq("id", id)
        .eq("institution_id", institution.id)
        .maybeSingle();

      if (readError) {
        console.error("❌ Erreur updateStatus (lecture):", readError);
        throw new AppError("Failed to update application", 500);
      }
      if (!application) throw new AppError("Dossier introuvable", 404);

      const autorises = TRANSITIONS[application.status] || [];
      if (!autorises.includes(status)) {
        throw new AppError(
          `Transition impossible : un dossier « ${application.status} » ne peut pas passer à « ${status} »`,
          409
        );
      }

      // Demander un complement sans dire ce qui manque laisse la PME sans
      // recours : la note devient obligatoire dans ce cas.
      const noteNettoyee = typeof note === "string" ? note.trim() : "";
      if (status === "complement_requis" && !noteNettoyee) {
        throw new AppError("Précisez ce qui manque au dossier", 400);
      }

      const maintenant = new Date().toISOString();
      const payload: Record<string, any> = { status, updated_at: maintenant };
      if (noteNettoyee) payload.decision_note = noteNettoyee;
      if (STATUTS_FINAUX.includes(status)) payload.decided_at = maintenant;

      const { error: updateError } = await supabase
        .from("loan_applications")
        .update(payload)
        .eq("id", id)
        .eq("institution_id", institution.id);

      if (updateError) {
        console.error("❌ Erreur updateStatus:", updateError);
        throw new AppError("Failed to update application", 500);
      }

      // C'est cet historique que la PME consulte pour suivre son dossier.
      const { error: historyError } = await supabase
        .from("application_status_history")
        .insert({
          application_id: id,
          status,
          note: noteNettoyee || null,
          changed_by: "institution",
        });

      if (historyError) {
        console.error("⚠️ Historique non enregistré:", historyError);
      }

      console.log("✅ Dossier", id, "->", status);
      res.json({ id, status, decisionNote: noteNettoyee || null });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Erreur updateStatus:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  },
};
