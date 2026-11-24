CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE
    CHECK (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  full_name text NOT NULL
    CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
  role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'supervisor', 'user')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected')),
  yayasan_id text REFERENCES public.yayasan(id) ON DELETE RESTRICT,
  access_revoked_at timestamptz,
  banned_until timestamptz,
  eula_version text,
  eula_accepted_at timestamptz,
  avatar_data bytea,
  avatar_mime_type text
    CHECK (
      avatar_mime_type IS NULL OR
      avatar_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role = 'admin' OR status <> 'active' OR yayasan_id IS NOT NULL),
  CHECK ((eula_version IS NULL) = (eula_accepted_at IS NULL)),
  CHECK (
    (avatar_data IS NULL AND avatar_mime_type IS NULL) OR
    (avatar_data IS NOT NULL AND avatar_mime_type IS NOT NULL AND
      length(avatar_data) BETWEEN 1 AND 5242880)
  )
);

CREATE INDEX user_profiles_yayasan_role_status_idx
  ON public.user_profiles (yayasan_id, role, status);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_suffix text := substr(replace(NEW.id::text, '-', ''), 1, 8);
  v_username text;
  v_full_name text;
BEGIN
  IF NEW.email IS NULL THEN
    RAISE EXCEPTION 'Email is required for application accounts';
  END IF;

  v_username := regexp_replace(
    lower(coalesce(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))),
    '[^a-z0-9._-]',
    '',
    'g'
  );
  IF v_username !~ '^[a-z0-9]' THEN
    v_username := 'u' || v_username;
  END IF;
  IF length(v_username) < 3 THEN
    v_username := 'user';
  END IF;
  v_username := left(v_username, 32);
  IF EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.username = v_username
  ) THEN
    v_username := left(v_username, 23) || '-' || v_suffix;
  END IF;

  v_full_name := left(
    coalesce(
      nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(NEW.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(split_part(NEW.email, '@', 1)), ''),
      'User'
    ),
    100
  );
  IF length(trim(v_full_name)) < 2 THEN
    v_full_name := 'User';
  END IF;

  INSERT INTO public.user_profiles (
    user_id,
    email,
    username,
    full_name,
    role,
    status,
    eula_version,
    eula_accepted_at
  )
  VALUES (
    NEW.id,
    lower(NEW.email),
    v_username,
    v_full_name,
    'user',
    'pending',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'eula_accepted' = 'true'
        THEN nullif(NEW.raw_user_meta_data ->> 'eula_version', '')
      ELSE NULL
    END,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'eula_accepted' = 'true'
        AND nullif(NEW.raw_user_meta_data ->> 'eula_version', '') IS NOT NULL
        THEN now()
      ELSE NULL
    END
  );

  RETURN NEW;
END;
$$;

CREATE FUNCTION private.sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.user_profiles
    SET email = lower(NEW.email), updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION private.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.status = 'active'
      AND p.access_revoked_at IS NULL
      AND (p.banned_until IS NULL OR p.banned_until <= now())
  );
$$;

CREATE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.role = 'admin'
      AND p.status = 'active'
      AND p.access_revoked_at IS NULL
      AND (p.banned_until IS NULL OR p.banned_until <= now())
  );
$$;

CREATE FUNCTION private.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.user_profiles p
  WHERE p.user_id = (SELECT auth.uid())
    AND p.status = 'active'
    AND p.access_revoked_at IS NULL
    AND (p.banned_until IS NULL OR p.banned_until <= now());
$$;

CREATE FUNCTION private.current_yayasan_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.yayasan_id
  FROM public.user_profiles p
  WHERE p.user_id = (SELECT auth.uid())
    AND p.status = 'active'
    AND p.access_revoked_at IS NULL
    AND (p.banned_until IS NULL OR p.banned_until <= now());
$$;

CREATE FUNCTION private.has_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role = private.current_role()
      AND CASE p_permission
        WHEN 'directory' THEN rp.can_manage_directory = 1
        WHEN 'assets' THEN rp.can_manage_assets = 1
        WHEN 'maintenance' THEN rp.can_manage_maintenance = 1
        ELSE false
      END
  );
$$;

CREATE FUNCTION private.has_page_access(p_page text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR EXISTS (
    SELECT 1
    FROM public.role_page_permissions rp
    WHERE rp.role = private.current_role()
      AND rp.page = p_page
      AND rp.can_access = 1
  );
$$;

CREATE FUNCTION private.can_access_yayasan(p_yayasan_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND p_yayasan_id IS NOT NULL
    AND p_yayasan_id = private.current_yayasan_id()
  );
$$;

CREATE FUNCTION private.can_access_sppg(p_sppg_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND p_sppg_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sppg s
      WHERE s.id = p_sppg_id
        AND s.yayasan_id = private.current_yayasan_id()
    )
  );
$$;

CREATE FUNCTION private.can_read_asset_sppg(p_sppg_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.can_access_sppg(p_sppg_id)
    AND (
      private.has_page_access('asset-recording')
      OR private.has_page_access('asset-non-juknis')
      OR private.has_page_access('asset-surat-edaran')
      OR private.has_page_access('asset-completeness')
      OR private.has_page_access('maintenance')
    )
  );
$$;

CREATE FUNCTION private.can_manage_yayasan(p_yayasan_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.can_access_yayasan(p_yayasan_id)
    AND private.has_permission('directory')
    AND private.has_page_access('directory')
  );
$$;

CREATE FUNCTION private.can_manage_page(
  p_sppg_id text,
  p_permission text,
  p_page text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.can_access_sppg(p_sppg_id)
    AND private.has_permission(p_permission)
    AND (
      private.has_page_access(p_page)
      OR (
        p_permission = 'assets'
        AND private.has_page_access('asset-completeness')
      )
    )
  );
$$;

CREATE FUNCTION private.can_access_maintenance_schedule(p_schedule_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND private.has_page_access('maintenance')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_schedule ms
      WHERE ms.id = p_schedule_id
        AND private.can_access_sppg(ms.sppg_id)
    )
  );
$$;

CREATE FUNCTION private.can_manage_maintenance_schedule(p_sppg_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.can_access_sppg(p_sppg_id)
    AND private.has_permission('maintenance')
    AND private.has_page_access('maintenance')
  );
$$;

CREATE FUNCTION private.can_access_rab(p_rab_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND private.has_page_access('maintenance')
    AND EXISTS (
      SELECT 1
      FROM public.rab_proposal r
      WHERE r.id = p_rab_id
        AND private.can_access_sppg(r.sppg_id)
    )
  );
$$;

CREATE FUNCTION private.can_manage_rab(p_sppg_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.can_access_sppg(p_sppg_id)
    AND private.has_permission('maintenance')
    AND private.has_page_access('maintenance')
  );
$$;

CREATE FUNCTION private.can_access_maintenance_assignee(p_assignee_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND private.has_page_access('maintenance')
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_schedule_assignee msa
      WHERE msa.assignee_id = p_assignee_id
        AND private.can_access_maintenance_schedule(msa.schedule_id)
    )
  );
$$;

CREATE FUNCTION private.can_access_warehouse_item(p_item_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND private.has_page_access('warehouse')
    AND EXISTS (
      SELECT 1
      FROM public.warehouse_asset_allocation waa
      WHERE waa.item_id = p_item_id
        AND private.can_access_sppg(waa.sppg_id)
    )
  );
$$;

CREATE FUNCTION private.can_access_allocation_movement(
  p_movement_type text,
  p_from_sppg_id text,
  p_to_sppg_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_admin() OR (
    private.is_active_user()
    AND private.has_page_access('warehouse')
    AND CASE p_movement_type
      WHEN 'allocate' THEN p_from_sppg_id IS NULL
        AND private.can_access_sppg(p_to_sppg_id)
      WHEN 'return' THEN p_to_sppg_id IS NULL
        AND private.can_access_sppg(p_from_sppg_id)
      WHEN 'transfer' THEN private.can_access_sppg(p_from_sppg_id)
        AND private.can_access_sppg(p_to_sppg_id)
      ELSE false
    END
  );
$$;

CREATE FUNCTION private.protect_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (SELECT auth.uid()) = OLD.user_id AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.email IS DISTINCT FROM OLD.email OR
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.yayasan_id IS DISTINCT FROM OLD.yayasan_id OR
    NEW.access_revoked_at IS DISTINCT FROM OLD.access_revoked_at OR
    NEW.banned_until IS DISTINCT FROM OLD.banned_until OR
    NEW.eula_version IS DISTINCT FROM OLD.eula_version OR
    NEW.eula_accepted_at IS DISTINCT FROM OLD.eula_accepted_at OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Users cannot change authorization or account status fields';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_user_profile_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_auth_user();

CREATE TRIGGER auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.sync_auth_user_email();

CREATE TRIGGER protect_user_profile_update
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_profile_update();

WITH auth_users AS (
  SELECT
    u.id,
    lower(u.email) AS email,
    CASE
      WHEN raw.username !~ '^[a-z0-9]'
        THEN 'u' || raw.username
      ELSE raw.username
    END AS username_candidate,
    left(
      coalesce(
        nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
        nullif(trim(split_part(u.email, '@', 1)), ''),
        'User'
      ),
      100
    ) AS full_name,
    u.raw_user_meta_data
  FROM auth.users u
  CROSS JOIN LATERAL (
    SELECT regexp_replace(
      lower(coalesce(
        nullif(u.raw_user_meta_data ->> 'username', ''),
        split_part(u.email, '@', 1)
      )),
      '[^a-z0-9._-]',
      '',
      'g'
    ) AS username
  ) raw
  WHERE u.email IS NOT NULL
),
normalized_users AS (
  SELECT
    id,
    email,
    CASE
      WHEN length(username_candidate) < 3 THEN 'user'
      ELSE left(username_candidate, 32)
    END AS username,
    CASE
      WHEN length(trim(full_name)) < 2 THEN 'User'
      ELSE full_name
    END AS full_name,
    raw_user_meta_data
  FROM auth_users
),
deduplicated_users AS (
  SELECT
    id,
    email,
    CASE
      WHEN count(*) OVER (PARTITION BY username) > 1
        THEN left(username, 23) || '-' || substr(replace(id::text, '-', ''), 1, 8)
      ELSE username
    END AS username,
    full_name,
    raw_user_meta_data
  FROM normalized_users
)
INSERT INTO public.user_profiles (
  user_id,
  email,
  username,
  full_name,
  eula_version,
  eula_accepted_at
)
SELECT
  id,
  email,
  username,
  full_name,
  CASE
    WHEN raw_user_meta_data ->> 'eula_accepted' = 'true'
      THEN nullif(raw_user_meta_data ->> 'eula_version', '')
    ELSE NULL
  END,
  CASE
    WHEN raw_user_meta_data ->> 'eula_accepted' = 'true'
      AND nullif(raw_user_meta_data ->> 'eula_version', '') IS NOT NULL
      THEN now()
    ELSE NULL
  END
FROM deduplicated_users
ON CONFLICT (user_id) DO NOTHING;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.user_profiles TO authenticated;

CREATE POLICY user_profiles_select
  ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin());
CREATE POLICY user_profiles_update_self
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'active')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'active');
CREATE POLICY user_profiles_update_admin
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (private.is_admin() AND user_id <> (SELECT auth.uid()))
  WITH CHECK (private.is_admin() AND user_id <> (SELECT auth.uid()));

CREATE POLICY role_permissions_select
  ON public.role_permissions FOR SELECT TO authenticated
  USING (
    private.is_active_user()
    AND (private.is_admin() OR role = private.current_role())
  );
CREATE POLICY role_permissions_admin
  ON public.role_permissions FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY role_page_permissions_select
  ON public.role_page_permissions FOR SELECT TO authenticated
  USING (
    private.is_active_user()
    AND (private.is_admin() OR role = private.current_role())
  );
CREATE POLICY role_page_permissions_admin
  ON public.role_page_permissions FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY yayasan_select
  ON public.yayasan FOR SELECT TO authenticated
  USING (private.can_access_yayasan(id));
CREATE POLICY yayasan_manage
  ON public.yayasan FOR ALL TO authenticated
  USING (private.can_manage_yayasan(id))
  WITH CHECK (private.can_manage_yayasan(id));

CREATE POLICY sppg_select
  ON public.sppg FOR SELECT TO authenticated
  USING (private.can_access_yayasan(yayasan_id));
CREATE POLICY sppg_manage
  ON public.sppg FOR ALL TO authenticated
  USING (
    private.is_admin() OR
    private.can_manage_yayasan(yayasan_id)
  )
  WITH CHECK (
    private.is_admin() OR
    private.can_manage_yayasan(yayasan_id)
  );

CREATE POLICY asset_inventory_select
  ON public.asset_inventory FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY asset_inventory_manage
  ON public.asset_inventory FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-recording'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-recording'));

CREATE POLICY vehicle_inventory_select
  ON public.vehicle_inventory FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY vehicle_inventory_manage
  ON public.vehicle_inventory FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-recording'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-recording'));

CREATE POLICY sppg_gas_installation_select
  ON public.sppg_gas_installation FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY sppg_gas_installation_manage
  ON public.sppg_gas_installation FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-recording'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-recording'));

CREATE POLICY sppg_electrical_installation_select
  ON public.sppg_electrical_installation FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY sppg_electrical_installation_manage
  ON public.sppg_electrical_installation FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-recording'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-recording'));

CREATE POLICY non_juknis_asset_inventory_select
  ON public.non_juknis_asset_inventory FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY non_juknis_asset_inventory_manage
  ON public.non_juknis_asset_inventory FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-non-juknis'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-non-juknis'));

CREATE POLICY surat_edaran_asset_inventory_select
  ON public.surat_edaran_asset_inventory FOR SELECT TO authenticated
  USING (private.can_read_asset_sppg(sppg_id));
CREATE POLICY surat_edaran_asset_inventory_manage
  ON public.surat_edaran_asset_inventory FOR ALL TO authenticated
  USING (private.can_manage_page(sppg_id, 'assets', 'asset-surat-edaran'))
  WITH CHECK (private.can_manage_page(sppg_id, 'assets', 'asset-surat-edaran'));

CREATE POLICY maintenance_assignee_select
  ON public.maintenance_assignee FOR SELECT TO authenticated
  USING (private.can_access_maintenance_assignee(id));
CREATE POLICY maintenance_assignee_admin
  ON public.maintenance_assignee FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY maintenance_schedule_select
  ON public.maintenance_schedule FOR SELECT TO authenticated
  USING (
    private.is_admin() OR (
      private.has_page_access('maintenance')
      AND private.can_access_sppg(sppg_id)
    )
  );
CREATE POLICY maintenance_schedule_manage
  ON public.maintenance_schedule FOR ALL TO authenticated
  USING (private.can_manage_maintenance_schedule(sppg_id))
  WITH CHECK (private.can_manage_maintenance_schedule(sppg_id));

CREATE POLICY maintenance_schedule_assignee_select
  ON public.maintenance_schedule_assignee FOR SELECT TO authenticated
  USING (private.can_access_maintenance_schedule(schedule_id));
CREATE POLICY maintenance_schedule_assignee_manage
  ON public.maintenance_schedule_assignee FOR ALL TO authenticated
  USING (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  )
  WITH CHECK (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  );

CREATE POLICY maintenance_schedule_need_select
  ON public.maintenance_schedule_need FOR SELECT TO authenticated
  USING (private.can_access_maintenance_schedule(schedule_id));
CREATE POLICY maintenance_schedule_need_manage
  ON public.maintenance_schedule_need FOR ALL TO authenticated
  USING (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  )
  WITH CHECK (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  );

CREATE POLICY maintenance_schedule_occurrence_select
  ON public.maintenance_schedule_occurrence FOR SELECT TO authenticated
  USING (private.can_access_maintenance_schedule(schedule_id));
CREATE POLICY maintenance_schedule_occurrence_manage
  ON public.maintenance_schedule_occurrence FOR ALL TO authenticated
  USING (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  )
  WITH CHECK (
    private.is_admin() OR (
      private.can_access_maintenance_schedule(schedule_id)
      AND private.has_permission('maintenance')
    )
  );

CREATE POLICY warehouse_item_select
  ON public.warehouse_item FOR SELECT TO authenticated
  USING (private.can_access_warehouse_item(id));
CREATE POLICY warehouse_item_admin
  ON public.warehouse_item FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY warehouse_movement_admin
  ON public.warehouse_movement FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY rab_proposal_select
  ON public.rab_proposal FOR SELECT TO authenticated
  USING (private.can_access_rab(id));
CREATE POLICY rab_proposal_manage
  ON public.rab_proposal FOR ALL TO authenticated
  USING (private.can_manage_rab(sppg_id))
  WITH CHECK (private.can_manage_rab(sppg_id));

CREATE POLICY rab_proposal_item_select
  ON public.rab_proposal_item FOR SELECT TO authenticated
  USING (private.can_access_rab(rab_id));
CREATE POLICY rab_proposal_item_manage
  ON public.rab_proposal_item FOR ALL TO authenticated
  USING (
    private.is_admin() OR (
      private.can_access_rab(rab_id)
      AND private.has_permission('maintenance')
    )
  )
  WITH CHECK (
    private.is_admin() OR (
      private.can_access_rab(rab_id)
      AND private.has_permission('maintenance')
    )
  );

CREATE POLICY asset_import_batch_admin
  ON public.asset_import_batch FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
CREATE POLICY asset_import_row_admin
  ON public.asset_import_row FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY warehouse_asset_allocation_select
  ON public.warehouse_asset_allocation FOR SELECT TO authenticated
  USING (
    private.is_admin() OR (
      private.has_page_access('warehouse')
      AND private.can_access_sppg(sppg_id)
    )
  );
CREATE POLICY warehouse_asset_allocation_admin
  ON public.warehouse_asset_allocation FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY warehouse_asset_allocation_movement_select
  ON public.warehouse_asset_allocation_movement FOR SELECT TO authenticated
  USING (
    private.can_access_allocation_movement(
      movement_type,
      from_sppg_id,
      to_sppg_id
    )
  );
CREATE POLICY warehouse_asset_allocation_movement_admin
  ON public.warehouse_asset_allocation_movement FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_yayasan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_page_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_yayasan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_sppg(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_asset_sppg(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_yayasan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_page(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_maintenance_schedule(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_maintenance_schedule(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_rab(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_rab(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_maintenance_assignee(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_warehouse_item(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_allocation_movement(text, text, text) TO authenticated;