import { useState, useEffect, useRef } from 'react';
import supabaseClient from '../utils/supabase';
import dataProcessor from '../utils/dataProcessor';
import chartUtils from '../utils/chartUtils';

/**
 * 单商品预测页面
 */
const SinglePredictionPage = () => {
  // 状态管理
  const [skuId, setSkuId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [predictionStep, setPredictionStep] = useState(7);
  const [customStep, setCustomStep] = useState('');
  const [probabilityThreshold, setProbabilityThreshold] = useState(0.6);
  const [changeThreshold] = useState(0.1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [useExampleData, setUseExampleData] = useState(false);
  
  // 图表容器引用
  const priceChartRef = useRef(null);
  const dailyPredictionChartRef = useRef(null);
  const labelComparisonChartRef = useRef(null);
  
  // 图表实例
  const [priceChart, setPriceChart] = useState(null);
  const [dailyPredictionChart, setDailyPredictionChart] = useState(null);
  const [labelComparisonChart, setLabelComparisonChart] = useState(null);

  // 清除图表实例
  useEffect(() => {
    return () => {
      if (priceChart) {
        if (priceChart.recent) {
          priceChart.recent.dispose();
          priceChart.lastYear.dispose();
        } else if (priceChart.recentYear) {
          priceChart.recentYear.dispose();
          priceChart.previousYear.dispose();
        } else {
          priceChart.dispose();
        }
      }
      if (dailyPredictionChart) dailyPredictionChart.dispose();
      if (labelComparisonChart) labelComparisonChart.dispose();
    };
  }, [priceChart, dailyPredictionChart, labelComparisonChart]);

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!skuId.trim()) {
      setError('请输入商品ID');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const actualStep = predictionStep === 0 ? parseInt(customStep) : predictionStep;
      
      if (!actualStep || actualStep < 1) {
        throw new Error('预测步长必须大于0');
      }
      
      const formattedStartDate = new Date(date).toISOString().split('T')[0];
      
      let predictionData, historicalData, futurePriceData;
      
      if (useExampleData) {
        // 使用示例数据
        const exampleData = getExampleData();
        predictionData = exampleData.predictions;
        historicalData = exampleData.historical;
        futurePriceData = exampleData.future;
      } else {
        // 查询预测数据
        const { data: predictions, error: predError } = await supabaseClient
          .from('predictions')
          .select('*')
          .eq('sku_id', skuId.trim())
          .eq('prediction_date', formattedStartDate)
          .eq('prediction_step', actualStep);
        
        if (predError) throw predError;
        if (!predictions || predictions.length === 0) {
          throw new Error('未找到对应的预测数据');
        }
        
        predictionData = predictions;
        
        // 查询历史价格数据
        const startDate = new Date(formattedStartDate);
        startDate.setDate(startDate.getDate() - 365);
        const endDate = new Date(formattedStartDate);
        endDate.setDate(endDate.getDate() - 1);
        
        const { data: historical, error: histError } = await supabaseClient
          .from('real')
          .select('*')
          .eq('sku_id', skuId.trim())
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (histError) throw histError;
        historicalData = historical || [];
        
        // 查询未来真实价格数据（用于验证）
        const futureEndDate = new Date(formattedStartDate);
        futureEndDate.setDate(futureEndDate.getDate() + actualStep - 1);
        
        const { data: future, error: futureError } = await supabaseClient
          .from('real')
          .select('*')
          .eq('sku_id', skuId.trim())
          .gte('date', formattedStartDate)
          .lte('date', futureEndDate.toISOString().split('T')[0])
          .order('date', { ascending: true });
        
        if (futureError) throw futureError;
        futurePriceData = future || [];
      }
      
      // 处理数据
      const processedData = dataProcessor.processData(
        predictionData,
        historicalData,
        futurePriceData,
        probabilityThreshold,
        changeThreshold
      );
      
      setResult({
        ...processedData,
        predictionStep: actualStep,
        startDate: formattedStartDate
      });
      
      // 渲染图表
      setTimeout(() => {
        try {
          if (priceChartRef.current) {
            const organizedPriceData = dataProcessor.organizePriceDataByTimeframe(
              historicalData,
              futurePriceData,
              formattedStartDate,
              actualStep
            );
            
            if (actualStep <= 7) {
              // 短期预测：创建两个并排图表
              const recentChart = chartUtils.createRecentPriceChart(
                'recent-price-chart',
                processedData.priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              const lastYearChart = chartUtils.createLastYearPriceChart(
                'lastyear-price-chart',
                processedData.priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              setPriceChart({ recent: recentChart, lastYear: lastYearChart });
            } else {
              // 长期预测：创建两个并排图表（近1年 + 1年前）
              const recentYearChart = chartUtils.createRecentYearChart(
                'recent-year-chart',
                processedData.priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              const previousYearChart = chartUtils.createPreviousYearChart(
                'previous-year-chart',
                processedData.priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              setPriceChart({ recentYear: recentYearChart, previousYear: previousYearChart });
            }
          }
          
          if (dailyPredictionChartRef.current && processedData.dailyPredictions.length > 0) {
            const chart = chartUtils.createDailyPredictionChart(
              'daily-prediction-chart',
              processedData.dailyPredictions,
              probabilityThreshold
            );
            setDailyPredictionChart(chart);
          }
          
          if (labelComparisonChartRef.current && processedData.comparisonData.length > 0) {
            const chart = chartUtils.createPredictionLabelComparisonChart(
              'label-comparison-chart',
              processedData.comparisonData
            );
            setLabelComparisonChart(chart);
          }
        } catch (error) {
          console.error('渲染图表时出错:', error);
        }
      }, 500);
      
    } catch (err) {
      console.error('查询失败:', err);
      setError(err.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 设置示例数据
  const getExampleData = () => {
    const baseDate = new Date(date);
    const predictions = [];
    const historical = [];
    const future = [];
    
    // 生成示例预测数据
    for (let i = 0; i < (predictionStep === 0 ? parseInt(customStep) : predictionStep); i++) {
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + i);
      
      predictions.push({
        sku_id: skuId,
        prediction_date: date,
        target_date: targetDate.toISOString().split('T')[0],
        predicted_price: 100 + Math.random() * 50,
        probability: 0.6 + Math.random() * 0.3,
        prediction_step: predictionStep === 0 ? parseInt(customStep) : predictionStep
      });
    }
    
    // 生成示例历史数据
    for (let i = 365; i > 0; i--) {
      const histDate = new Date(baseDate);
      histDate.setDate(baseDate.getDate() - i);
      
      historical.push({
        sku_id: skuId,
        date: histDate.toISOString().split('T')[0],
        price: 80 + Math.random() * 60
      });
    }
    
    // 生成示例未来数据
    for (let i = 0; i < (predictionStep === 0 ? parseInt(customStep) : predictionStep); i++) {
      const futureDate = new Date(baseDate);
      futureDate.setDate(baseDate.getDate() + i);
      
      future.push({
        sku_id: skuId,
        date: futureDate.toISOString().split('T')[0],
        price: 90 + Math.random() * 40
      });
    }
    
    return { predictions, historical, future };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">单商品预测验证</h1>
        
        {/* 输入表单 */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">预测参数设置</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">商品ID</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入商品ID"
                    className="input input-bordered"
                    value={skuId}
                    onChange={(e) => setSkuId(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">预测日期</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">预测步长</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={predictionStep}
                    onChange={(e) => setPredictionStep(parseInt(e.target.value))}
                  >
                    <option value={3}>短期 (3天)</option>
                    <option value={7}>短期 (7天)</option>
                    <option value={14}>中期 (14天)</option>
                    <option value={30}>长期 (30天)</option>
                    <option value={0}>自定义</option>
                  </select>
                  
                  {predictionStep === 0 && (
                    <input
                      type="number"
                      placeholder="请输入自定义天数"
                      className="input input-bordered mt-2"
                      value={customStep}
                      onChange={(e) => setCustomStep(e.target.value)}
                      min="1"
                      required
                    />
                  )}
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">概率阈值: {probabilityThreshold}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    className="range range-primary"
                    value={probabilityThreshold}
                    onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                  />
                  <div className="w-full flex justify-between text-xs px-2">
                    <span>0.1</span>
                    <span>0.5</span>
                    <span>0.9</span>
                  </div>
                </div>
              </div>
              
              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text">使用示例数据（用于演示）</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={useExampleData}
                    onChange={(e) => setUseExampleData(e.target.checked)}
                  />
                </label>
              </div>
              
              <div className="form-control">
                <button
                  type="submit"
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '查询中...' : '开始验证'}
                </button>
              </div>
            </form>
            
            {error && (
              <div className="alert alert-error mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 结果展示 */}
        {result && (
          <div className="space-y-8">
            {/* 准确率统计 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">预测准确率统计</h2>
                
                <div className="stats stats-vertical lg:stats-horizontal shadow">
                  <div className="stat">
                    <div className="stat-title">整体准确率</div>
                    <div className="stat-value text-success">
                      {result.accuracy !== null ? `${(result.accuracy * 100).toFixed(2)}%` : '无法计算'}
                    </div>
                    <div className="stat-desc">
                      正确预测: {result.comparisonData.filter(item => item.isCorrect).length} / {result.comparisonData.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 价格走势展示 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">价格走势展示</h2>
                
                <div className="alert alert-info mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h3 className="font-bold">价格走势展示规则</h3>
                    <div className="text-sm">
                      {result.predictionStep <= 7 ? (
                        <>短期预测（{result.predictionStep}天）：展示近90天 + 去年同期30天价格走势</>
                      ) : (
                        <>长期预测（{result.predictionStep}天）：展示近1年 + 1年前历史价格走势</>
                      )}
                      <br />横坐标最大值为预测日期前一天，支持分开展示不同时间段数据
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {result.predictionStep <= 7 ? (
                    <>
                      <div className="bg-base-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2 text-center">近90天价格走势</h3>
                        <div id="recent-price-chart" style={{ width: '100%', height: '350px' }}></div>
                      </div>
                      <div className="bg-base-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2 text-center">去年同期30天价格走势</h3>
                        <div id="lastyear-price-chart" style={{ width: '100%', height: '350px' }}></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-base-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2 text-center">近1年价格走势</h3>
                        <div id="recent-year-chart" style={{ width: '100%', height: '350px' }}></div>
                      </div>
                      <div className="bg-base-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2 text-center">1年前历史价格走势</h3>
                        <div id="previous-year-chart" style={{ width: '100%', height: '350px' }}></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* 每日预测概率 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">每日预测概率</h2>
                <div id="daily-prediction-chart" ref={dailyPredictionChartRef} style={{ width: '100%', height: '400px' }}></div>
              </div>
            </div>
            
            {/* 预测标签对比 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">预测标签对比</h2>
                <div id="label-comparison-chart" ref={labelComparisonChartRef} style={{ width: '100%', height: '400px' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SinglePredictionPage;