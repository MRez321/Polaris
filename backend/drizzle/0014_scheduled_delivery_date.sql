-- Scheduled handover date («موعد تحویل»): the date the goods are due to be
-- physically handed to the seller. Nullable — non-scheduled consignments
-- were delivered at creation time, so their handover date lives in
-- delivered_at and this stays NULL.
ALTER TABLE `consignments` ADD COLUMN `delivery_date` datetime AFTER `delivered_at`;
