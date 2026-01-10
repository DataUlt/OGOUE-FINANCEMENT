import { Response } from "express";
import bcryptjs from "bcryptjs";
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
      const { email, password, user_type, full_name, institution_name, pme_name, pme_data, institution_data } = req.body;

      const role = user_type || 'institution'; // Default to institution
      console.log('📝 Register request:', { email, role, institution_name, pme_name, full_name, institution_data });

      // Validation
      if (!email || !password || !full_name) {
        throw new AppError("Email, password, and full_name are required", 400);
      }

      if (role === 'institution' && !institution_name) {
        throw new AppError("institution_name is required for institution registration", 400);
      }

      if (role === 'pme' && !pme_name) {
        throw new AppError("pme_name is required for PME registration", 400);
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);
      const userId = uuidv4();

      // 1. Create user
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email,
        password_hash: hashedPassword,
        role,
        full_name,
        is_active: true,
      });

      if (userError) {
        console.error('❌ User insert error:', userError);
        throw new AppError("Email already exists or invalid input", 400);
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

      // 4. Generate JWT token
      const token = jwt.sign(
        { userId, email, role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      console.log('✅ Registration successful:', { userId, email, role });

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

      if (!email || !password) {
        throw new AppError("Email and password required", 400);
      }

      // Get user
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new AppError("Invalid email or password", 401);
      }

      // Verify password
      const isValidPassword = await bcryptjs.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new AppError("Invalid email or password", 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      console.log('✅ Login successful:', { email, role: user.role });

      // If institution, fetch institution details
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
