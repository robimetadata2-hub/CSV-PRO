
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Check if the active_sessions table already exists
    const { data: tableExists, error: checkError } = await supabaseClient.from('active_sessions').select('id').limit(1);
    
    if (checkError && checkError.code !== 'PGRST116') {
      // Table doesn't exist, create it
      const setupSql = `
        -- Create functions for session management
        CREATE OR REPLACE FUNCTION public.check_active_session_by_email(p_email TEXT)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          session_exists BOOLEAN;
        BEGIN
          SELECT EXISTS (
            SELECT 1 FROM public.active_sessions
            WHERE user_email = p_email
          ) INTO session_exists;
          
          RETURN session_exists;
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.set_active_session(
          p_user_id UUID,
          p_email TEXT,
          p_session_id TEXT,
          p_activity_time TIMESTAMP WITH TIME ZONE
        )
        RETURNS VOID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Insert or update the session
          INSERT INTO public.active_sessions (user_id, user_email, session_identifier, last_activity)
          VALUES (p_user_id, p_email, p_session_id, p_activity_time)
          ON CONFLICT (user_id)
          DO UPDATE SET
            session_identifier = p_session_id,
            last_activity = p_activity_time;
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.remove_active_session(p_user_id UUID)
        RETURNS VOID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          DELETE FROM public.active_sessions WHERE user_id = p_user_id;
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.remove_active_session_by_email(p_email TEXT)
        RETURNS VOID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          DELETE FROM public.active_sessions WHERE user_email = p_email;
        END;
        $$;

        CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
        RETURNS INTEGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          removed INTEGER;
        BEGIN
          DELETE FROM public.active_sessions
          WHERE last_activity < (now() - interval '1 day')
          RETURNING COUNT(*) INTO removed;
          
          RETURN removed;
        END;
        $$;

        -- Add RLS policies to active_sessions table
        ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

        -- Create policy to allow users to read their own active session
        CREATE POLICY "Users can read their own active session" 
        ON public.active_sessions 
        FOR SELECT 
        USING (auth.uid() = user_id);

        -- Create policy to allow users to update their own active session
        CREATE POLICY "Users can update their own active session" 
        ON public.active_sessions 
        FOR UPDATE 
        USING (auth.uid() = user_id);

        -- Create policy to allow users to delete their own active session
        CREATE POLICY "Users can delete their own active session" 
        ON public.active_sessions 
        FOR DELETE 
        USING (auth.uid() = user_id);

        -- Create policy to allow service role to manage all active sessions
        CREATE POLICY "Service role can manage all active sessions" 
        ON public.active_sessions 
        USING (auth.role() = 'service_role');
      `;

      const { error: setupError } = await supabaseClient.rpc("pg_execute", { command: setupSql });

      if (setupError) throw setupError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
