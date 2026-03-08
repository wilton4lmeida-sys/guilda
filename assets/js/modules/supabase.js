import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://rsittecjptwozwxlnfvy.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzaXR0ZWNqcHR3b3p3eGxuZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Nzc5MTQsImV4cCI6MjA4ODI1MzkxNH0.E0wFpLYcAAzLXqMUWGFHMmTBjC0dB6zC9XJsl5caji8';
export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
