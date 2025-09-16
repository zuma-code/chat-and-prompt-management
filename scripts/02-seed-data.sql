-- Insert default prompt categories
INSERT INTO prompt_categories (name, description, color) VALUES
  ('Development', 'Prompts for coding and development tasks', '#3b82f6'),
  ('Writing', 'Content creation and writing assistance', '#10b981'),
  ('Analysis', 'Data analysis and research prompts', '#f59e0b'),
  ('Creative', 'Creative and brainstorming prompts', '#8b5cf6'),
  ('Debugging', 'Code debugging and troubleshooting', '#ef4444'),
  ('Documentation', 'Technical documentation and explanations', '#6b7280')
ON CONFLICT DO NOTHING;

-- Insert sample prompts (these will be available to all users)
INSERT INTO prompts (user_id, category_id, title, content, description, tags, is_public) VALUES
  (
    NULL,
    (SELECT id FROM prompt_categories WHERE name = 'Development'),
    'Code Review Assistant',
    'Please review the following code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance optimizations\n4. Security considerations\n\nCode:\n{code}',
    'Comprehensive code review with focus on quality, security, and performance',
    ARRAY['code-review', 'development', 'best-practices'],
    TRUE
  ),
  (
    NULL,
    (SELECT id FROM prompt_categories WHERE name = 'Debugging'),
    'Debug Helper',
    'I''m encountering an error in my code. Here''s the error message and relevant code:\n\nError: {error}\n\nCode:\n{code}\n\nPlease help me:\n1. Understand what''s causing the error\n2. Provide a solution\n3. Explain how to prevent similar issues',
    'Step-by-step debugging assistance with explanations',
    ARRAY['debugging', 'error-solving', 'troubleshooting'],
    TRUE
  ),
  (
    NULL,
    (SELECT id FROM prompt_categories WHERE name = 'Documentation'),
    'API Documentation Generator',
    'Generate comprehensive API documentation for the following function/endpoint:\n\n{code}\n\nInclude:\n- Description of functionality\n- Parameters and their types\n- Return values\n- Example usage\n- Error handling',
    'Creates detailed API documentation with examples',
    ARRAY['documentation', 'api', 'technical-writing'],
    TRUE
  ),
  (
    NULL,
    (SELECT id FROM prompt_categories WHERE name = 'Creative'),
    'Feature Brainstorming',
    'I''m working on {project_description}. Help me brainstorm innovative features that would:\n1. Improve user experience\n2. Add unique value\n3. Differentiate from competitors\n\nConsider current trends and user needs in this domain.',
    'Generate creative feature ideas for projects',
    ARRAY['brainstorming', 'features', 'innovation'],
    TRUE
  )
ON CONFLICT DO NOTHING;
