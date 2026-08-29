-- Promote legacy `staff` accounts to `admin`.
-- Before the role model (admin/author/user) existed, every panel account was
-- `staff` with unrestricted access; the new route guards only admit `admin`,
-- so without this promotion those accounts lose the workshop panel.
UPDATE `user` SET `role` = 'admin' WHERE `role` = 'staff';
