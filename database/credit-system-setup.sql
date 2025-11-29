-- Add credit system and paid plan interest tracking to PostgreSQL
-- Run this after the main postgres-setup.sql

-- Create paid_plan_interest table
CREATE TABLE IF NOT EXISTS paid_plan_interest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References the Supabase user ID
    user_email VARCHAR,
    user_name VARCHAR,
    interested_in_paid_plan BOOLEAN NOT NULL DEFAULT false,
    budget_range VARCHAR(50) CHECK (budget_range IN ('1000_2500', '2500_5000', '5000_10000')),
    current_usage_frequency VARCHAR(50) CHECK (current_usage_frequency IN ('daily', 'weekly', 'monthly', 'occasional')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_paid_plan_interest_user_id ON paid_plan_interest(user_id);
CREATE INDEX IF NOT EXISTS idx_paid_plan_interest_interested ON paid_plan_interest(interested_in_paid_plan);
CREATE INDEX IF NOT EXISTS idx_paid_plan_interest_submitted_at ON paid_plan_interest(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_plan_interest_email ON paid_plan_interest(user_email);

-- Create updated_at trigger for paid_plan_interest
CREATE TRIGGER update_paid_plan_interest_updated_at
    BEFORE UPDATE ON paid_plan_interest
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (if using Supabase, adjust as needed)
-- GRANT ALL ON paid_plan_interest TO authenticated;
-- GRANT ALL ON paid_plan_interest TO anon;