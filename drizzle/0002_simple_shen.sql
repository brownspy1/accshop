ALTER TABLE `activation_services` ADD COLUMN IF NOT EXISTS `reservedStock` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD COLUMN IF NOT EXISTS `idempotencyKey` varchar(64);--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `paymentAccount` varchar(2048) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `paymentInstructions` varchar(2000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `supportContact` varchar(160);--> statement-breakpoint
ALTER TABLE `shop_orders` ADD CONSTRAINT `shop_orders_idempotencyKey_unique` UNIQUE(`idempotencyKey`);--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD CONSTRAINT `shop_order_items_order_fk` FOREIGN KEY (`orderId`) REFERENCES `shop_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `shop_order_items_order_id_idx` ON `shop_order_items` (`orderId`);