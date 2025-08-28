import { useState, useEffect, useRef } from 'react';
import supabaseClient from '../utils/supabase';
import dataProcessor from '../utils/dataProcessor';
import chartUtils from '../utils/chartUtils';

/**
 * 单商品预测页面
 */
const SinglePredictionPage = () => {
  // 状态管理
  const [skuId, setSkuId] = useState('DEMO_SKU_001');
  const [date, setDate] = useState('2025-08-28');
  const [predictionStep, setPredictionStep] = useState(3);
  const [customStep, setCustomStep] = useState('');
  const [probabilityThreshold, setProbabilityThreshold] = useState(0.5);
  const [changeThreshold, setChangeThreshold] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [priceChart, setPriceChart] = useState(null);
  const [dailyPredictionChart, setDailyPredictionChart] = useState(null);
  const [labelComparisonChart, setLabelComparisonChart] = useState(null);

  // 图表容器引用
  const recentChartRef = useRef(null);
  const lastYearChartRef = useRef(null);
  const dailyChartRef = useRef(null);
  const comparisonChartRef = useRef(null);

  // 清理图表
  const cleanupCharts = () => {
    if (priceChart?.recentYear && !priceChart.recentYear.isDisposed()) {
      if (priceChart.recentYear._resizeHandler) {
        window.removeEventListener('resize', priceChart.recentYear._resizeHandler);
      }
      priceChart.recentYear.dispose();
    }
    if (priceChart?.previousYear && !priceChart.previousYear.isDisposed()) {
      if (priceChart.previousYear._resizeHandler) {
        window.removeEventListener('resize', priceChart.previousYear._resizeHandler);
      }
      priceChart.previousYear.dispose();
    }
    if (dailyPredictionChart && !dailyPredictionChart.isDisposed()) {
      if (dailyPredictionChart._resizeHandler) {
        window.removeEventListener('resize', dailyPredictionChart._resizeHandler);
      }
      dailyPredictionChart.dispose();
    }
    if (labelComparisonChart && !labelComparisonChart.isDisposed()) {
      if (labelComparisonChart._resizeHandler) {
        window.removeEventListener('resize', labelComparisonChart._resizeHandler);
      }
      labelComparisonChart.dispose();
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupCharts();
    };
  }, []);

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
    
    // 清理之前的图表
    cleanupCharts();
    setPriceChart(null);
    setDailyPredictionChart(null);
    setLabelComparisonChart(null);

    try {
      // 从 Supabase 获取数据
      const data = await getDataFromSupabase();
      
      if (!data.historical || data.historical.length === 0) {
        setError('未找到历史价格数据');
        return;
      }

      // 处理数据
      const processedData = dataProcessor.processData(
        data.predictions,
        data.historical,
        data.future,
        probabilityThreshold,
        changeThreshold
      );

      setResults(processedData);

      // 延迟渲染图表，确保DOM元素已经渲染
      setTimeout(() => {
        try {
          const { predictions: predictionData, historical: historicalData } = data;
          
          // 创建价格走势图表
          chartUtils.createRecentPriceChart('recent-price-chart', historicalData);
          chartUtils.createLastYearPriceChart('last-year-price-chart', historicalData);
          
          // 创建每日预测概率图表
          if (processedData.dailyPredictions && processedData.dailyPredictions.length > 0) {
            chartUtils.createDailyPredictionChart('daily-prediction-chart', processedData.dailyPredictions);
          }
          
          // 创建预测标签对比图表
          if (processedData.comparisonData && processedData.comparisonData.length > 0) {
            chartUtils.createLabelComparisonChart('label-comparison-chart', processedData.comparisonData);
          }
          
        } catch (chartError) {
          console.error('图表渲染错误:', chartError);
        }
      }, 2000);
      
    } catch (err) {
      console.error('查询错误:', err);
      setError(err.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 从 Supabase 获取数据
  const getDataFromSupabase = async () => {
    try {
      // 获取历史价格数据
      // 获取历史价格数据
      // 获取历史价格数据
      const { data: historicalData, error: histError } = await supabaseClient
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .order('date', { ascending: true });

      if (histError) throw histError;

      // 获取预测数据
      // 获取预测数据
      // 获取预测数据 - 根据预测步长筛选
      // 获取预测数据 - 根据预测步长筛选，使用动态SKU
      const actualStep = predictionStep === 0 ? parseInt(customStep) : predictionStep;
      const { data: predictionData, error: predError } = await supabaseClient
        .from('result')
        .select('*')
        .eq('sku_id', skuId)
        .eq('prediction_date', date)
        .lte('prediction_step', actualStep)
        .order('prediction_step', { ascending: true });

      if (predError) throw predError;

      // 转换数据格式
      const historical = historicalData.map(item => ({
        sku_id: item.sku_id,
        date: item.date,
        price: parseFloat(item.price)
      }));

      const predictions = predictionData.map(item => ({
        sku_id: item.sku_id,
        prediction_date: item.prediction_date,
        target_date: item.target_date,
        predicted_price: 100 + Math.random() * 50, // 模拟预测价格
        probability: parseFloat(item.prediction_probability),
        prediction_step: item.prediction_step
      }));

      // 生成未来数据（模拟） - 确保包含所有预测目标日期的价格数据
      const future = [];
      const baseDate = new Date(date);
      
      // 为每个预测目标日期生成对应的价格数据
      for (let i = 1; i <= actualStep; i++) {
        const futureDate = new Date(baseDate);
        futureDate.setDate(baseDate.getDate() + i);
        
        future.push({
          sku_id: skuId,
          date: futureDate.toISOString().split('T')[0],
          price: 90 + Math.random() * 40
        });
      }

      console.log('生成的未来价格数据:', future);
      console.log('预测数据:', predictions);

      return { predictions, historical, future };
    } catch (error) {
      console.error('获取数据失败:', error);
      // 如果数据库获取失败，返回空数据
      return { predictions: [], historical: [], future: [] };
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          商品价格预测测工具
        </h1>

        <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">输入参数</h2>
            
            {/* 变动阈值说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div>
                <h3 className="font-bold text-blue-800">变动阈值 (X): {changeThreshold}</h3>
                <div className="text-sm text-blue-700">变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。</div>
              </div>
            </div>
            
            {/* 商品SKU输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">商品SKU</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  placeholder="请输入商品SKU，例如：DEMO_SKU_001"
                  className="input input-bordered flex-1"
                />
                <button
                  type="button"
                  onClick={() => setSkuId('DEMO_SKU_001')}
                  className="btn btn-outline btn-sm"
                >
                  填入示例
                </button>
              </div>
            </div>
            
            {/* 日期选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">预测日期</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
            
            {/* 预测步长选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">预测步长</span>
              </label>
              <select
                value={predictionStep}
                onChange={(e) => setPredictionStep(parseInt(e.target.value))}
                className="select select-bordered w-full"
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">自定义步长（天）</span>
                </label>
                <input
                  type="number"
                  value={customStep}
                  onChange={(e) => setCustomStep(e.target.value)}
                  placeholder="请输入自定义步长"
                  min="1"
                  className="input input-bordered w-full"
                />
              </div>
            )}
            
            {/* 概率阈值设置 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">概率阈值 (Y): {probabilityThreshold}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs">0</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={probabilityThreshold}
                  onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                  className="range range-primary flex-grow"
                />
                <span className="text-xs">1</span>
              </div>
              <div className="w-full flex justify-between text-xs px-2 mt-1">
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
              </div>
            </div>
            
            {/* 提交按钮 */}
            <div className="form-control mt-6">
              <button
                onClick={handleQuery}
                className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    预测中...
                  </>
                ) : '开始预测'}
              </button>
            </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* 结果展示 */}
        {results && (
          <div className="space-y-8">

            {/* 1. 统计信息卡片（在最前面） */}
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

            {/* 2. 价格走势图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {predictionStep <= 7 ? '近90天价格走势' : '近1年价格走势'}
                </h3>
                <div 
                  id="recent-price-chart" 
                  ref={recentChartRef}
                  className="w-full h-80"
                ></div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {predictionStep <= 7 ? '去年同期价格走势' : '1年前历史价格'}
                </h3>
                <div 
                  id="last-year-price-chart" 
                  ref={lastYearChartRef}
                  className="w-full h-80"
                ></div>
              </div>
            </div>

            {/* 3. 每日预测概率图表 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">每日预测概率</h3>
              <div 
                id="daily-prediction-chart" 
                ref={dailyChartRef}
                className="w-full h-80"
              ></div>
            </div>

            {/* 4. 预测标签对比图表 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">预测标签对比（预测准确率: {results.accuracy.toFixed(1)}%）</h3>
              <div 
                id="label-comparison-chart" 
                ref={comparisonChartRef}
                className="w-full h-80"
              ></div>
            </div>

            {/* 5. 预测结果表格 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">预测结果</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
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
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.predictedLabel === '变动' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                              {item.predictedLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.actualLabel === '变动' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                              {item.actualLabel || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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