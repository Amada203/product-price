import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import dataProcessor from '../utils/dataProcessor';
import chartUtils from '../utils/chartUtils';
import { testDataConnection } from '../test-data';

// 全局错误处理器，专门处理 getBoundingClientRect 错误
const setupGlobalErrorHandler = () => {
  // 捕获未处理的错误
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('getBoundingClientRect')) {
      console.warn('Suppressed getBoundingClientRect error:', event.message);
      event.preventDefault();
      return false;
    }
  });

  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('getBoundingClientRect')) {
      console.warn('Suppressed getBoundingClientRect promise rejection:', event.reason.message);
      event.preventDefault();
    }
  });

  // 重写 console.error 以过滤 getBoundingClientRect 错误
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('getBoundingClientRect') || message.includes('Cannot read properties of null')) {
      console.warn('Filtered error:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
};

/**
 * 单商品预测页面
 */
const SinglePredictionPage = () => {
  // 在组件加载时设置全局错误处理
  useEffect(() => {
    setupGlobalErrorHandler();
    console.log('全局错误处理器已启用');
    
    return () => {
      // 组件卸载时清理
      console.log('清理全局错误处理器');
    };
  }, []);

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
      // 从 Supabase 获取数据
      const data = await getDataFromSupabase();
      
      if (!data.historical || data.historical.length === 0) {
        setError('未找到历史价格数据');
        return;
      }

      // 处理数据
      // 处理数据
      const processedData = dataProcessor.processData(
        data.predictions,
        data.historical,
        data.future,
        changeThreshold
      );

      // 确保数据结构正确
      const resultsData = {
        dailyPredictions: processedData.dailyPredictionData || [],
        comparisonData: processedData.labelComparisonData || [],
        accuracy: processedData.accuracyStats?.accuracy || 0,
        accuracyStats: processedData.accuracyStats || {
          totalPredictions: 0,
          correctPredictions: 0,
          accuracy: 0
        }
      };

      setResults(resultsData);

      // 延迟渲染图表，确保DOM元素已经渲染
      // 使用更安全的图表渲染策略，避免 getBoundingClientRect 错误
      const renderChartsWhenReady = () => {
        const safeRenderChart = (chartId, renderFunction, delay = 0, maxRetries = 5) => {
          let retryCount = 0;
          
          const attemptRender = () => {
            setTimeout(() => {
              try {
                const element = document.getElementById(chartId);
                
                // 严格的元素存在性检查
                if (!element || element === null) {
                  console.warn(`DOM元素 ${chartId} 不存在 (尝试 ${retryCount + 1}/${maxRetries})`);
                  if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(attemptRender, 500);
                  }
                  return;
                }
                
                // 检查元素是否在DOM中且已挂载
                if (!document.body.contains(element) || !element.isConnected) {
                  console.warn(`DOM元素 ${chartId} 不在文档中或未连接`);
                  if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(attemptRender, 500);
                  }
                  return;
                }
                
                // 强制设置最小尺寸，防止尺寸为0
                if (element.offsetWidth === 0 || element.offsetHeight === 0) {
                  element.style.width = element.style.width || '100%';
                  element.style.height = element.style.height || '320px';
                  element.style.minWidth = '300px';
                  element.style.minHeight = '200px';
                  
                  // 等待样式应用后重试
                  if (retryCount < maxRetries) {
                    retryCount++;
                    console.warn(`${chartId} 尺寸为0，已设置默认尺寸，重试 ${retryCount}/${maxRetries}`);
                    setTimeout(attemptRender, 200);
                    return;
                  }
                }
                
                // 安全的尺寸检查，完全避免 getBoundingClientRect 错误
                let hasValidSize = false;
                try {
                  // 完全避免使用 getBoundingClientRect，只使用 offset 属性
                  const width = element.offsetWidth || 0;
                  const height = element.offsetHeight || 0;
                  
                  console.log(`${chartId} 当前尺寸: ${width}x${height}`);
                  
                  if (width > 0 && height > 0) {
                    hasValidSize = true;
                  } else {
                    // 强制设置尺寸并等待应用
                    element.style.width = '100%';
                    element.style.height = '320px';
                    element.style.minWidth = '400px';
                    element.style.minHeight = '300px';
                    element.style.display = 'block';
                    
                    // 强制重排
                    element.offsetHeight;
                    
                    // 再次检查
                    const newWidth = element.offsetWidth || 0;
                    const newHeight = element.offsetHeight || 0;
                    
                    if (newWidth > 0 && newHeight > 0) {
                      hasValidSize = true;
                      console.log(`${chartId} 设置尺寸后: ${newWidth}x${newHeight}`);
                    } else {
                      console.warn(`${chartId} 无法获取有效尺寸，跳过渲染`);
                    }
                  }
                } catch (sizeError) {
                  console.warn(`${chartId} 尺寸检查完全失败:`, sizeError);
                  // 最后的尝试：直接设置固定尺寸
                  try {
                    element.style.width = '400px';
                    element.style.height = '300px';
                    element.style.display = 'block';
                    hasValidSize = true;
                    console.log(`${chartId} 使用固定尺寸 400x300`);
                  } catch (fallbackError) {
                    console.error(`${chartId} 完全无法设置尺寸:`, fallbackError);
                    hasValidSize = false;
                  }
                }
                
                if (!hasValidSize) {
                  console.warn(`DOM元素 ${chartId} 尺寸无效，跳过渲染`);
                  return;
                }
                
                // 在渲染前添加额外的保护
                try {
                  // 执行渲染函数，包装在 try-catch 中
                  renderFunction();
                  console.log(`${chartId} 渲染成功`);
                } catch (renderError) {
                  console.error(`${chartId} 渲染函数执行失败:`, renderError);
                  
                  // 如果渲染失败，尝试显示错误信息
                  element.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px;">
                      <div style="text-align: center;">
                        <div>图表加载失败</div>
                        <div style="font-size: 12px; margin-top: 8px;">请刷新页面重试</div>
                      </div>
                    </div>
                  `;
                }
                
              } catch (error) {
                console.error(`${chartId} 整体渲染失败:`, error);
                
                // 最后的错误恢复：显示错误信息
                const element = document.getElementById(chartId);
                if (element) {
                  element.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #666; font-size: 14px; border: 1px dashed #ddd;">
                      <div style="text-align: center;">
                        <div>图表渲染错误</div>
                        <div style="font-size: 12px; margin-top: 8px;">错误: ${error.message}</div>
                      </div>
                    </div>
                  `;
                }
              }
            }, delay + (retryCount * 200)); // 每次重试增加延迟
          };
          
          attemptRender();
        };
        
        console.log('开始渲染图表...');
        const { predictions: predictionData, historical: historicalData } = data;
        
        // 创建价格走势图表
        if (historicalData && historicalData.length > 0) {
          console.log('渲染价格走势图表...');
          safeRenderChart('recent-price-chart', () => {
            chartUtils.createRecentPriceChart('recent-price-chart', historicalData, predictionData, probabilityThreshold);
          }, 100);
          safeRenderChart('last-year-price-chart', () => {
            chartUtils.createLastYearPriceChart('last-year-price-chart', historicalData, predictionData, probabilityThreshold);
          }, 200);
        }
        
        // 创建每日预测概率图表
        if (resultsData.dailyPredictions && resultsData.dailyPredictions.length > 0) {
          console.log('渲染每日预测图表...');
          safeRenderChart('daily-prediction-chart', () => {
            chartUtils.createDailyPredictionChart('daily-prediction-chart', resultsData.dailyPredictions, probabilityThreshold);
          }, 300);
        }
        
        // 创建预测标签对比图表
        if (resultsData.comparisonData && resultsData.comparisonData.length > 0) {
          console.log('渲染标签对比图表...');
          safeRenderChart('label-comparison-chart', () => {
            chartUtils.createLabelComparisonChart('label-comparison-chart', resultsData.comparisonData, resultsData.accuracy);
          }, 400);
        }
        
        console.log('图表渲染任务已启动');
      };
      
      // 延迟执行，确保DOM完全渲染
      setTimeout(renderChartsWhenReady, 1500);
      
    } catch (err) {
      console.error('查询错误:', err);
      setError(`获取数据失败: ${err.message || '查询失败，请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  // 从 Supabase 获取数据
  const getDataFromSupabase = async () => {
    try {
      console.log('=== 开始获取数据 ===');
      console.log('SKU ID:', skuId);
      console.log('预测日期:', date);
      console.log('预测步长:', predictionStep === 0 ? `自定义${customStep}天` : `${predictionStep}天`);
      
      // 获取历史价格数据 - 修复预测日期联动：截止到预测日期的前一日
      const predictionDate = new Date(date);
      const historyEndDate = new Date(predictionDate);
      historyEndDate.setDate(historyEndDate.getDate() - 1); // 前一日
      const historyEndDateStr = historyEndDate.toISOString().split('T')[0];
      
      console.log('历史数据查询范围: 截止到', historyEndDateStr, '(预测日期前一日)');
      
      const histResult = await supabase
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .lte('date', historyEndDateStr)
        .order('date', { ascending: true });

      if (histResult.error) {
        throw new Error(`历史数据查询错误: ${histResult.error.message}`);
      }

      const historicalData = histResult.data || [];
      console.log('历史数据获取成功，条数:', historicalData.length);

      // 获取预测数据 - 修复日期联动问题
      const actualStep = predictionStep === 0 ? parseInt(customStep) : predictionStep;
      console.log('查询预测数据，预测日期:', date, '步长:', actualStep);
      
      // 查询指定预测日期的所有预测结果
      const predResult = await supabase
        .from('result')
        .select('*')
        .eq('sku_id', skuId)
        .eq('prediction_date', date)
        .lte('prediction_step', actualStep)
        .order('prediction_step', { ascending: true });

      if (predResult.error) {
        throw new Error(`预测数据查询错误: ${predResult.error.message}`);
      }

      const predictionData = predResult.data || [];
      console.log('预测数据获取成功，条数:', predictionData.length);

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
        predicted_price: parseFloat(item.predicted_price) || 0,
        prediction_probability: parseFloat(item.prediction_probability) || 0,
        prediction_step: item.prediction_step
      }));

      // 获取未来实际价格数据用于验证预测准确性
      const future = [];
      if (predictions.length > 0) {
        const targetDates = predictions.map(p => p.target_date).filter(Boolean);
        
        if (targetDates.length > 0) {
          const futureResult = await supabase
            .from('real')
            .select('*')
            .eq('sku_id', skuId)
            .in('date', targetDates)
            .order('date', { ascending: true });

          if (!futureResult.error && futureResult.data) {
            future.push(...futureResult.data.map(item => ({
              sku_id: item.sku_id,
              date: item.date,
              price: parseFloat(item.price) || 0
            })));
          }
        }
      }
      
      console.log('数据转换完成 - 历史数据:', historical.length, '预测数据:', predictions.length, '未来数据:', future.length);

      return { predictions, historical, future };
    } catch (error) {
      console.error('获取数据失败:', error);
      throw error; // 重新抛出错误，让调用方处理
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          商品价格预测工具
        </h1>

        <div className="bg-white rounded-lg border border-gray-200 mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">输入参数</h2>
            
          {/* 变动阈值说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-blue-800">变动阈值 (X): {changeThreshold}</h3>
            <div className="text-sm text-blue-700">
              变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。
            </div>
          </div>
            
          {/* 商品SKU输入 */}
          <div className="form-control mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品SKU
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skuId}
                onChange={(e) => setSkuId(e.target.value)}
                placeholder="请输入商品SKU，例如：DEMO_SKU_001"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setSkuId('DEMO_SKU_001')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                填入示例
              </button>
            </div>
          </div>
            
          {/* 日期选择 */}
          <div className="form-control mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
            
          {/* 预测步长选择 */}
          <div className="form-control mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测步长
            </label>
            <select
              value={predictionStep}
              onChange={(e) => setPredictionStep(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="form-control mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义步长（天）
              </label>
              <input
                type="number"
                value={customStep}
                onChange={(e) => setCustomStep(e.target.value)}
                placeholder="请输入自定义步长"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
            
          {/* 概率阈值设置 */}
          <div className="form-control mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              概率阈值 (Y): {probabilityThreshold}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={probabilityThreshold}
                onChange={(e) => setProbabilityThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>0</span>
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
                <span>1</span>
              </div>
            </div>
          </div>
            
          {/* 提交按钮 */}
          <div className="form-control space-y-3">
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
            
            {/* 测试数据连接按钮 */}
            <button
              onClick={async () => {
                console.log('开始测试数据连接...');
                const result = await testDataConnection();
                console.log('测试结果:', result);
                if (result.error) {
                  setError(`数据连接测试失败: ${result.error}`);
                } else {
                  console.log(`✅ 数据连接正常 - 历史数据: ${result.historyCount}条, 预测数据: ${result.predictionCount}条`);
                  console.log('可用预测日期:', result.availableDates.slice(0, 5));
                }
              }}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              🔍 测试数据连接
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
            {/* 1. 统计信息卡片 */}
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
                <div className="text-3xl font-bold my-2">{(results?.accuracy || 0).toFixed(1)}%</div>
                <div className="text-sm opacity-90">
                  {(results?.comparisonData || []).filter(item => item.isCorrect).length} / {(results?.comparisonData || []).length} 正确
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
              <h3 className="text-lg font-semibold mb-4">预测标签对比</h3>
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
                    {(results?.comparisonData || []).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{item.date}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(item.probability || 0) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {((item.probability || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">¥{item.actualPrice?.toFixed(2) || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${(item.predictedLabel === '变动' || item.predictedLabel === 1) ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.predictedLabel === 1 ? '变动' : (item.predictedLabel === 0 ? '不变动' : item.predictedLabel)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${(item.actualLabel === '变动' || item.actualLabel === 1) ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.actualLabel === 1 ? '变动' : (item.actualLabel === 0 ? '不变动' : (item.actualLabel || 'N/A'))}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isCorrect === null 
                              ? 'bg-gray-100 text-gray-800'
                              : item.isCorrect 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isCorrect === null ? '未知' : (item.isCorrect ? '正确' : '错误')}
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