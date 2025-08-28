import { useState, useEffect, useRef } from 'react';
import supabaseClient from '../utils/supabase';
import dataProcessor from '../utils/dataProcessor';
import chartUtils from '../utils/chartUtils';
import * as echarts from 'echarts';

/**
 * 批量商品预测页面
 */
const BatchPredictionPage = () => {
  // 状态管理
  const [skuIds, setSkuIds] = useState('');
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [predictionStep, setPredictionStep] = useState(7);
  const [customStep, setCustomStep] = useState('');
  const [probabilityThreshold, setProbabilityThreshold] = useState(0.6);
  const [changeThreshold] = useState(0.1); // 变动阈值固定为0.1，不可修改
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [useExampleData, setUseExampleData] = useState(false);
  
  // 图表容器引用
  const accuracyChartRef = useRef(null);
  
  // 图表实例
  const [accuracyChart, setAccuracyChart] = useState(null);

  // 清除图表实例
  useEffect(() => {
    return () => {
      if (accuracyChart) {
        chartUtils.disposeChart(accuracyChart);
      }
    };
  }, [accuracyChart]);

  /**
   * 处理文件上传
   * @param {Event} e - 事件对象
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  /**
   * 从文件中读取SKU IDs
   * @param {File} file - 上传的文件
   * @returns {Promise<Array>} SKU IDs数组
   */
  const readSkuIdsFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split(/\r?\n/);
          const ids = lines
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          resolve(ids);
        } catch (err) {
          reject(new Error('文件格式错误，请上传包含SKU ID的文本文件'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file);
    });
  };

  /**
   * 处理表单提交
   * @param {Event} e - 事件对象
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 获取SKU IDs
    let idList = [];
    
    if (file) {
      try {
        idList = await readSkuIdsFromFile(file);
      } catch (err) {
        setError(err.message);
        return;
      }
    } else if (skuIds.trim()) {
      idList = skuIds.split(/[,;\s]+/).filter(id => id.trim().length > 0);
    } else {
      setError('请输入商品ID或上传文件');
      return;
    }
    
    if (idList.length === 0) {
      setError('未找到有效的商品ID');
      return;
    }
    
    if (!date) {
      setError('请选择日期');
      return;
    }
    
    // 获取实际的预测步长
    const actualStep = predictionStep === 'custom' ? parseInt(customStep) : parseInt(predictionStep);
    
    if (isNaN(actualStep) || actualStep <= 0) {
      setError('预测步长必须是正整数');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      // 计算开始日期和结束日期
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + actualStep);
      
      // 格式化日期
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // 生成日期范围内的所有日期
      const dateRange = dataProcessor.generateDateRange(formattedStartDate, actualStep + 1);
      
      // 存储所有商品的结果
      const allResults = [];
      
      // 处理每个商品ID
      for (const skuId of idList) {
        // 使用示例数据或从数据库获取数据
        const predictionData = useExampleData 
          ? dataProcessor.generateExamplePredictionData(skuId, dateRange)
          : await supabaseClient.fetchPredictionResultsForDateRange(skuId, formattedStartDate, formattedEndDate).then(res => res.data || []);
        
        // 获取历史价格数据
        const historicalData = useExampleData
          ? {
              recentData: dataProcessor.generateExamplePriceData(skuId, dataProcessor.subtractDays(formattedStartDate, 90), 90),
              lastYearData: dataProcessor.generateExamplePriceData(skuId, dataProcessor.subtractDays(dataProcessor.subtractYears(formattedStartDate, 1), 30), 60)
            }
          : await supabaseClient.fetchHistoricalPrices(skuId, date);
        
        // 获取未来价格数据
        const futurePriceData = useExampleData
          ? dataProcessor.generateExamplePriceData(skuId, formattedStartDate, actualStep + 1)
          : await supabaseClient.fetchPricesForDateRange(skuId, formattedStartDate, formattedEndDate).then(res => res.data || []);
        
        // 处理数据并计算准确率
        const comparisonData = dataProcessor.calculatePredictionAccuracy(
          predictionData,
          futurePriceData,
          historicalData.recentData,
          dateRange,
          probabilityThreshold,
          changeThreshold
        );
        
        // 计算准确率
        const accuracy = comparisonData.length > 0 
          ? comparisonData.filter(item => item.isCorrect).length / comparisonData.length 
          : null;
        
        // 添加到结果列表
        allResults.push({
          skuId,
          accuracy,
          comparisonData,
          dailyPredictions: dataProcessor.organizeDailyPredictions(predictionData, dateRange)
        });
      }
      
      // 按准确率排序
      allResults.sort((a, b) => {
        if (a.accuracy === null) return 1;
        if (b.accuracy === null) return -1;
        return b.accuracy - a.accuracy;
      });
      
      // 计算整体准确率
      const totalComparisons = allResults.reduce((sum, result) => sum + (result.comparisonData?.length || 0), 0);
      const totalCorrect = allResults.reduce((sum, result) => {
        return sum + (result.comparisonData?.filter(item => item.isCorrect)?.length || 0);
      }, 0);
      
      const overallAccuracy = totalComparisons > 0 ? totalCorrect / totalComparisons : null;
      
      // 设置结果
      setResults({
        date,
        predictionStep: actualStep,
        dateRange,
        skuIds: idList,
        results: allResults,
        overallAccuracy,
        highestAccuracy: allResults.length > 0 ? allResults[0] : null,
        lowestAccuracy: allResults.length > 0 ? allResults[allResults.length - 1] : null
      });
      
      // 渲染准确率图表
      setTimeout(() => {
        try {
          // 清理之前的图表实例
          if (accuracyChart) {
            chartUtils.disposeChart(accuracyChart);
          }
          
          if (accuracyChartRef.current) {
            // 创建准确率图表
            const chart = chartUtils.createAccuracyChart(
              accuracyChartRef.current,
              allResults.map(result => ({
                skuId: result.skuId,
                accuracy: result.accuracy
              }))
            );
            
            if (chart) {
              setAccuracyChart(chart);
            }
          }
        } catch (error) {
          console.error('渲染准确率图表时出错:', error);
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
    setSkuIds('SKU001,SKU002,SKU003,B07XJ8C8F5');
    setDate(new Date().toISOString().split('T')[0]); // 使用当前日期
    setUseExampleData(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">批量商品价格预测验证</h1>
      
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">输入参数</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 变动阈值说明 */}
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h3 className="font-bold">变动阈值 (X): {changeThreshold}</h3>
                <div className="text-sm">变动阈值是模型训练时设定的参数，用于判断价格变动的幅度。当价格变动百分比超过此阈值时，认为价格发生了变动。此阈值在模型训练开始时设置，不可修改。</div>
              </div>
            </div>
            
            {/* 商品ID输入 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">商品ID列表（用逗号、分号或空格分隔）</span>
              </label>
              <div className="flex gap-2">
                <textarea
                  value={skuIds}
                  onChange={(e) => setSkuIds(e.target.value)}
                  placeholder="请输入商品ID列表，例如：SKU001,SKU002,SKU003"
                  className="textarea textarea-bordered flex-1"
                  rows="3"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={setExampleData}
                    className="btn btn-outline btn-sm"
                  >
                    填入示例
                  </button>
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                      快速选择
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48">
                      <li><a onClick={() => setSkuIds('SKU001,SKU002')}>电子+服装</a></li>
                      <li><a onClick={() => setSkuIds('SKU001,SKU002,SKU003')}>三类商品</a></li>
                      <li><a onClick={() => setSkuIds('B07XJ8C8F5,SKU001')}>真实+示例</a></li>
                      <li><a onClick={() => setSkuIds('SKU001,SKU002,SKU003,B07XJ8C8F5')}>全部示例</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 文件上传 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">或上传包含商品ID的文件（每行一个ID）</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input file-input-bordered w-full"
                accept=".txt,.csv"
              />
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
            
            {/* 自定义步长 */}
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
                <span>0</span>
                <span>0.2</span>
                <span>0.4</span>
                <span>0.6</span>
                <span>0.8</span>
                <span>1</span>
              </div>
            </div>
            
            {/* 使用示例数据选项 */}
            <div className="form-control">
              <label className="cursor-pointer label">
                <span className="label-text">使用示例数据</span>
                <input
                  type="checkbox"
                  checked={useExampleData}
                  onChange={(e) => setUseExampleData(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
            
            {/* 提交按钮 */}
            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    批量查询中...
                  </>
                ) : '开始批量验证'}
              </button>
            </div>
            
            {/* 错误提示 */}
            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* 结果展示 */}
      {results && (
        <div className="mt-8 space-y-8">
          {/* 整体准确率 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">整体预测结果</h2>
              
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">整体准确率</div>
                  <div className="stat-value text-primary">
                    {results.overallAccuracy !== null ? (results.overallAccuracy * 100).toFixed(2) + '%' : '无数据'}
                  </div>
                  <div className="stat-desc">基于所有商品的预测结果</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">最高准确率</div>
                  <div className="stat-value text-success">
                    {results.highestAccuracy?.accuracy !== null ? (results.highestAccuracy.accuracy * 100).toFixed(2) + '%' : '无数据'}
                  </div>
                  <div className="stat-desc">商品ID: {results.highestAccuracy?.skuId || '无数据'}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">最低准确率</div>
                  <div className="stat-value text-error">
                    {results.lowestAccuracy?.accuracy !== null ? (results.lowestAccuracy.accuracy * 100).toFixed(2) + '%' : '无数据'}
                  </div>
                  <div className="stat-desc">商品ID: {results.lowestAccuracy?.skuId || '无数据'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 准确率图表 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">各商品预测准确率</h2>
              <div id="accuracy-chart" ref={accuracyChartRef} className="w-full h-96"></div>
            </div>
          </div>
          
          {/* 详细结果表格 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">详细预测结果</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>商品ID</th>
                      <th>准确率</th>
                      <th>正确预测数</th>
                      <th>总预测数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((result, index) => (
                      <tr key={index}>
                        <td>{result.skuId}</td>
                        <td>
                          {result.accuracy !== null ? (result.accuracy * 100).toFixed(2) + '%' : '无数据'}
                        </td>
                        <td>
                          {result.comparisonData?.filter(item => item.isCorrect)?.length || 0}
                        </td>
                        <td>
                          {result.comparisonData?.length || 0}
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
  );
};

export default BatchPredictionPage;