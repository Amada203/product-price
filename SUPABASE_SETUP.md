# Supabase 数据表配置指南

## 概述
本项目需要两个主要数据表来存储预测数据和真实价格数据。以下是详细的配置步骤和数据结构。

## 数据表结构

### 1. predictions 表 - 存储预测结果

```sql
CREATE TABLE predictions (
  id BIGSERIAL PRIMARY KEY,
  sku_id VARCHAR(50) NOT NULL,
  prediction_date DATE NOT NULL,
  target_date DATE NOT NULL,
  prediction_step INTEGER NOT NULL,
  prediction_probability DECIMAL(5,4) NOT NULL CHECK (prediction_probability >= 0 AND prediction_probability <= 1),
  model_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_predictions_sku_target ON predictions(sku_id, target_date);
CREATE INDEX idx_predictions_sku_prediction_date ON predictions(sku_id, prediction_date);
CREATE INDEX idx_predictions_target_date ON predictions(target_date);
```

**字段说明：**
- `sku_id`: 商品ID
- `prediction_date`: 预测日期（什么时候做的预测）
- `target_date`: 目标日期（预测哪一天的价格变动）
- `prediction_step`: 预测步长（预测日期到目标日期的天数）
- `prediction_probability`: 预测概率（0-1之间，表示价格变动的概率）
- `model_version`: 模型版本号（可选）

### 2. prices 表 - 存储真实价格数据

```sql
CREATE TABLE prices (
  id BIGSERIAL PRIMARY KEY,
  sku_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  currency VARCHAR(3) DEFAULT 'CNY',
  source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sku_id, date)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_prices_sku_date ON prices(sku_id, date);
CREATE INDEX idx_prices_date ON prices(date);
```

**字段说明：**
- `sku_id`: 商品ID
- `date`: 价格日期
- `price`: 价格（保留2位小数）
- `currency`: 货币单位（默认CNY）
- `source`: 数据来源（可选）

## 数据导入步骤

### 步骤1：创建数据表

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 执行上述 CREATE TABLE 语句

### 步骤2：准备数据文件

#### predictions 数据示例 (CSV格式)：
```csv
sku_id,prediction_date,target_date,prediction_step,prediction_probability,model_version
SKU001,2025-08-15,2025-08-19,4,0.75,v1.0
SKU001,2025-08-16,2025-08-19,3,0.78,v1.0
SKU001,2025-08-17,2025-08-19,2,0.82,v1.0
SKU002,2025-08-15,2025-08-20,5,0.45,v1.0
```

#### prices 数据示例 (CSV格式)：
```csv
sku_id,date,price,currency,source
SKU001,2025-08-01,299.99,CNY,system
SKU001,2025-08-02,305.50,CNY,system
SKU001,2025-08-03,298.80,CNY,system
SKU002,2025-08-01,150.00,CNY,system
```

### 步骤3：导入数据

#### 方法1：使用 Supabase 控制台
1. 进入 Table Editor
2. 选择对应的表
3. 点击 "Insert" → "Import data from CSV"
4. 上传准备好的 CSV 文件

#### 方法2：使用 SQL 批量插入
```sql
-- 插入预测数据示例
INSERT INTO predictions (sku_id, prediction_date, target_date, prediction_step, prediction_probability, model_version) VALUES
('SKU001', '2025-08-15', '2025-08-19', 4, 0.75, 'v1.0'),
('SKU001', '2025-08-16', '2025-08-19', 3, 0.78, 'v1.0'),
('SKU001', '2025-08-17', '2025-08-19', 2, 0.82, 'v1.0');

-- 插入价格数据示例
INSERT INTO prices (sku_id, date, price, currency, source) VALUES
('SKU001', '2025-08-01', 299.99, 'CNY', 'system'),
('SKU001', '2025-08-02', 305.50, 'CNY', 'system'),
('SKU001', '2025-08-03', 298.80, 'CNY', 'system');
```

## 数据要求和建议

### 数据完整性要求：
1. **预测数据**：
   - 每个商品至少需要连续7天的预测数据
   - 预测概率应在 0-1 之间
   - 预测步长应与实际日期差匹配

2. **价格数据**：
   - 需要足够的历史数据（建议至少90天）
   - 价格数据应连续，避免大量缺失
   - 如有缺失，系统会使用前向填充

### 数据质量建议：
1. **时间范围**：
   - 历史价格数据：至少90天
   - 预测数据：覆盖目标预测期间
   - 去年同期数据：用于季节性对比

2. **数据频率**：
   - 建议每日更新价格数据
   - 预测数据可以是实时或批量更新

## 环境变量配置

确保 `.env` 文件包含正确的 Supabase 连接信息：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 数据验证查询

使用以下查询验证数据是否正确导入：

```sql
-- 检查预测数据
SELECT 
  sku_id,
  COUNT(*) as prediction_count,
  MIN(prediction_date) as earliest_prediction,
  MAX(target_date) as latest_target,
  AVG(prediction_probability) as avg_probability
FROM predictions 
GROUP BY sku_id;

-- 检查价格数据
SELECT 
  sku_id,
  COUNT(*) as price_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  AVG(price) as avg_price
FROM prices 
GROUP BY sku_id;

-- 检查数据覆盖情况
SELECT 
  p.sku_id,
  COUNT(DISTINCT p.target_date) as predicted_dates,
  COUNT(DISTINCT pr.date) as price_dates
FROM predictions p
LEFT JOIN prices pr ON p.sku_id = pr.sku_id 
  AND pr.date BETWEEN p.prediction_date AND p.target_date
GROUP BY p.sku_id;
```

## 故障排除

### 常见问题：

1. **数据导入失败**：
   - 检查 CSV 格式是否正确
   - 确认日期格式为 YYYY-MM-DD
   - 检查数据类型是否匹配

2. **查询性能慢**：
   - 确认索引已创建
   - 检查查询条件是否使用了索引字段

3. **数据不显示**：
   - 检查日期范围是否正确
   - 确认 sku_id 格式一致
   - 验证权限设置

### 性能优化建议：

1. **分区表**（大数据量时）：
```sql
-- 按月分区价格表
CREATE TABLE prices_2025_08 PARTITION OF prices
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
```

2. **数据清理**：
```sql
-- 删除过期数据（保留最近2年）
DELETE FROM prices WHERE date < CURRENT_DATE - INTERVAL '2 years';
DELETE FROM predictions WHERE prediction_date < CURRENT_DATE - INTERVAL '1 year';
```

## 总结

完成以上配置后，系统将能够：
1. 从真实数据源获取预测和价格数据
2. 进行准确的预测验证和对比分析
3. 生成详细的准确率统计报告
4. 支持多种时间范围的价格走势分析

如需更多帮助，请参考 Supabase 官方文档或联系技术支持。