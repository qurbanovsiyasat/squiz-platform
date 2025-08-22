-- Migration: insert_default_categories_v2
-- Created at: 1754316809

-- Insert default categories for each type
INSERT INTO categories (name, type, description) VALUES
('General', 'quiz', 'General quiz topics'),
('Science', 'quiz', 'Science and technology quizzes'),
('Math', 'quiz', 'Mathematics quizzes'),
('History', 'quiz', 'History and social studies'),
('Language', 'quiz', 'Language learning and literature'),

('Feedback', 'form', 'General feedback forms'),
('Survey', 'form', 'Research and opinion surveys'),
('Registration', 'form', 'Event and service registrations'),
('Contact', 'form', 'Contact and inquiry forms'),
('Application', 'form', 'Job and program applications'),

('General Discussion', 'qa', 'General questions and answers'),
('Technical Help', 'qa', 'Technical support and troubleshooting'),
('Academic', 'qa', 'Academic questions and study help'),
('Announcements', 'qa', 'Platform announcements and updates'),
('Feature Requests', 'qa', 'Suggestions and feature requests')
ON CONFLICT (name, type) DO NOTHING;;