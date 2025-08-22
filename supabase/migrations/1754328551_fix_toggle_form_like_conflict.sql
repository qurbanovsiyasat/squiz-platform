-- Migration: fix_toggle_form_like_conflict
-- Created at: 1754328551

-- Migration: fix_toggle_form_like_conflict
-- Drop conflicting functions and keep correct version

-- Drop the old version with form_id_param and user_id_param
DROP FUNCTION IF EXISTS toggle_form_like(form_id_param UUID, user_id_param UUID);

-- The correct version with p_form_id should remain:
-- toggle_form_like(p_form_id UUID) RETURNS TABLE(liked BOOLEAN, total_likes INTEGER)

-- Let's also make sure the categories table has proper default data
-- Insert default categories if they don't exist
INSERT INTO categories (name, type, description) VALUES
-- Q&A Categories
('Riyaziyyat', 'qa', 'Riyaziyyat mövzularında suallar'),
('Fizika', 'qa', 'Fizika mövzularında suallar'),
('Kimya', 'qa', 'Kimya mövzularında suallar'),
('İnformatika', 'qa', 'İnformatika və proqramlaşdırma sualları'),
('Biologiya', 'qa', 'Biologiya mövzularında suallar'),
('Ümumi', 'qa', 'Ümumi suallar')
ON CONFLICT (name, type) DO NOTHING;

INSERT INTO categories (name, type, description) VALUES
-- Form Categories  
('Qeydiyyat Formaları', 'form', 'Qeydiyyat və müraciət formaları'),
('Sorğu Formaları', 'form', 'Rəy və sorğu formaları'),
('Test Formaları', 'form', 'Test və qiymətləndirmə formaları'),
('Əlaqə Formaları', 'form', 'Əlaqə və dəstək formaları'),
('Qiymətləndirmə', 'form', 'Qiymətləndirmə formaları'),
('Müsabiqə', 'form', 'Müsabiqə formaları')
ON CONFLICT (name, type) DO NOTHING;

INSERT INTO categories (name, type, description) VALUES
-- Quiz Categories
('Riyaziyyat Testləri', 'quiz', 'Riyaziyyat üzrə test sualları'),
('Fizika Testləri', 'quiz', 'Fizika üzrə test sualları'), 
('Kimya Testləri', 'quiz', 'Kimya üzrə test sualları'),
('İnformatika Testləri', 'quiz', 'İnformatika üzrə test sualları'),
('Biologiya Testləri', 'quiz', 'Biologiya üzrə test sualları'),
('Ümumi Bilik', 'quiz', 'Ümumi bilik testləri')
ON CONFLICT (name, type) DO NOTHING;;