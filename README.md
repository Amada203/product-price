# 商品价格预测模型验证工具

## 项目概述

这是一个商品价格预测模型验证工具的第一阶段MVP实现，主要用于验证商品价格预测模型的准确性和效果。

## 功能特性

### 第一阶段功能（当前版本）

1. **前端实现**
   - 支持单个商品ID输入和批量文件上传
   - 指定预测日期和预测步长（3日、7日、14日、30日、自定义）
   - 概率阈值设置（推荐0.4、0.6或自定义）

2. **Supabase集成**
   - 查询result表获取预测结果
   - 查询real表获取历史和真实价格数据
   - 自动数据处理和前向填充

3. **数据可视化**
   - 价格走势图（近90天和去年同期数据可选择展示）
   - 每日预测概率时间序列图
   - 预测vs真实对比走势图
   - 准确率统计和可视化

4. **阈值处理**
   - 基于概率阈值Y进行预测结果后处理
   - 根据变动阈值X计算价格变动标签
   - 输出预测准确率和详细对比结果

## 技术栈

- **前端框架**: React 18 + Vite
- **UI组件库**: Tailwind CSS + DaisyUI
- **图表库**: ECharts 5
- **数据库**: Supabase (PostgreSQL)
- **状态管理**: React Hooks
- **构建工具**: Vite
- **包管理器**: npm

## 项目结构

```
├── src/
│   ├── components/          # 可复用组件
│   ├── pages/              # 页面组件
│   │   ├── SinglePredictionPage.jsx    # 单商品预测页面
│   │   └── BatchPredictionPage.jsx     # 批量预测页面
│   ├── utils/              # 工具函数
│   │   ├── supabase.js     # Supabase客户端配置
│   │   ├── dataProcessor.js # 数据处理工具
│   │   └── chartUtils.js   # 图表工具
│   ├── App.jsx             # 主应用组件
│   ├── main.jsx            # 应用入口
│   └── index.css           # 全局样式
├── public/                 # 静态资源
├── index.html              # HTML模板
├── package.json            # 项目配置
├── vite.config.js          # Vite配置
├── tailwind.config.js      # Tailwind配置
├── postcss.config.js       # PostCSS配置
└── README.md              # 项目文档
```

## 安装和运行

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制 `.env` 文件并配置Supabase连接信息：

```bash
cp .env.example .env
```

2. 在 `.env` 文件中配置以下变量：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

构建文件将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## 数据库结构

### result表（预测结果表）

```sql
CREATE TABLE result (
  id SERIAL PRIMARY KEY,
  sku_id VARCHAR(50) NOT NULL,
  prediction_date DATE NOT NULL,
  target_date DATE NOT NULL,
  prediction_step INTEGER NOT NULL,
  prediction_probability DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### real表（真实价格表）

```sql
CREATE TABLE real (
  id SERIAL PRIMARY KEY,
  sku_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 使用说明

### 单商品预测

1. 输入商品ID
2. 选择预测日期
3. 设置预测步长（3日、7日、14日、30日或自定义）
4. 调整概率阈值（默认0.6）
5. 点击查询按钮获取结果

### 批量预测

1. 输入多个商品ID（用逗号、分号或空格分隔）或上传包含商品ID的文件
2. 设置其他参数（同单商品预测）
3. 查看整体准确率和各商品详细结果

### 结果解读

- **预测概率**: 模型预测价格变动的概率
- **变动阈值X**: 判断价格是否变动的阈值（固定为0.1，即10%）
- **概率阈值Y**: 将预测概率转换为变动标签的阈值
- **准确率**: 预测标签与真实标签的匹配程度

## 开发计划

### 第二阶段（待开发）

1. **自动数据管道**
   - 当没有预测结果时，自动触发数据查询→数据处理→特征生成→预测→写入result表的流程
   
2. **爬虫数据采集**
   - 基于预测结果的智能采集策略
   - 对预测为变动的商品进行数据采集
   
3. **模型优化**
   - 基于验证结果优化预测模型
   - 动态调整模型参数

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issues: [GitHub Issues](https://github.com/your-username/product-price-prediction-tool/issues)
- 邮箱: your-email@example.com

## 更新日志

### v1.0.0 (2025-08-27)

- ✅ 完成第一阶段MVP开发
- ✅ 实现单商品和批量预测功能
- ✅ 集成Supabase数据库
- ✅ 实现数据可视化和准确率计算
- ✅ 支持示例数据模式
- ✅ 响应式UI设计