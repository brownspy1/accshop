CREATE TABLE `shop_customer_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(64) NOT NULL DEFAULT '',
	`emailVerifiedAt` timestamp,
	`magicTokenHash` varchar(64),
	`magicTokenExpiresAt` timestamp,
	`magicTokenPurpose` enum('verify','login'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_customer_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_customer_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `shop_email_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dedupeKey` varchar(192) NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`kind` enum('verify','login','delivery') NOT NULL,
	`status` enum('pending','sending','sent','failed','unknown') NOT NULL DEFAULT 'pending',
	`customerAccountId` int NOT NULL,
	`orderId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`messageId` varchar(128),
	`attempts` int NOT NULL DEFAULT 0,
	`lastErrorCode` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`sentAt` timestamp,
	CONSTRAINT `shop_email_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_email_outbox_dedupeKey_unique` UNIQUE(`dedupeKey`),
	CONSTRAINT `shop_email_outbox_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `activation_services` ADD `imageUrl` varchar(2048) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `lastStockSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `priceMarkupRatio` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activation_services` ADD `priceReviewRequired` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `customerAccountId` int;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `inrToStoreRate` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `usdtToStoreRate` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `acczoneUnitToStoreRate` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `resendFromEmail` varchar(320) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `publicSiteUrl` varchar(512) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_email_outbox` ADD CONSTRAINT `shop_email_outbox_customer_fk` FOREIGN KEY (`customerAccountId`) REFERENCES `shop_customer_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_email_outbox` ADD CONSTRAINT `shop_email_outbox_order_fk` FOREIGN KEY (`orderId`) REFERENCES `shop_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `shop_email_outbox_customer_idx` ON `shop_email_outbox` (`customerAccountId`);--> statement-breakpoint
CREATE INDEX `shop_email_outbox_order_idx` ON `shop_email_outbox` (`orderId`);--> statement-breakpoint
ALTER TABLE `shop_orders` ADD CONSTRAINT `shop_orders_customer_account_fk` FOREIGN KEY (`customerAccountId`) REFERENCES `shop_customer_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `shop_orders_customer_account_idx` ON `shop_orders` (`customerAccountId`);