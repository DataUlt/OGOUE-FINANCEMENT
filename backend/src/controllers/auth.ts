import { Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import type { RegisterRequest, LoginRequest, AuthResponse } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRATION = "7d";

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
      if (!full_name && (firstName || lastName)) {
        full_name = `${firstName || ''} ${lastName || ''}`.trim();
        role = 'pme'; // If using new format, it's PME
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

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for now
      });

      if (authError) {
        console.error('❌ Auth user creation error:', authError);
        throw new AppError("Email already exists or invalid input", 400);
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

  // Login user
  login: async (req: any, res: Response) => {
    try {
      const { email, password }: LoginRequest = req.body;

      console.log('🔐 Login attempt:', { email, hasPassword: !!password });

      if (!email || !password) {
        throw new AppError("Email and password required", 400);
      }

      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.warn('⚠️  Authentication failed:', authError.message);
        throw new AppError("Invalid email or password", 401);
      }

      if (!authData.user) {
        throw new AppError("Authentication failed", 401);
      }

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
