-- Tenant-aware Storage policies for private organization assets and user avatars.

-- Organization assets: only active users assigned to the matching Yayasan
-- may read or manage objects under organization-assets/<yayasan_id>/.
CREATE POLICY organization_assets_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND private.can_access_yayasan((storage.foldername(name))[1])
  );

CREATE POLICY organization_assets_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND private.can_manage_yayasan((storage.foldername(name))[1])
  );

CREATE POLICY organization_assets_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND private.can_manage_yayasan((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'organization-assets'
    AND private.can_manage_yayasan((storage.foldername(name))[1])
  );

CREATE POLICY organization_assets_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-assets'
    AND private.can_manage_yayasan((storage.foldername(name))[1])
  );

-- Avatars: active users may read their own avatar and Admin may read avatars.
CREATE POLICY user_avatars_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR private.is_admin()
    )
  );

CREATE POLICY user_avatars_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY user_avatars_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY user_avatars_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );