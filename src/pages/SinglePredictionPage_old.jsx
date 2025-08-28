import { useState, useEffect, useRef } from 'react';
import supabaseClient from '../utils/supabase';
import dataProcessor from '../utils/dataProcessor';
import chartUtils from '../utils/chartUtils';

/**
 * 单商品预测页面 - 完全按照图片重新设计
 */
const SinglePredictionPage = () => {
  // 状态管理
  const [skuId, setSkuId] = useState('DEMO_SKU_001');
  const [date, setDate] = useState('2025/08/28');
  const [predictionStep, setPredictionStep] = useState(3);
  const [customStep, setCustomStep] = useState('');
  const [probabilityThreshold, setProbabilityThreshold] = useState(0.5);
  const [changeThreshold, setChangeThreshold] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  // 图表容器引用
  const recentChartRef = useRef(null);
  const lastYearChartRef = useRef(null);
  const dailyChartRef = useRef(null);
  const comparisonChartRef = useRef(null);

  // 执行预测查询
  const handleQuery = async () => {
    if (!skuId || !date) {
      setError('请填写完整的查询条件');
      return;
    }

    if (predictionStep === 0 && (!customStep || parseInt(customStep) <= 0)) {
      setError('请输入有效的自定义预测天数');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 模拟数据处理
      const mockResults = {
        accuracy: 85.7,
        comparisonData: [
          { date: '2025-08-29', probability: 0.65, actualPrice: 156.78, predictedLabel: '变动', actualLabel: '变动', isCorrect: true },
          { date: '2025-08-30', probability: 0.42, actualPrice: 152.34, predictedLabel: '不变', actualLabel: '不变', isCorrect: true },
          { date: '2025-08-31', probability: 0.78, actualPrice: 164.21, predictedLabel: '变动', actualLabel: '变动', isCorrect: true },
        ],
        dailyPredictions: [
          { date: '2025-08-29', upProbability: 0.65, downProbability: 0.35 },
          { date: '2025-08-30', upProbability: 0.42, downProbability: 0.58 },
          { date: '2025-08-31', upProbability: 0.78, downProbability: 0.22 },
        ]
      };

      setResults(mockResults);

      // 延迟渲染图表
      setTimeout(() => {
        try {
          // 模拟历史数据
          const historicalData = Array.from({ length: 90 }, (_, i) => ({
            date: new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 100 + Math.sin(i / 10) * 20 + Math.random() * 10
          }));

          chartUtils.createRecentPriceChart('recent-price-chart', historicalData);
          chartUtils.createLastYearPriceChart('last-year-price-chart', historicalData);
          chartUtils.createDailyPredictionChart('daily-prediction-chart', mockResults.dailyPredictions);
          chartUtils.createLabelComparisonChart('label-comparison-chart', mockResults.comparisonData);
        } catch (chartError) {
          console.error('图表渲染错误:', chartError);
        }
      }, 1000);

    } catch (err) {
      console.error('查询错误:', err);
      setError(err.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 页面标题 */}
        <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">
          商品价格预测工具
        </h1>

        {/* 1. 输入参数区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">输入参数</h2>
          
          {/* 变动阈值说明 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  变动阈值 (X): {changeThreshold}
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 商品SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品SKU
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  placeholder="DEMO_SKU_001"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setSkuId('DEMO_SKU_001')}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  填入示例
                </button>
              </div>
            </div>

            {/* 预测日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                预测日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 预测步长 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                预测步长
              </label>
              <select
                value={predictionStep}
                onChange={(e) => setPredictionStep(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>1日</option>
                <option value={3}>3日</option>
                <option value={7}>7日</option>
                <option value={14}>14日</option>
                <option value={30}>30日</option>
                <option value={0}>自定义</option>
              </select>
            </div>

            {/* 自定义步长 */}
            {predictionStep === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义步长（天）
                </label>
                <input
                  type="number"
                  value={customStep}
                  onChange={(e) => setCustomStep(e.target.value)}
                  placeholder="请输入自定义步长"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* 概率阈值设置 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              概率阈值 (Y): {probabilityThreshold}
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">0</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={probabilityThreshold}
                onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${probabilityThreshold * 100}%, #e5e7eb ${probabilityThreshold * 100}%, #e5e7eb 100%)`
                }}
              />
              <span className="text-sm text-gray-500">1</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-2">
              <span>0.2</span>
              <span>0.4</span>
              <span>0.6</span>
              <span>0.8</span>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="mt-8">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? '预测中...' : '开始预测'}
            </button>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 结果展示 */}
        {results && (
          <div className="space-y-6">
            {/* 2. 统计信息卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-500 text-white rounded-lg p-6 text-center">
                <div className="text-sm opacity-90">价格变动阈值</div>
                <div className="text-3xl font-bold my-2">{(changeThreshold * 100).toFixed(0)}%</div>
                <div className="text-sm opacity-90">当前设定阈值</div>
              </div>
              <div className="bg-pink-500 text-white rounded-lg p-6 text-center">
                <div className="text-sm opacity-90">预测天数</div>
                <div className="text-3xl font-bold my-2">{predictionStep === 0 ? customStep : predictionStep}</div>
                <div className="text-sm opacity-90">
                  {predictionStep <= 7 ? '短期预测' : predictionStep <= 14 ? '中期预测' : '长期预测'}
                </div>
              </div>
              <div className="bg-teal-500 text-white rounded-lg p-6 text-center">
                <div className="text-sm opacity-90">预测准确率</div>
                <div className="text-3xl font-bold my-2">{results.accuracy.toFixed(1)}%</div>
                <div className="text-sm opacity-90">
                  {results.comparisonData.filter(item => item.isCorrect).length} / {results.comparisonData.length} 正确
                </div>
              </div>
            </div>

            {/* 3. 价格走势图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">近90天价格走势</h3>
                <div id="recent-price-chart" className="w-full h-80"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">去年同期价格走势</h3>
                <div id="last-year-price-chart" className="w-full h-80"></div>
              </div>
            </div>

            {/* 4. 每日预测概率图表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">每日预测概率</h3>
              <div id="daily-prediction-chart" className="w-full h-80"></div>
            </div>

            {/* 5. 预测标签对比图表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">预测标签对比</h3>
              <div id="label-comparison-chart" className="w-full h-80"></div>
            </div>

            {/* 6. 预测结果表格 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">预测结果</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">预测日期</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">预测变动概率</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">实际值</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">预测标签</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">实际标签</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">预测结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.comparisonData.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.date}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${item.probability * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {(item.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">¥{item.actualPrice?.toFixed(2) || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.predictedLabel === '变动' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.predictedLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.actualLabel === '变动' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.actualLabel || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isCorrect ? '正确' : '错误'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SinglePredictionPage;