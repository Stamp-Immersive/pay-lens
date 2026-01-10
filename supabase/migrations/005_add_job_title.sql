-- Add job_title column to employee_details
-- This stores the employee's job title/role (e.g., "Senior Developer", "Product Manager")
-- Stored per-organization since someone could have different titles at different orgs

ALTER TABLE employee_details
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);

-- Add index for potential filtering by job title
CREATE INDEX IF NOT EXISTS idx_employee_details_job_title ON employee_details(job_title);
