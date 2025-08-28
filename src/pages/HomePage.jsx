import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * 首页组件
 */
const HomePage = () => {
  const features = [
    {
      title: '单个商品预测验证',
      description: '输入单个商品ID，验证预测模型的准确性，并查看价格走势图',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      link: '/single-prediction'
    },
    {
      title: '批量商品预测验证',
      description: '上传包含多个商品ID的文件，批量验证预测模型的准确性',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      link: '/batch-prediction'
    },
    {
      title: '数据可视化',
      description: '直观展示价格走势、预测结果与真实数据的对比',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      link: '/single-prediction'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          商品价格预测模型验证工具
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-80">
          高效验证商品价格预测模型的准确性，优化数据采集策略
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <Link to={feature.link} className="card bg-base-200 shadow-xl h-full hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="text-primary mb-4">{feature.icon}</div>
                <h2 className="card-title">{feature.title}</h2>
                <p className="opacity-80">{feature.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="card bg-base-200 shadow-xl"
      >
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">🚀 快速开始</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h3 className="font-bold text-lg">输入商品ID</h3>
                <p className="opacity-80">在单个预测页面输入商品ID，或在批量预测页面上传包含多个商品ID的CSV文件</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h3 className="font-bold text-lg">设置预测参数</h3>
                <p className="opacity-80">选择预测日期、预测步长，并设置概率阈值和变动阈值</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h3 className="font-bold text-lg">查看预测结果</h3>
                <p className="opacity-80">系统将展示预测结果、价格走势图和准确率统计信息</p>
              </div>
            </div>
          </div>
          
          <div className="card-actions justify-center mt-6">
            <Link to="/single-prediction" className="btn btn-primary">开始使用</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;