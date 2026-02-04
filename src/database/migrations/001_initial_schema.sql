   -- TSL Database Schema for PostgreSQL with PostGIS
-- Run this script on Supabase or any PostgreSQL database with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin');
CREATE TYPE sign_type AS ENUM ('regulatory', 'warning', 'informational');
CREATE TYPE sign_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE submission_action AS ENUM ('add', 'update', 'remove');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');
CREATE TYPE transaction_type AS ENUM ('earn', 'spend', 'topup');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    coin_balance INTEGER DEFAULT 20 NOT NULL,
    reputation_score DECIMAL(5,4) DEFAULT 0.5 NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traffic signs table with PostGIS geometry
CREATE TABLE traffic_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type sign_type NOT NULL,
    label VARCHAR(200) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    image_url VARCHAR(500),
    status sign_status DEFAULT 'pending' NOT NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traffic_sign_id UUID REFERENCES traffic_signs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    action submission_action NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    status sign_status DEFAULT 'pending' NOT NULL,
    approval_percentage DECIMAL(5,2) DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vote_type vote_type NOT NULL,
    weight DECIMAL(5,4) DEFAULT 1.0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, user_id)
);

-- Coin transactions table
CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    type transaction_type NOT NULL,
    reason VARCHAR(200) NOT NULL,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index for efficient geospatial queries
CREATE INDEX idx_traffic_signs_location ON traffic_signs USING GIST(location);

-- Create other useful indexes
CREATE INDEX idx_traffic_signs_status ON traffic_signs(status);
CREATE INDEX idx_traffic_signs_type ON traffic_signs(type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_deadline ON submissions(deadline);
CREATE INDEX idx_votes_submission ON votes(submission_id);
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_signs_updated_at BEFORE UPDATE ON traffic_signs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
