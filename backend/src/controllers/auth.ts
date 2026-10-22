import { Response } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { supabase, supabaseAuth } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import type { RegisterRequest, LoginRequest, AuthResponse } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRATION = "7d";

// Projet PME : lu pour vérifier qu'une adresse n'est pas déjà un compte PME.
const supabasePme = process.env.SUPABASE_PME_URL && process.env.SUPABASE_PME_SERVICE_ROLE
  ? createClient(process.env.SUPABASE_PME_URL, process.env.SUPABASE_PME_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Renvoie true si l'adresse existe déjà comme compte PME dans le projet PME.
async function adresseEstUnComptePme(email: string): Promise<boolean> {
  if (!supabasePme) {
    console.error("⚠️  SUPABASE_PME_URL / SUPABASE_PME_SERVICE_ROLE absents : contrôle PME impossible");
    return false;
  }
  const motif = email.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabasePme
    .from("users")
    .select("id")
    .ilike("email", motif)
    .in("role", ["manager", "agent", "pme"])
    .maybeSingle();
  if (error) {
    console.error("⚠️  Contrôle PME échoué :", error.message);
    return false;
  }
  return !!data;
}

// Seules ces origines reçoivent le lien de confirmation institution.
const ORIGINES_CONFIRMATION_INSTITUTION = ["http://localhost:8000", "http://127.0.0.1:8000", "https://financement.ogoue.com"];

// Le logo (data URL) est trop lourd pour les métadonnées du compte : il part au stockage,
// et seule son adresse publique est gardée dans les métadonnées.
async function televerserLogoEnAttente(logo: string | null | undefined): Promise<string | null> {
  if (!logo || !logo.startsWith('data:')) return logo || null;
  const m = logo.match(/^data:(image\/(png|jpeg|jpg|svg\+xml));base64,(.+)$/);
  if (!m) throw new AppError("Format de logo invalide", 400);
  const mime = m[1];
  const extension = m[2] === 'svg+xml' ? 'svg' : m[2] === 'jpeg' ? 'jpg' : m[2];
  const chemin = `en-attente/${uuidv4()}.${extension}`;
  const { error } = await supabase.storage
    .from('institution-logos')
    .upload(chemin, Buffer.from(m[3], 'base64'), { contentType: mime, upsert: false });
  if (error) {
    console.error('❌ Logo upload (en attente):', error);
    throw new AppError("Impossible d'enregistrer le logo", 500);
  }
  const { data: { publicUrl } } = supabase.storage.from('institution-logos').getPublicUrl(chemin);
  return publicUrl;
}

// Crée users et institutions à partir des métadonnées du compte, une seule fois,
// à la première connexion (donc après confirmation de l'adresse).
async function creerProfilInstitutionSiAbsent(authUser: any): Promise<void> {
  const meta = authUser?.user_metadata || {};
  if (meta.role !== 'institution') return;

  const { data: existant } = await supabase.from("users").select("id").eq("auth_id", authUser.id).maybeSingle();
  if (existant) return;

  const userId = uuidv4();
  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    email: authUser.email,
    role: 'institution',
    full_name: meta.full_name || null,
    is_active: true,
    auth_id: authUser.id,
  });
  if (userError) {
    console.error('❌ User insert error:', userError);
    throw new AppError("Failed to create user profile", 500);
  }

  const d = meta.institution_data || {};
  const { error: instError } = await supabase.from("institutions").insert({
    id: uuidv4(),
    user_id: userId,
    name: meta.institution_name,
    institution_type: d.institution_type || null,
    mission: d.mission || null,
    website: d.website || null,
    logo_url: d.logo_url || null,
  });
  if (instError) {
    console.error('❌ Institution insert error:', instError);
    throw new AppError("Failed to create institution profile", 500);
  }
}

async function envoyerConfirmationInstitution(email: string, origine?: string | null): Promise<boolean> {
  const emailRedirectTo = origine && ORIGINES_CONFIRMATION_INSTITUTION.includes(origine)
    ? `${origine}/institution-confirmation.html`
    : undefined;
  const { error } = await supabaseAuth.auth.resend({ type: "signup", email, options: { emailRedirectTo } });
  if (error) console.error("Envoi du lien de confirmation échoué:", error.message);
  return !error;
}

export const authController = {
  // Register a new user (Institution or PME)
  register: async (req: any, res: Response) => {
    try {
      // Support both old format and new PME format
      let {
        email,
        password,
        user_type,
        full_name,
        institution_name,
        pme_name,
        pme_data,
        institution_data,
        // New PME format
        firstName,
        lastName,
        organizationName,
        rccmNumber,
        nifNumber,
        activity,
        activityDescription
      } = req.body;

      // Build role and full_name from new format if provided
      let role = user_type || 'institution';
      
      // Handle PME new format (firstName/lastName) - but only if user_type is not explicitly set
      if (!user_type && !full_name && (firstName || lastName)) {
        full_name = `${firstName || ''} ${lastName || ''}`.trim();
        role = 'pme'; // If using new format without explicit user_type, it's PME
      } else if (!full_name && (firstName || lastName)) {
        // Build full_name from firstName/lastName but keep the explicit role
        full_name = `${firstName || ''} ${lastName || ''}`.trim();
      }

      // Build pme_name from new format
      if (!pme_name && organizationName) {
        pme_name = organizationName;
      }

      // Build pme_data from new format
      if (!pme_data && (rccmNumber || nifNumber || activity || activityDescription)) {
        pme_data = {
          company_name: organizationName,
          rccm_number: rccmNumber,
          nif_number: nifNumber,
          sector: activity,
          activity_description: activityDescription
        };
      }

      console.log('📝 Register request:', { email, role, institution_name, pme_name, full_name, institution_data, organizationName });

      // Validation
      if (!email || !password) {
        throw new AppError("Email and password are required", 400);
      }

      if (!full_name && !organizationName) {
        throw new AppError("Full name or organization name is required", 400);
      }

      if (role === 'institution' && !institution_name) {
        throw new AppError("institution_name is required for institution registration", 400);
      }

      if (role === 'pme' && !pme_name) {
        throw new AppError("pme_name is required for PME registration", 400);
      }

      const userId = uuidv4();

      // Institution : logo au stockage avant de créer le compte
      // Une même adresse ne peut pas être une PME et une institution
      if (role === 'institution' && await adresseEstUnComptePme(email)) {
        return res.status(409).json({
          error: "Cette adresse e-mail est déjà utilisée par un compte PME. Utilisez une autre adresse.",
        });
      }

      const logoEnAttente = role === 'institution' ? await televerserLogoEnAttente(institution_data?.logo_url) : null;

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: role !== 'institution', // Institution : confirmation par e-mail, comme les PME
        // Institution : les données restent ici jusqu'à la confirmation, rien n'est écrit dans les tables
        user_metadata: role === 'institution'
          ? { role, full_name, institution_name, institution_data: institution_data ? { ...institution_data, logo_url: logoEnAttente } : null }
          : undefined,
      });

      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        throw new AppError("Email already exists or invalid input", 400);
      }

      if (role === 'institution') {
        const emailEnvoye = await envoyerConfirmationInstitution(email, req.body?.redirectOrigin);
        return res.status(201).json({
          message: "Compte créé. Un lien de confirmation vient d'être envoyé à votre adresse e-mail.",
          needsConfirmation: true,
          emailSent: emailEnvoye,
          email,
        });
      }

      const authId = authData.user.id;

      // 2. Create user in users table linked to auth
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email,
        role,
        full_name,
        is_active: true,
        auth_id: authId,
      });

      if (userError) {
        console.error('❌ User insert error:', userError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authId);
        throw new AppError("Failed to create user profile", 400);
      }

      // 2. Create institution profile
      if (role === "institution") {
        const { error: instError } = await supabase.from("institutions").insert({
          id: uuidv4(),
          user_id: userId,
          name: institution_name,
          institution_type: institution_data?.institution_type || null,
          mission: institution_data?.mission || null,
          website: institution_data?.website || null,
          logo_url: institution_data?.logo_url || null,
        });

        if (instError) {
          console.error('❌ Institution insert error:', instError);
          throw new AppError("Failed to create institution profile", 500);
        }
      }

      // 3. Create PME profile
      if (role === "pme") {
        const { error: pmeError } = await supabase.from("pmes").insert({
          id: uuidv4(),
          user_id: userId,
          company_name: pme_name,
          rccm_number: pme_data?.rccm_number || null,
          nif_number: pme_data?.nif_number || null,
          sector: pme_data?.sector || null,
          activity_description: pme_data?.activity_description || null,
        });

        if (pmeError) {
          console.error('❌ PME insert error:', pmeError);
          throw new AppError("Failed to create PME profile", 500);
        }
      }

      // 4. Generate JWT token from Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.getUserById(authId);

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new AppError("Failed to create session", 500);
      }

      // Generate our own JWT for consistency with existing system
      const token = jwt.sign(
        { userId, email, role, authId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      console.log('✅ Registration successful:', { userId, email, role, authId });

      // Return institution data if registered as institution
      let institutionData = null;
      if (role === 'institution') {
        institutionData = {
          name: institution_name,
          user_id: userId,
        };
      }

      res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          id: userId,
          email,
          role,
          full_name,
        },
        institution: institutionData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Registration error:', error);
      res.status(500).json({ error: "Registration failed" });
    }
  },

  // Renvoie le lien de confirmation. Même réponse qu'un compte existe ou non.
  resendConfirmation: async (req: any, res: Response) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!email) throw new AppError("Adresse e-mail requise", 400);
      await envoyerConfirmationInstitution(email, req.body?.redirectOrigin);
      res.json({ message: "Si un compte en attente existe pour cette adresse, un nouveau lien de confirmation vient d'être envoyé." });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Resend error:', error);
      res.status(500).json({ error: "Impossible d'envoyer le lien pour le moment" });
    }
  },

  // Login user
  // Après le clic sur le lien de confirmation : crée le profil si besoin et ouvre la session
  confirmerInstitution: async (req: any, res: Response) => {
    try {
      const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
      if (!accessToken) throw new AppError("Lien de confirmation invalide", 400);

      const { data: { user: authUser }, error } = await supabaseAuth.auth.getUser(accessToken);
      if (error || !authUser) throw new AppError("Lien de confirmation invalide ou expiré", 401);
      if (authUser.user_metadata?.role !== 'institution') throw new AppError("Ce compte n'est pas un compte institution", 400);
      if (!authUser.email_confirmed_at) throw new AppError("Adresse e-mail non confirmée", 403);

      await creerProfilInstitutionSiAbsent(authUser);

      const { data: user, error: userError } = await supabase
        .from("users").select("*").eq("auth_id", authUser.id).single();
      if (userError || !user) throw new AppError("Profil introuvable", 404);

      const { data: institution } = await supabase
        .from("institutions").select("*").eq("user_id", user.id).maybeSingle();

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, authId: authUser.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      res.json({
        message: "Compte confirmé",
        token,
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        institution: institution
          ? { id: institution.id, name: institution.name, user_id: institution.user_id, email: user.email, full_name: user.full_name }
          : null,
        pme: null,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("❌ Confirmation institution:", error);
      res.status(500).json({ error: "Impossible de finaliser la confirmation" });
    }
  },

  login: async (req: any, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;

      console.log('🔐 Login attempt:', { email, hasPassword: !!password });

      if (!email || !password) {
        throw new AppError("Email and password required", 400);
      }

      // 1. Authenticate with Supabase Auth.
      // Sur un client dedie : une connexion sur le client admin lui ferait
      // perdre ses droits service_role (voir lib/supabase.ts).
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.warn('⚠️  Authentication failed:', authError.message);
        if (authError.code === 'email_not_confirmed' || /email not confirmed/i.test(authError.message || '')) {
          return res.status(403).json({
            error: "Votre adresse e-mail n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail, ou demandez un nouvel envoi.",
            code: "EMAIL_NON_CONFIRME",
            email,
          });
        }
        throw new AppError("Invalid email or password", 401);
      }

      if (!authData.user) {
        throw new AppError("Authentication failed", 401);
      }

      // Première connexion après confirmation : on crée le profil institution
      await creerProfilInstitutionSiAbsent(authData.user);

      // 2. Get user profile from users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authData.user.id)
        .single();

      if (userError || !user) {
        console.error('❌ User profile not found:', userError);
        throw new AppError("User profile not found", 404);
      }

      console.log('✅ User authenticated:', { userId: user.id, email: user.email, role: user.role });

      // 3. Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, authId: authData.user.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      console.log('✅ Login successful:', { email, role: user.role });

      // 4. If institution, fetch institution details
      let institutionData = null;
      if (user.role === 'institution') {
        const { data: institution } = await supabase
          .from('institutions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (institution) {
          institutionData = {
            id: institution.id,
            name: institution.name,
            user_id: institution.user_id,
            email: user.email,
            full_name: user.full_name,
          };
        }
      }

      // 5. If PME, fetch PME details
      let pmeData = null;
      if (user.role === 'pme') {
        const { data: pme } = await supabase
          .from('pmes')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (pme) {
          pmeData = {
            id: pme.id,
            company_name: pme.company_name,
            user_id: pme.user_id,
            email: user.email,
            full_name: user.full_name,
            rccm_number: pme.rccm_number,
            nif_number: pme.nif_number,
            sector: pme.sector,
            activity_description: pme.activity_description,
          };
        }
      }

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        },
        institution: institutionData,
        pme: pmeData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('❌ Login error:', error);
      res.status(500).json({ error: "Login failed" });
    }
  },

  // Get current user
  getCurrentUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError("Not authenticated", 401);
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, role, full_name, is_active, created_at")
        .eq("id", req.user.id)
        .single();

      if (error || !user) {
        throw new AppError("User not found", 404);
      }

      res.json({ user });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  // Logout user
  logout: async (req: AuthRequest, res: Response) => {
    try {
      res.json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  },

  // Upload institution logo to Supabase Storage
  uploadLogo: async (req: any, res: Response) => {
    try {
      const file = req.files?.file;
      const fileName = req.body.fileName;

      if (!file) {
        throw new AppError("No file provided", 400);
      }

      if (!fileName) {
        throw new AppError("No fileName provided", 400);
      }

      // Upload to Supabase Storage in 'institution-logos' bucket
      const { data, error } = await supabase.storage
        .from('institution-logos')
        .upload(fileName, file.data, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw new AppError("Failed to upload logo", 500);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('institution-logos')
        .getPublicUrl(fileName);

      console.log('✅ Logo uploaded successfully:', publicUrl);

      res.json({ 
        logoUrl: publicUrl,
        message: 'Logo uploaded successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to upload logo" });
    }
  },
};
