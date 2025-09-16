-- Function to increment prompt usage count
CREATE OR REPLACE FUNCTION increment_prompt_usage(prompt_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE prompts 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = prompt_id;
END;
$$ LANGUAGE plpgsql;
