import dotenv from "dotenv";

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRole: process.env.SUPABASE_SERVICE_ROLE || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiration: "7d",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
  },
};

// Validate required environment variables
if (!config.supabase.url) {
  throw new Error("SUPABASE_URL environment variable is not set");
}
if (!config.supabase.serviceRole) {
  throw new Error("SUPABASE_SERVICE_ROLE environment variable is not set");
}
if (!config.supabase.anonKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is not set");
}
