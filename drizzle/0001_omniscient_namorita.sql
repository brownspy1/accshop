CREATE TABLE `activation_services` (
	`serviceKey` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`supplierPrice` double NOT NULL DEFAULT 0,
	`stock` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 0,
	`isListed` int NOT NULL DEFAULT 0,
	`retailPrice` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activation_services_serviceKey` PRIMARY KEY(`serviceKey`)
);
--> statement-breakpoint
CREATE TABLE `shop_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`serviceKey` varchar(128) NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` double NOT NULL,
	`fulfillmentState` enum('pending','processing','fulfilled','failed','unknown') NOT NULL DEFAULT 'pending',
	`resultCodes` text,
	`providerMessage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(32) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`customerPhone` varchar(64) NOT NULL,
	`paymentMethod` enum('bkash','nagad','bank') NOT NULL,
	`paymentReference` varchar(160),
	`totalAmount` double NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'BDT',
	`status` enum('awaiting_payment','paid','fulfilling','fulfilled','partially_fulfilled','fulfillment_unknown','fulfillment_failed','cancelled') NOT NULL DEFAULT 'awaiting_payment',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shop_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ciphertext` text NOT NULL,
	`nonce` varchar(32) NOT NULL,
	`authTag` varchar(32) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'BDT',
	`paymentInstructions` text,
	`bkashNumber` varchar(64),
	`nagadNumber` varchar(64),
	`bankDetails` text,
	`supportContact` varchar(160),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`)
);
