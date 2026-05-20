SET @product_stock_count_column_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'Product'
      AND column_name = 'stockCount'
);
--> statement-breakpoint
SET @product_stock_count_column_sql := IF(
    @product_stock_count_column_exists = 0,
    'ALTER TABLE `Product` ADD COLUMN `stockCount` int',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE product_stock_count_column_stmt FROM @product_stock_count_column_sql;
--> statement-breakpoint
EXECUTE product_stock_count_column_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE product_stock_count_column_stmt;

--> statement-breakpoint
SET @product_stock_count_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'Product'
      AND index_name = 'idx_product_isSold_stockCount_category'
);
--> statement-breakpoint
SET @product_stock_count_index_sql := IF(
    @product_stock_count_index_exists = 0,
    'CREATE INDEX `idx_product_isSold_stockCount_category` ON `Product` (`isSold`, `stockCount`, `category`)',
    'SELECT 1'
);
--> statement-breakpoint
PREPARE product_stock_count_index_stmt FROM @product_stock_count_index_sql;
--> statement-breakpoint
EXECUTE product_stock_count_index_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE product_stock_count_index_stmt;
