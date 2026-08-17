import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabase.url, config.supabase.serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ============================================================
// Client dedie aux operations de CONNEXION
// ------------------------------------------------------------
// signInWithPassword() attache une session au client sur lequel il est
// appele. Or supabase-js resout le jeton de chaque requete base ainsi :
//
//   const { data } = await this.auth.getSession();
//   return data.session?.access_token ?? this.supabaseKey;
//
// Autrement dit, des qu'un utilisateur se connecte, le client admin
// cesse d'utiliser la cle service_role et execute toutes les requetes
// suivantes avec le jeton de CET utilisateur, jusqu'au redemarrage du
// serveur. Les tables sans RLS ne le montrent pas, mais loan_applications
// est protegee par RLS sans politique publique : elle renvoie alors zero
// ligne, en silence. C'est ce qui rendait les dossiers invisibles cote
// institution des qu'une connexion avait eu lieu.
//
// On isole donc la connexion sur un client separe, comme le fait deja le
// depot OGOUE (voir backend/src/db/supabase.js).
// ============================================================
export const supabaseAuth = createClient(config.supabase.url, config.supabase.serviceRole, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabasePublic = createClient(config.supabase.url, config.supabase.anonKey);
