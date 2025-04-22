-- Drop existing policies first
DROP POLICY IF EXISTS "Project members can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can insert project members if they are project owners" ON project_members;
DROP POLICY IF EXISTS "Project owners can update project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can delete project members" ON project_members;

-- Enable read access for project members and project owners
CREATE POLICY "Read access for project members and owners"
ON project_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = project_members.project_id
    AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 
        FROM project_members pm 
        WHERE pm.project_id = project_members.project_id 
        AND pm.user_id = auth.uid()
      )
    )
  )
);

-- Enable insert for project owners only
CREATE POLICY "Insert access for project owners"
ON project_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  )
);

-- Enable update for project owners only
CREATE POLICY "Update access for project owners"
ON project_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  )
);

-- Enable delete for project owners only
CREATE POLICY "Delete access for project owners"
ON project_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = project_members.project_id 
    AND p.created_by = auth.uid()
  )
); 