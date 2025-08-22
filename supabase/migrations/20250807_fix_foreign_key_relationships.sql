-- Fix Foreign Key Relationships Migration
-- Date: 2025-08-07
-- Fixes: Add proper foreign key constraints and ensure database schema integrity

-- 1. Ensure users table exists and has proper structure
DO $$
BEGIN
    -- Check if users table exists in public schema, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        CREATE TABLE public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'student',
            is_private BOOLEAN DEFAULT FALSE,
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_users_email ON public.users(email);
        CREATE INDEX idx_users_role ON public.users(role);
        
        RAISE NOTICE 'Created users table in public schema';
    END IF;
END $$;

-- 2. Create a view that syncs with auth.users for forms relationships
CREATE OR REPLACE VIEW public.users_for_forms AS
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Anonymous') as full_name,
    COALESCE(au.raw_user_meta_data->>'role', 'student') as role,
    COALESCE((au.raw_user_meta_data->>'is_private')::boolean, false) as is_private,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.raw_user_meta_data->>'bio' as bio,
    au.created_at,
    au.updated_at
FROM auth.users au;

-- 3. Fix forms table foreign key relationship
DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'forms_creator_id_fkey' 
        AND table_name = 'forms'
    ) THEN
        ALTER TABLE forms DROP CONSTRAINT forms_creator_id_fkey;
    END IF;
    
    -- Add proper foreign key constraint referencing auth.users
    ALTER TABLE forms 
    ADD CONSTRAINT forms_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for forms.creator_id';
END $$;

-- 4. Fix quizzes table foreign key relationship
DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quizzes_creator_id_fkey' 
        AND table_name = 'quizzes'
    ) THEN
        ALTER TABLE quizzes DROP CONSTRAINT quizzes_creator_id_fkey;
    END IF;
    
    -- Add proper foreign key constraint referencing auth.users
    ALTER TABLE quizzes 
    ADD CONSTRAINT quizzes_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for quizzes.creator_id';
END $$;

-- 5. Fix qa_questions table foreign key relationship
DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'qa_questions_author_id_fkey' 
        AND table_name = 'qa_questions'
    ) THEN
        ALTER TABLE qa_questions DROP CONSTRAINT qa_questions_author_id_fkey;
    END IF;
    
    -- Add proper foreign key constraint referencing auth.users
    ALTER TABLE qa_questions 
    ADD CONSTRAINT qa_questions_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint for qa_questions.author_id';
END $$;

-- 6. Fix other user-related foreign keys
DO $$
BEGIN
    -- Form likes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_likes') THEN
        -- Drop existing foreign key if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'form_likes_user_id_fkey' 
            AND table_name = 'form_likes'
        ) THEN
            ALTER TABLE form_likes DROP CONSTRAINT form_likes_user_id_fkey;
        END IF;
        
        ALTER TABLE form_likes 
        ADD CONSTRAINT form_likes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Quiz attempts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_attempts') THEN
        -- Drop existing foreign key if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'quiz_attempts_user_id_fkey' 
            AND table_name = 'quiz_attempts'
        ) THEN
            ALTER TABLE quiz_attempts DROP CONSTRAINT quiz_attempts_user_id_fkey;
        END IF;
        
        ALTER TABLE quiz_attempts 
        ADD CONSTRAINT quiz_attempts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Form submissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_submissions') THEN
        -- Drop existing foreign key if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'form_submissions_user_id_fkey' 
            AND table_name = 'form_submissions'
        ) THEN
            ALTER TABLE form_submissions DROP CONSTRAINT form_submissions_user_id_fkey;
        END IF;
        
        ALTER TABLE form_submissions 
        ADD CONSTRAINT form_submissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    RAISE NOTICE 'Updated all user-related foreign key constraints';
END $$;

-- 7. Grant proper permissions
GRANT SELECT ON public.users_for_forms TO authenticated;
GRANT SELECT ON public.users_for_forms TO anon;

-- 8. Create function to sync auth.users with public.users if needed
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user in public.users table
    INSERT INTO public.users (
        id, email, full_name, role, is_private, avatar_url, bio, created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'bio',
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous'),
        role = COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        is_private = COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false),
        avatar_url = NEW.raw_user_meta_data->>'avatar_url',
        bio = NEW.raw_user_meta_data->>'bio',
        updated_at = NEW.updated_at;
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to auto-sync users
DROP TRIGGER IF EXISTS trigger_sync_auth_user ON auth.users;
CREATE TRIGGER trigger_sync_auth_user
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_auth_user_to_public();

-- 10. Initial sync of existing auth.users to public.users
INSERT INTO public.users (id, email, full_name, role, is_private, avatar_url, bio, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', 'Anonymous'),
    COALESCE(raw_user_meta_data->>'role', 'student'),
    COALESCE((raw_user_meta_data->>'is_private')::boolean, false),
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'bio',
    created_at,
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Foreign key relationships and user synchronization setup completed';
