ALTER TABLE `activation_services` ADD `provider` varchar(32) DEFAULT 'acczone' NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `providerServiceId` varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `supplierCurrency` varchar(8) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `providerRate` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `pricingTiers` text;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `provider` varchar(32) DEFAULT 'acczone' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `providerServiceId` varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `supplierCostInr` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `supplierCostUsdt` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `supplierRate` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `providerClientOrderId` varchar(128);--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `providerOrderId` varchar(128);--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD `providerStatus` varchar(32);--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD `provider` varchar(32) DEFAULT 'acczone' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_order_items` ADD CONSTRAINT `shop_order_items_providerClientOrderId_unique` UNIQUE(`providerClientOrderId`);--> statement-breakpoint
ALTER TABLE `provider_credentials` ADD CONSTRAINT `provider_credentials_provider_unique` UNIQUE(`provider`);