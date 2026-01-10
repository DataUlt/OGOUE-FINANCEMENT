import { Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";
import { config } from "../config.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

export const authController = {
  // Register new user
  register: async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, fullName, role } = req.body;

      if (!email || !password || !role) {
        throw new AppError("Missing required fields", 400);
      }

      if (!["institution", "pme"].includes(role)) {
        throw new AppError("Invalid role", 400);
      }

      // Check if user already exists
      const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();
      if (existingUser) {
        throw new AppError("User already exists", 409);
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            email,
            password_hash: passwordHash,
            role,
            full_name: fullName || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (createError) {
        throw new AppError("Failed to create user", 500);
      }

      // Generate token
      const token = jwt.sign(
        {
          sub: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        config.jwt.secret,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          fullName: newUser.full_name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  },

  // Login
  login: async (req: AuthRequest, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError("Missing email or password", 400);
      }

      // Get user
      const { data: user, error: getUserError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (getUserError || !user) {
        throw new AppError("Invalid credentials", 401);
      }

      // Verify password
      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new AppError("Invalid credentials", 401);
      }

      // Generate token
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: "7d" }
      );

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
        },
        token,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  },

  // Get current user
  getCurrentUser: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError("Not authenticated", 401);
      }

      const { data: user, error } = await supabase.from("users").select("*").eq("id", req.user.id).single();

      if (error || !user) {
        throw new AppError("User not found", 404);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.status).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  // Logout
  logout: async (req: AuthRequest, res: Response) => {
    try {
      res.json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  },
};
