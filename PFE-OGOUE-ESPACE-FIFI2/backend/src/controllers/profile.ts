import { Response } from "express";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import type { InstitutionProfileRequest, PMEProfileRequest } from "../types/index.js";

export const profileController = {
  // ============================================
  // INSTITUTION PROFILE
  // ============================================

  // Get all institutions (for PMEs to select)
  getAllInstitutions: async (req: AuthRequest, res: Response) => {
    try {
      const { data: institutions, error } = await supabase
        .from("institutions")
        .select("id, name, institution_type, mission, website, logo_url")
        .order("name", { ascending: true });

      if (error) throw new AppError("Failed to fetch institutions", 500);

      console.log('✅ Institutions retrieved:', institutions.length);
      res.json({ institutions });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching institutions:', error);
      res.status(500).json({ error: "Failed to fetch institutions" });
    }
  },

  // Get institution profile
  getInstitutionProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { data: institution, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("user_id", req.user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No institution found
        return res.json({ institution: null });
      }

      if (error) throw new AppError("Failed to fetch institution", 500);

      console.log('✅ Institution profile retrieved:', institution.id);
      res.json({ institution });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching institution:', error);
      res.status(500).json({ error: "Failed to fetch institution profile" });
    }
  },

  // Update institution profile (only name can be updated in v3)
  updateInstitutionProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { name }: InstitutionProfileRequest = req.body;

      if (!name) {
        throw new AppError("Institution name is required", 400);
      }

      // Get institution ID
      const { data: institution } = await supabase
        .from("institutions")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!institution) {
        throw new AppError("Institution not found", 404);
      }

      // Update only the name
      const { data: updated, error } = await supabase
        .from("institutions")
        .update({
          name,
          updated_at: new Date(),
        })
        .eq("id", institution.id)
        .select()
        .single();

      if (error) throw new AppError("Failed to update institution", 500);

      console.log('✅ Institution profile updated:', institution.id);
      res.json({
        message: "Institution profile updated successfully",
        institution: updated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error updating institution:', error);
      res.status(500).json({ error: "Failed to update institution profile" });
    }
  },

  // ============================================
  // PME PROFILE
  // ============================================

  // Get PME profile
  getPMEProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { data: pme, error } = await supabase
        .from("pmes")
        .select("*")
        .eq("user_id", req.user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No PME found
        return res.json({ pme: null });
      }

      if (error) throw new AppError("Failed to fetch PME profile", 500);

      console.log('✅ PME profile retrieved:', pme.id);
      res.json({ pme });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error fetching PME:', error);
      res.status(500).json({ error: "Failed to fetch PME profile" });
    }
  },

  // Update PME profile (only what's collected at signup)
  updatePMEProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) throw new AppError("Not authenticated", 401);

      const { company_name, rccm_number, nif_number, sector, activity_description }: PMEProfileRequest = req.body;

      // Get PME ID
      const { data: existingPME } = await supabase
        .from("pmes")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (!existingPME) {
        throw new AppError("PME profile not found", 404);
      }

      // Update PME profile with only v3 fields
      const { data: updated, error } = await supabase
        .from("pmes")
        .update({
          company_name: company_name || undefined,
          rccm_number: rccm_number || null,
          nif_number: nif_number || null,
          sector: sector || undefined,
          activity_description: activity_description || undefined,
          updated_at: new Date(),
        })
        .eq("id", existingPME.id)
        .select()
        .single();

      if (error) throw new AppError("Failed to update PME profile", 500);

      console.log('✅ PME profile updated:', existingPME.id);
      res.json({
        message: "PME profile updated successfully",
        pme: updated,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Error updating PME:', error);
      res.status(500).json({ error: "Failed to update PME profile" });
    }
  },
};
