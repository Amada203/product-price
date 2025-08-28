import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
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

      // 处理数据 - 直接传递原始Supabase数据
      const processedData = dataProcessor.processData(
        data.predictions, // 使用转换后的数据
        data.historical, // 使用转换后的数据
        data.future || [], // 使用转换后的数据
        probabilityThreshold,
        changeThreshold
      );

      setResults(processedData);

      // 延迟渲染图表，确保DOM元素已经渲染
      setTimeout(() => {
        try {
          const { predictions: predictionData, historical: historicalData } = data;
          
          // 组织价格数据
          const organizedPriceData = {
            historical: historicalData,
            predictions: predictionData
          };
          
          // 创建价格走势图表
          if (predictionStep <= 7) {
            const recentChart = chartUtils.createRecentPriceChart(
              'recent-price-chart',
              historicalData,
              predictionData,
              probabilityThreshold,
              organizedPriceData
            );
            
            const lastYearChart = chartUtils.createLastYearPriceChart(
              'last-year-price-chart',
              historicalData,
              predictionData,
              probabilityThreshold,
              organizedPriceData
            );
            
            if (recentChart || lastYearChart) {
              setPriceChart({ recentYear: recentChart, previousYear: lastYearChart });
            }
          } else {
            const recentYearChart = chartUtils.createRecentYearChart(
              'recent-year-chart',
              historicalData,
              predictionData,
              probabilityThreshold,
              organizedPriceData
            );
            
            const previousYearChart = chartUtils.createPreviousYearChart(
              'previous-year-chart',
              historicalData,
              predictionData,
              probabilityThreshold,
              organizedPriceData
            );
            
            if (recentYearChart || previousYearChart) {
              setPriceChart({ recentYear: recentYearChart, previousYear: previousYearChart });
            }
          }
          
          // 创建每日预测概率图表
          console.log('传递给每日图表的数据:', processedData.dailyPredictions);
          const dailyChart = chartUtils.createDailyPredictionChart(
            'daily-prediction-chart',
            processedData.dailyPredictions,
            probabilityThreshold
          );
          if (dailyChart) {
            setDailyPredictionChart(dailyChart);
          } else {
            console.warn('每日预测图表创建失败');
          }
          
          // 创建预测标签对比图表
          // 创建预测标签对比图表
          const comparisonChart = chartUtils.createLabelComparisonChart(
            'label-comparison-chart',
            processedData.comparisonData,
            processedData.accuracy
          );
          if (comparisonChart) {
            setLabelComparisonChart(comparisonChart);
          }
          
        } catch (chartError) {
          console.error('图表渲染错误:', chartError);
        }
      }, 1500);
      
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
      const { data: historicalData, error: histError } = await supabase
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .order('date', { ascending: true });

      if (histError) throw histError;

      // 获取预测数据 - 使用动态SKU和步长筛选
      const actualStep = predictionStep === 0 ? parseInt(customStep) : predictionStep;
      console.log('查询条件:', { skuId, date, actualStep });
      
      const { data: predictionData, error: predError } = await supabase
        .from('result')
        .select('*')
        .eq('sku_id', skuId)
        .eq('prediction_date', date)
        .lte('prediction_step', actualStep)
        .order('prediction_step', { ascending: true });

      if (predError) {
        console.error('预测数据查询错误:', predError);
        throw predError;
      }

      console.log('获取到的预测数据:', predictionData);

      // 转换数据格式
      const historical = historicalData.map(item => ({
        sku_id: item.sku_id,
        date: item.date,
        price: parseFloat(item.price) || 0
      }));

      const predictions = predictionData.map(item => ({
        sku_id: item.sku_id,
        prediction_date: item.prediction_date,
        target_date: item.target_date,
        probability: parseFloat(item.prediction_probability) || 0,
        prediction_probability: parseFloat(item.prediction_probability) || 0, // 保留原字段名
        prediction_step: item.prediction_step
      }));

      // 获取未来实际价格数据（用于对比）
      const targetDates = predictions.map(p => p.target_date);
      const { data: futureData, error: futureError } = await supabase
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .in('date', targetDates)
        .order('date', { ascending: true });

      if (futureError) {
        console.warn('获取未来价格数据失败:', futureError);
      }

      const future = futureData ? futureData.map(item => ({
        sku_id: item.sku_id,
        date: item.date,
        price: parseFloat(item.price) || 0
      })) : [];

      console.log('=== 数据获取结果 ===');
      console.log('历史数据:', historical.length, '条');
      console.log('预测数据:', predictions.length, '条');
      console.log('未来价格数据:', future.length, '条');
      console.log('预测数据详情:', predictions);
      
      // 确保返回的数据不为空
      if (predictions.length === 0) {
        console.error('❌ 没有找到预测数据！');
        console.log('查询参数:', { skuId, date, actualStep });
        console.log('原始预测数据:', predictionData);
      } else {
        console.log('✅ 成功获取预测数据');
      }

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
          商品价格预测工具
        </h1>

        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">输入参数</h2>
            
            {/* 变动阈值说明 */}
            {/* 变动阈值说明 */}
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h3 className="font-bold">变动阈值 (X): 0.05</h3>
                <div className="text-sm">变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。</div>
              </div>
            </div>
            
            {/* 商品SKU输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">商品SKU</span>
              </label>
              <div className="flex gap-2 items-center">
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
            {/* 概率阈值设置 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">概率阈值 (Y): {probabilityThreshold}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={probabilityThreshold}
                  onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                  className="range range-primary flex-grow"
                />
              </div>
              <div className="w-full flex justify-between text-xs px-2 mt-1">
                <span>0</span>
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
                <span>1</span>
              </div>
            </div>
            
            {/* 提交按钮 */}
            <div className="form-control mt-6">
              <button
                onClick={handleQuery}
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    预测中...
                  </>
                ) : '开始预测'}
              </button>
            </div>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 结果展示 */}
        {results && (
          <div className="space-y-8">
            
            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat bg-primary text-primary-content rounded-lg">
                <div className="stat-title text-primary-content">价格变动阈值</div>
                <div className="stat-value">{changeThreshold * 100}%</div>
                <div className="stat-desc text-primary-content">
                  价格变动判断标准
                </div>
              </div>

              <div className="stat bg-accent text-accent-content rounded-lg">
                <div className="stat-title text-accent-content">预测天数</div>
                <div className="stat-value">{predictionStep === 0 ? customStep : predictionStep}</div>
                <div className="stat-desc text-accent-content">
                  {predictionStep <= 7 ? '短期预测' : predictionStep <= 14 ? '中期预测' : '长期预测'}
                </div>
              </div>

              <div className="stat bg-secondary text-secondary-content rounded-lg">
                <div className="stat-title text-secondary-content">预测准确率</div>
                <div className="stat-value">{results.accuracy.toFixed(1)}%</div>
                <div className="stat-desc text-secondary-content">
                  {results.comparisonData.filter(item => item.isCorrect).length} / {results.comparisonData.length} 正确
                </div>
              </div>
            </div>

            {/* 价格走势图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    {predictionStep <= 7 ? '近90天价格走势' : '近1年价格走势'}
                  </h3>
                  <div 
                    id="recent-price-chart" 
                    ref={recentChartRef}
                    className="w-full h-80"
                  ></div>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    {predictionStep <= 7 ? '去年同期价格走势' : '1年前历史价格'}
                  </h3>
                  <div 
                    id="last-year-price-chart" 
                    ref={lastYearChartRef}
                    className="w-full h-80"
                  ></div>
                </div>
              </div>
            </div>
            
            {/* 每日预测概率图表 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">每日预测概率</h3>
                <div 
                  id="daily-prediction-chart" 
                  ref={dailyChartRef}
                  className="w-full h-80"
                ></div>
              </div>
            </div>

            {/* 预测标签对比 */}
            {/* 预测标签对比 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">预测标签对比 (准确率: {results.accuracy.toFixed(1)}%)</h3>
                <div 
                  id="label-comparison-chart" 
                  ref={comparisonChartRef}
                  className="w-full h-80"
                ></div>
              </div>
            </div>
            
            {/* 预测结果表格 */}
            {/* 预测结果表格 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4 text-primary">预测结果</h2>
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="text-base font-semibold text-base-content">预测日期</th>
                        <th className="text-base font-semibold text-base-content">预测变动概率</th>
                        <th className="text-base font-semibold text-base-content">实际价格</th>
                        <th className="text-base font-semibold text-base-content">预测标签</th>
                        <th className="text-base font-semibold text-base-content">实际标签</th>
                        <th className="text-base font-semibold text-base-content">预测结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.comparisonData.map((item, index) => (
                        <tr key={index} className="hover:bg-base-50 transition-colors">
                          <td className="font-medium text-base-content">{item.date}</td>
                          <td>
                            <div className="flex items-center space-x-3">
                              <div className="w-20 bg-base-300 rounded-full h-3 shadow-inner">
                                <div
                                  className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${item.probability * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-primary">
                                {(item.probability * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="font-medium text-accent">¥{item.actualPrice?.toFixed(2) || 'N/A'}</td>
                          <td>
                            <span className={`badge badge-lg font-medium ${item.predictedLabel === '变动' ? 'badge-warning text-warning-content' : 'badge-neutral text-neutral-content'}`}>
                              {item.predictedLabel}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-lg font-medium ${item.actualLabel === '变动' ? 'badge-warning text-warning-content' : 'badge-neutral text-neutral-content'}`}>
                              {item.actualLabel || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-lg font-semibold ${item.isCorrect ? 'badge-success text-success-content' : 'badge-error text-error-content'}`}>
                              {item.isCorrect ? '✓ 正确' : '✗ 错误'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SinglePredictionPage;
