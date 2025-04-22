-- Enable read access for project members and owners
CREATE POLICY "Read access for project members and owners"
ON projects
FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM project_members pm 
    WHERE pm.project_id = id 
    AND pm.user_id = auth.uid()
  )
);

-- Enable insert for authenticated users
CREATE POLICY "Insert access for authenticated users"
ON projects
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Enable update for project owners
CREATE POLICY "Update access for project owners"
ON projects
FOR UPDATE
USING (created_by = auth.uid());

-- Enable delete for project owners
CREATE POLICY "Delete access for project owners"
ON projects
FOR DELETE
USING (created_by = auth.uid()); 