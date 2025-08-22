-- Migration: create_likes_views_functions
-- Created at: 1754327818

-- Migration: create_likes_views_functions
-- Created at: 1754316931
-- Create functions for like and view system

-- RLS Policies for form_likes
CREATE POLICY "Anyone can view form likes" ON form_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own form likes" ON form_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for form_views
CREATE POLICY "Anyone can view form view counts" ON form_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create form views" ON form_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for qa_likes
CREATE POLICY "Anyone can view qa likes" ON qa_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own qa likes" ON qa_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for qa_views
CREATE POLICY "Anyone can view qa view counts" ON qa_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create qa views" ON qa_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_likes
CREATE POLICY "Anyone can view quiz likes" ON quiz_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own quiz likes" ON quiz_likes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quiz_views
CREATE POLICY "Anyone can view quiz view counts" ON quiz_views
    FOR SELECT USING (true);

CREATE POLICY "Users can create quiz views" ON quiz_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to toggle form like
CREATE OR REPLACE FUNCTION toggle_form_like(p_form_id UUID)
RETURNS TABLE(liked BOOLEAN, total_likes INTEGER) AS $$
DECLARE
    user_liked BOOLEAN;
    like_count INTEGER;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Check if user already liked this form
    SELECT EXISTS(
        SELECT 1 FROM form_likes 
        WHERE form_id = p_form_id AND user_id = auth.uid()
    ) INTO user_liked;
    
    IF user_liked THEN
        -- Remove like
        DELETE FROM form_likes 
        WHERE form_id = p_form_id AND user_id = auth.uid();
        user_liked := FALSE;
    ELSE
        -- Add like
        INSERT INTO form_likes (form_id, user_id) 
        VALUES (p_form_id, auth.uid())
        ON CONFLICT (form_id, user_id) DO NOTHING;
        user_liked := TRUE;
    END IF;
    
    -- Get total likes count
    SELECT COUNT(*) INTO like_count 
    FROM form_likes 
    WHERE form_id = p_form_id;
    
    RETURN QUERY SELECT user_liked, like_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record form view
CREATE OR REPLACE FUNCTION record_form_view(
    p_form_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Insert view record (or ignore if already exists for this user)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO form_views (form_id, user_id, ip_address, user_agent)
        VALUES (p_form_id, auth.uid(), p_ip_address, p_user_agent)
        ON CONFLICT (form_id, user_id) DO NOTHING;
    END IF;
    
    -- Get total unique views count
    SELECT COUNT(*) INTO view_count 
    FROM form_views 
    WHERE form_id = p_form_id;
    
    RETURN view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get form stats (likes and views)
CREATE OR REPLACE FUNCTION get_form_stats(p_form_id UUID)
RETURNS TABLE(
    total_likes INTEGER,
    total_views INTEGER,
    user_liked BOOLEAN
) AS $$
DECLARE
    like_count INTEGER;
    view_count INTEGER;
    user_has_liked BOOLEAN := FALSE;
BEGIN
    -- Get likes count
    SELECT COUNT(*) INTO like_count 
    FROM form_likes 
    WHERE form_id = p_form_id;
    
    -- Get views count
    SELECT COUNT(*) INTO view_count 
    FROM form_views 
    WHERE form_id = p_form_id;
    
    -- Check if current user liked this form
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM form_likes 
            WHERE form_id = p_form_id AND user_id = auth.uid()
        ) INTO user_has_liked;
    END IF;
    
    RETURN QUERY SELECT like_count, view_count, user_has_liked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;