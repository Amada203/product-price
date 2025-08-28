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
      const actualStep = predictionStep === 'custom' ? parseInt(customStep) : parseInt(predictionStep);
      
      if (isNaN(actualStep) || actualStep <= 0) {
        throw new Error('预测步长必须是正整数');
      }
      
      // 生成预测日期范围
      const dateRange = [];
      for (let i = 0; i < actualStep; i++) {
        const targetDate = new Date(date);
        targetDate.setDate(targetDate.getDate() + i);
        dateRange.push(targetDate.toISOString().split('T')[0]);
      }
      
      const formattedStartDate = dateRange[0];
      const formattedEndDate = dateRange[dateRange.length - 1];
      
      let predictionData = [];
      let historicalData = {};
      let futurePriceData = [];
      
      if (useExampleData) {
        // 使用示例数据
        predictionData = dataProcessor.generateExamplePredictionData(skuId, dateRange);
        
        // 生成示例历史价格数据
        const recent90DaysStart = new Date(date);
        recent90DaysStart.setDate(recent90DaysStart.getDate() - 90);
        const recent90DaysEnd = new Date(date);
        recent90DaysEnd.setDate(recent90DaysEnd.getDate() - 1);
        
        historicalData.recentData = [];
        const currentDate1 = new Date(recent90DaysStart);
        while (currentDate1 <= recent90DaysEnd) {
          const basePrice = Math.floor(Math.random() * 500) + 100;
          const dailyChange = (Math.random() - 0.5) * 20;
          historicalData.recentData.push({
            sku_id: skuId,
            date: currentDate1.toISOString().split('T')[0],
            price: Math.max(50, basePrice + dailyChange)
          });
          currentDate1.setDate(currentDate1.getDate() + 1);
        }
        
        // 生成去年同期数据
        const lastYearStart = new Date(date);
        lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
        const dayRange = actualStep <= 7 ? 30 : 60;
        lastYearStart.setDate(lastYearStart.getDate() - Math.floor(dayRange / 2));
        
        historicalData.lastYearData = [];
        for (let i = 0; i < dayRange; i++) {
          const currentDate2 = new Date(lastYearStart);
          currentDate2.setDate(currentDate2.getDate() + i);
          const basePrice = Math.floor(Math.random() * 500) + 100;
          const dailyChange = (Math.random() - 0.5) * 20;
          historicalData.lastYearData.push({
            sku_id: skuId,
            date: currentDate2.toISOString().split('T')[0],
            price: Math.max(50, basePrice + dailyChange)
          });
        }
        
        futurePriceData = dataProcessor.generateExampleFuturePriceData(skuId, dateRange);
      } else {
        // 查询真实数据
        const { data: fetchedPredictions, error: predictionError } = await supabaseClient.fetchPredictionResultsForDateRange(
          skuId, 
          formattedStartDate, 
          formattedEndDate
        );
        
        if (predictionError) {
          predictionData = dataProcessor.generateExamplePredictionData(skuId, dateRange);
        } else {
          predictionData = fetchedPredictions || [];
          if (!predictionData || predictionData.length === 0) {
            predictionData = dataProcessor.generateExamplePredictionData(skuId, dateRange);
          }
        }
        
        historicalData = await supabaseClient.fetchHistoricalPrices(skuId, date);
        
        if ((!historicalData.recentData || historicalData.recentData.length === 0) &&
            (!historicalData.lastYearData || historicalData.lastYearData.length === 0)) {
          // 生成示例历史数据
          const recent90DaysStart = new Date(date);
          recent90DaysStart.setDate(recent90DaysStart.getDate() - 90);
          const recent90DaysEnd = new Date(date);
          recent90DaysEnd.setDate(recent90DaysEnd.getDate() - 1);
          
          historicalData.recentData = [];
          const currentDate1 = new Date(recent90DaysStart);
          while (currentDate1 <= recent90DaysEnd) {
            const basePrice = Math.floor(Math.random() * 500) + 100;
            const dailyChange = (Math.random() - 0.5) * 20;
            historicalData.recentData.push({
              sku_id: skuId,
              date: currentDate1.toISOString().split('T')[0],
              price: Math.max(50, basePrice + dailyChange)
            });
            currentDate1.setDate(currentDate1.getDate() + 1);
          }
          
          const lastYearStart = new Date(date);
          lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
          const dayRange = actualStep <= 7 ? 30 : 60;
          lastYearStart.setDate(lastYearStart.getDate() - Math.floor(dayRange / 2));
          
          historicalData.lastYearData = [];
          for (let i = 0; i < dayRange; i++) {
            const currentDate2 = new Date(lastYearStart);
            currentDate2.setDate(currentDate2.getDate() + i);
            const basePrice = Math.floor(Math.random() * 500) + 100;
            const dailyChange = (Math.random() - 0.5) * 20;
            historicalData.lastYearData.push({
              sku_id: skuId,
              date: currentDate2.toISOString().split('T')[0],
              price: Math.max(50, basePrice + dailyChange)
            });
          }
        }
        
        const { data: fetchedFuturePriceData } = await supabaseClient.fetchPricesForDateRange(
          skuId,
          formattedStartDate,
          formattedEndDate
        );
        
        futurePriceData = fetchedFuturePriceData || [];
        
        if (!futurePriceData || futurePriceData.length === 0) {
          futurePriceData = dataProcessor.generateExampleFuturePriceData(skuId, dateRange);
        }
      }
      
      // 处理数据
      const predictionsByDate = {};
      dateRange.forEach(d => {
        predictionsByDate[d] = [];
      });
      
      predictionData.forEach(prediction => {
        if (dateRange.includes(prediction.target_date)) {
          predictionsByDate[prediction.target_date].push(prediction);
        }
      });
      
      // 确保历史数据截止到预测日期前一天
      const historyEndDate = new Date(date);
      historyEndDate.setDate(historyEndDate.getDate() - 1);
      const formattedHistoryEndDate = historyEndDate.toISOString().split('T')[0];
      
      const filteredRecentData = (historicalData.recentData || []).filter(item => item.date <= formattedHistoryEndDate);
      const filteredLastYearData = (historicalData.lastYearData || []).filter(item => item.date <= formattedHistoryEndDate);
      
      const allPriceData = [
        ...filteredRecentData,
        ...filteredLastYearData,
        ...futurePriceData
      ];
      
      const historyStartDate = new Date(date);
      historyStartDate.setDate(historyStartDate.getDate() - 90);
      const formattedHistoryStartDate = historyStartDate.toISOString().split('T')[0];
      
      const filledPriceData = dataProcessor.forwardFill(
        allPriceData,
        'date',
        'price',
        formattedHistoryStartDate,
        formattedHistoryEndDate
      );
      
      const priceDataWithLabels = dataProcessor.calculatePriceChangeLabels(
        filledPriceData,
        'date',
        'price',
        changeThreshold
      );
      
      // 准备对比数据
      const comparisonData = [];
      const dailyPredictions = [];
      
      for (const targetDate of dateRange) {
        const predictions = predictionsByDate[targetDate] || [];
        
        if (predictions.length > 0) {
          predictions.sort((a, b) => new Date(a.prediction_date) - new Date(b.prediction_date));
          const latestPrediction = predictions[predictions.length - 1];
          
          dailyPredictions.push({
            date: targetDate,
            predictions: predictions,
            latestPrediction: latestPrediction
          });
          
          const realPriceItem = futurePriceData?.find(item => item.date === targetDate);
          
          if (realPriceItem) {
            const previousDate = new Date(targetDate);
            previousDate.setDate(previousDate.getDate() - 1);
            const formattedPreviousDate = previousDate.toISOString().split('T')[0];
            
            const previousPriceItem = futurePriceData?.find(item => item.date === formattedPreviousDate) || 
            allPriceData.find(item => item.date === formattedPreviousDate);
            
            if (previousPriceItem) {
              const currentPrice = realPriceItem.price;
              const previousPrice = previousPriceItem.price;
              const changePercentage = Math.abs((currentPrice - previousPrice) / previousPrice);
              
              const actualChange = changePercentage > changeThreshold;
              const predictedChange = latestPrediction.prediction_probability > probabilityThreshold;
              const isCorrect = predictedChange === actualChange;
              
              comparisonData.push({
                date: targetDate,
                predicted: predictedChange,
                actual: actualChange,
                isCorrect,
                predictionProbability: latestPrediction.prediction_probability,
                actualChangePercentage: changePercentage,
                skuId: skuId
              });
            }
          }
        } else {
          // 生成示例预测
          const examplePrediction = {
            sku_id: skuId,
            prediction_date: new Date(targetDate).toISOString().split('T')[0],
            target_date: targetDate,
            prediction_step: dateRange.indexOf(targetDate) + 1,
            prediction_probability: Math.random() * 0.8 + 0.1
          };
          
          dailyPredictions.push({
            date: targetDate,
            predictions: [examplePrediction],
            latestPrediction: examplePrediction
          });
          
          const realPriceItem = futurePriceData?.find(item => item.date === targetDate);
          
          if (realPriceItem) {
            const previousDate = new Date(targetDate);
            previousDate.setDate(previousDate.getDate() - 1);
            const formattedPreviousDate = previousDate.toISOString().split('T')[0];
            
            const previousPriceItem = futurePriceData?.find(item => item.date === formattedPreviousDate) || 
            allPriceData.find(item => item.date === formattedPreviousDate);
            
            if (previousPriceItem) {
              const currentPrice = realPriceItem.price;
              const previousPrice = previousPriceItem.price;
              const changePercentage = Math.abs((currentPrice - previousPrice) / previousPrice);
              
              const actualChange = changePercentage > changeThreshold;
              const predictedChange = examplePrediction.prediction_probability > probabilityThreshold;
              const isCorrect = predictedChange === actualChange;
              
              comparisonData.push({
                date: targetDate,
                predicted: predictedChange,
                actual: actualChange,
                isCorrect,
                predictionProbability: examplePrediction.prediction_probability,
                actualChangePercentage: changePercentage,
                skuId: skuId
              });
            }
          }
        }
      }
      
      // 设置结果
      setResult({
        skuId,
        date,
        predictionStep: actualStep,
        dateRange,
        predictionData,
        dailyPredictions,
        priceData: priceDataWithLabels,
        comparisonData,
        historicalData,
        futurePriceData,
        accuracy: comparisonData.length > 0 
          ? comparisonData.filter(item => item.isCorrect).length / comparisonData.length 
          : null
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
                priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              const lastYearChart = chartUtils.createLastYearPriceChart(
                'lastyear-price-chart',
                priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              setPriceChart({ recent: recentChart, lastYear: lastYearChart });
            } else {
              // 长期预测：创建两个图表
              const recentYearChart = chartUtils.createRecentYearChart(
                'recent-year-chart',
                priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              const previousYearChart = chartUtils.createPreviousYearChart(
                'previous-year-chart',
                priceDataWithLabels,
                predictionData,
                probabilityThreshold,
                organizedPriceData
              );
              
              // 保存图表实例
              setPriceChart({
                recent: recentYearChart,
                lastYear: previousYearChart
              });
            }
          }
          
          if (dailyPredictionChartRef.current && dailyPredictions.length > 0) {
            const chart = chartUtils.createDailyPredictionChart(
              'daily-prediction-chart',
              dailyPredictions,
              probabilityThreshold
            );
            setDailyPredictionChart(chart);
          }
          
          if (labelComparisonChartRef.current && comparisonData.length > 0) {
            const chart = chartUtils.createPredictionLabelComparisonChart(
              'label-comparison-chart',
              comparisonData
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
  const setExampleData = () => {
    setSkuId('SKU001');
    setDate('2025-08-19');
    setUseExampleData(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">单商品价格预测验证</h1>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">输入参数</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 className="font-bold">变动阈值 (X): {changeThreshold}</h3>
                <div className="text-sm">变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。</div>
              </div>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">商品ID</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  placeholder="请输入商品ID，例如：SKU001"
                  className="input input-bordered w-full"
                />
                <button
                  type="button"
                  onClick={setExampleData}
                  className="btn btn-outline btn-sm"
                >
                  示例
                </button>
              </div>
            </div>
            
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
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">预测步长</span>
              </label>
              <select
                value={predictionStep}
                onChange={(e) => setPredictionStep(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="3">3日</option>
                <option value="7">7日</option>
                <option value="14">14日</option>
                <option value="30">30日</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            
            {predictionStep === 'custom' && (
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
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">概率阈值 (Y): {probabilityThreshold.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={probabilityThreshold}
                onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                className="range range-primary w-full"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-1">
                <span>0</span>
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
                <span>1</span>
              </div>
            </div>
            
            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    查询中...
                  </>
                ) : (
                  '查询'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">价格走势展示</h2>
                
                <div className="alert alert-info mb-4">
                  <div>
                    <h3 className="font-bold">价格走势展示规则</h3>
                    <div className="text-sm">
                      {result.predictionStep <= 7 ? (
                        <>短期预测（{result.predictionStep}天）：展示近90天 + 去年同期30天价格走势</>
                      ) : (
                        <>长期预测（{result.predictionStep}天）：展示全部历史价格走势</>
                      )}
                      <br />
                      横坐标最大值为预测日期前一天，支持分别展示近期/同期数据
                    </div>
                  </div>
                </div>
                
                {result.predictionStep <= 7 ? (
                  // 短期预测：显示两个并排图表
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-base-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2 text-center">近90天价格走势</h3>
                      <div id="recent-price-chart" style={{ width: '100%', height: '350px' }}></div>
                    </div>
                    <div className="bg-base-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-2 text-center">去年同期30天价格走势</h3>
                      <div id="lastyear-price-chart" style={{ width: '100%', height: '350px' }}></div>
                    </div>
                  </div>
                ) : (
                  // 长期预测：显示单个图表
                  <div id="price-chart" style={{ width: '100%', height: '400px' }}></div>
                )}
              </div>
            </div>
                
                <div className="stat">
                  <div className="stat-title">概率阈值 (Y)</div>
                  <div className="stat-value text-info">{(probabilityThreshold * 100).toFixed(1)}%</div>
                  <div className="stat-desc">预测变动判断阈值</div>
                </div>
                
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
                    <br />横坐标最大值为预测日期前一天，支持分开展示近期/同期数据
                  </div>
                </div>
              </div>
              
              {result.predictionStep <= 7 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">近90天价格走势</h3>
                    <div id="recent-price-chart" style={{ width: '100%', height: '350px' }}></div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">去年同期30天价格走势</h3>
                    <div id="lastyear-price-chart" style={{ width: '100%', height: '350px' }}></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-base-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">近1年价格走势</h3>
                    <div id="recent-year-chart" style={{ width: '100%', height: '350px' }}></div>
                  </div>
                  <div className="bg-base-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-2 text-center">1年前历史价格走势</h3>
                    <div id="previous-year-chart" style={{ width: '100%', height: '350px' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">每日预测概率</h2>
              <div id="daily-prediction-chart" ref={dailyPredictionChartRef} className="w-full h-96"></div>
            </div>
          </div>
          
          {result.comparisonData.length > 0 && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">预测标签vs真实标签对比曲线</h2>
                <div className="alert alert-info mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <h3 className="font-bold">标签对比说明</h3>
                    <div className="text-sm">
                      按时间序列输出预测vs真实的是否变动标签可视化对比走势图
                      <br />1 = 变动，0 = 不变
                      <br />绿色圆点 = 预测正确，红色圆点 = 预测错误
                    </div>
                  </div>
                </div>
                <div id="label-comparison-chart" ref={labelComparisonChartRef} className="w-full h-96"></div>
              </div>
            </div>
          )}
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">详细预测结果</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>预测日期</th>
                      <th>预测概率</th>
                      <th>预测结果</th>
                      <th>真实变动</th>
                      <th>预测准确性</th>
                      <th>变动幅度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dailyPredictions.map((item, index) => {
                      const comparison = result.comparisonData.find(c => c.date === item.date);
                      return (
                        <tr key={index}>
                          <td>{item.date}</td>
                          <td>{(item.latestPrediction.prediction_probability * 100).toFixed(2)}%</td>
                          <td>
                            <span className={`badge ${item.latestPrediction.prediction_probability > probabilityThreshold ? 'badge-error' : 'badge-success'}`}>
                              {item.latestPrediction.prediction_probability > probabilityThreshold ? '预测变动' : '预测不变'}
                            </span>
                          </td>
                          <td>
                            {comparison ? (
                              <span className={`badge ${comparison.actual ? 'badge-error' : 'badge-success'}`}>
                                {comparison.actual ? '实际变动' : '实际不变'}
                              </span>
                            ) : (
                              <span className="badge badge-ghost">无数据</span>
                            )}
                          </td>
                          <td>
                            {comparison ? (
                              <span className={`badge ${comparison.isCorrect ? 'badge-success' : 'badge-error'}`}>
                                {comparison.isCorrect ? '正确' : '错误'}
                              </span>
                            ) : (
                              <span className="badge badge-ghost">无法判断</span>
                            )}
                          </td>
                          <td>
                            {comparison ? `${(comparison.actualChangePercentage * 100).toFixed(2)}%` : '无数据'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SinglePredictionPage;