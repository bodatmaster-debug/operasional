CREATE INDEX rab_proposal_assignee_id_idx
  ON public.rab_proposal (assignee_id);

CREATE INDEX warehouse_asset_allocation_movement_from_sppg_id_idx
  ON public.warehouse_asset_allocation_movement (from_sppg_id);

CREATE INDEX warehouse_asset_allocation_movement_to_sppg_id_idx
  ON public.warehouse_asset_allocation_movement (to_sppg_id);

CREATE INDEX warehouse_item_compatible_asset_item_id_idx
  ON public.warehouse_item (compatible_asset_item_id);