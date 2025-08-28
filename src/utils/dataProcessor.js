/**
 * 数据处理工具类
 * 提供数据处理相关的方法
 */
const dataProcessor = {
  /**
   * 生成日期范围
   * @param {string} startDate - 开始日期，格式：YYYY-MM-DD
   * @param {number} days - 天数
   * @returns {Array} 日期范围数组
   */
  generateDateRange(startDate, days) {
    const result = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      result.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  },
  
  /**
   * 前向填充数据
   * @param {Array} data - 原始数据
   * @param {string} dateField - 日期字段名
   * @param {string} valueField - 值字段名
   * @param {string} startDate - 开始日期，格式：YYYY-MM-DD
   * @param {string} endDate - 结束日期，格式：YYYY-MM-DD
   * @returns {Array} 填充后的数据
   */
  forwardFill(data, dateField, valueField, startDate, endDate) {
    if (!data || data.length === 0) {
      return [];
    }
    
    // 按日期排序
    const sortedData = [...data].sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
    
    // 生成日期范围
    const dateRange = this.generateDateRange(startDate, this.daysBetween(startDate, endDate) + 1);
    
    // 创建结果数组
    const result = [];
    
    // 初始值
    let lastValue = null;
    let lastItem = null;
    
    // 遍历日期范围
    for (const date of dateRange) {
      // 查找当前日期的数据
      const item = sortedData.find(d => d[dateField] === date);
      
      if (item) {
        // 如果找到数据，更新最后的值
        lastValue = item[valueField];
        lastItem = { ...item };
        result.push(item);
      } else if (lastValue !== null) {
        // 如果没有找到数据，但有前一个值，使用前向填充
        const filledItem = {
          ...lastItem,
          [dateField]: date,
          [valueField]: lastValue,
          filled: true // 标记为填充数据
        };
        result.push(filledItem);
      }
    }
    
    return result;
  },
  
  /**
   * 计算两个日期之间的天数
   * @param {string} startDate - 开始日期，格式：YYYY-MM-DD
   * @param {string} endDate - 结束日期，格式：YYYY-MM-DD
   * @returns {number} 天数
   */
  daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },
  
  /**
   * 计算价格变动标签
   * @param {Array} data - 价格数据
   * @param {string} dateField - 日期字段名
   * @param {string} priceField - 价格字段名
   * @param {number} threshold - 变动阈值
   * @returns {Array} 带有变动标签的数据
   */
  calculatePriceChangeLabels(data, dateField, priceField, threshold) {
    if (!data || data.length < 2) {
      return data;
    }
    
    // 按日期排序
    const sortedData = [...data].sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
    
    // 计算变动标签
    const result = sortedData.map((item, index) => {
      if (index === 0) {
        // 第一个数据点没有前一天的数据，无法计算变动
        return { ...item, changeLabel: false };
      }
      
      const currentPrice = item[priceField];
      const previousPrice = sortedData[index - 1][priceField];
      
      // 计算变动百分比
      const changePercentage = Math.abs((currentPrice - previousPrice) / previousPrice);
      
      // 根据阈值确定是否变动
      const changeLabel = changePercentage > threshold;
      
      return { ...item, changeLabel, changePercentage };
    });
    
    return result;
  },
  
  /**
   * 生成示例预测数据
   * @param {string} skuId - 商品ID
   * @param {Array} dateRange - 日期范围
   * @returns {Array} 示例预测数据
   */
  generateExamplePredictionData(skuId, dateRange) {
    const result = [];
    const predictionDate = new Date(dateRange[0]);
    predictionDate.setDate(predictionDate.getDate() - 7); // 假设是7天前做的预测
    
    dateRange.forEach((targetDate, index) => {
      // 生成一些随机概率，但保持一定的连续性
      const baseProbability = Math.random() * 0.3 + 0.1; // 0.1 到 0.4 之间
      
      // 为每个目标日期生成1-3个不同日期的预测
      const numPredictions = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numPredictions; i++) {
        const predDate = new Date(predictionDate);
        predDate.setDate(predDate.getDate() + i);
        
        // 调整概率，使得越近的预测越准确
        const adjustedProb = baseProbability + (i * 0.05);
        
        result.push({
          sku_id: skuId,
          prediction_date: predDate.toISOString().split('T')[0],
          target_date: targetDate,
          prediction_step: dateRange.length - index,
          prediction_probability: Math.min(adjustedProb, 0.95)
        });
      }
    });
    
    return result;
  },
  
  /**
   * 生成示例历史价格数据
   * @param {string} skuId - 商品ID
   * @param {string} startDate - 开始日期
   * @param {number} days - 天数
   * @returns {Array} 示例价格数据
   */
  generateExamplePriceData(skuId, startDate, days) {
    const result = [];
    const basePrice = Math.floor(Math.random() * 500) + 100; // 100 到 600 之间的基础价格
    let currentPrice = basePrice;
    
    const startDateObj = new Date(startDate);
    startDateObj.setDate(startDateObj.getDate() - days);
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + i);
      
      // 随机价格波动，但保持一定的连续性
      const change = (Math.random() - 0.5) * 10;
      currentPrice = Math.max(50, currentPrice + change);
      
      // 有10%的概率价格会有较大变动
      if (Math.random() < 0.1) {
        currentPrice = currentPrice * (Math.random() * 0.2 + 0.9); // 90% 到 110% 之间的变动
      }
      
      result.push({
        sku_id: skuId,
        date: currentDate.toISOString().split('T')[0],
        price: Math.round(currentPrice)
      });
    }
    
    return result;
  },
  
  /**
   * 生成示例未来价格数据
   * @param {string} skuId - 商品ID
   * @param {Array} dateRange - 日期范围
   * @returns {Array} 示例未来价格数据
   */
  generateExampleFuturePriceData(skuId, dateRange) {
    const result = [];
    const basePrice = Math.floor(Math.random() * 500) + 100; // 100 到 600 之间的基础价格
    let currentPrice = basePrice;
    
    dateRange.forEach((date, index) => {
      // 随机价格波动，但保持一定的连续性
      const change = (Math.random() - 0.5) * 10;
      currentPrice = Math.max(50, currentPrice + change);
      
      // 有10%的概率价格会有较大变动
      if (Math.random() < 0.1) {
        currentPrice = currentPrice * (Math.random() * 0.2 + 0.9); // 90% 到 110% 之间的变动
      }
      
      result.push({
        sku_id: skuId,
        date: date,
        price: Math.round(currentPrice)
      });
    });
    
    return result;
  },

  /**
   * 减去指定天数
   * @param {string} date - 日期字符串，格式：YYYY-MM-DD
   * @param {number} days - 要减去的天数
   * @returns {string} 减去天数后的日期字符串
   */
  subtractDays(date, days) {
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() - days);
    return dateObj.toISOString().split('T')[0];
  },

  /**
   * 减去指定年数
   * @param {string} date - 日期字符串，格式：YYYY-MM-DD
   * @param {number} years - 要减去的年数
   * @returns {string} 减去年数后的日期字符串
   */
  subtractYears(date, years) {
    const dateObj = new Date(date);
    dateObj.setFullYear(dateObj.getFullYear() - years);
    return dateObj.toISOString().split('T')[0];
  },

  /**
   * 计算预测准确率
   * @param {Array} predictionData - 预测数据
   * @param {Array} futurePriceData - 未来价格数据
   * @param {Array} historicalPriceData - 历史价格数据
   * @param {Array} dateRange - 日期范围
   * @param {number} probabilityThreshold - 概率阈值
   * @param {number} changeThreshold - 变动阈值
   * @returns {Array} 对比数据
   */
  calculatePredictionAccuracy(predictionData, futurePriceData, historicalPriceData, dateRange, probabilityThreshold, changeThreshold) {
    const comparisonData = [];
    
    // 按目标日期组织预测数据
    const predictionsByDate = {};
    dateRange.forEach(d => {
      predictionsByDate[d] = [];
    });
    
    // 将预测结果按目标日期分组
    predictionData.forEach(prediction => {
      if (dateRange.includes(prediction.target_date)) {
        predictionsByDate[prediction.target_date].push(prediction);
      }
    });
    
    // 合并所有价格数据
    const allPriceData = [...(historicalPriceData || []), ...(futurePriceData || [])];
    
    // 遍历日期范围
    for (const targetDate of dateRange) {
      // 获取该日期的预测结果
      const predictions = predictionsByDate[targetDate] || [];
      
      if (predictions.length > 0) {
        // 按预测日期排序，获取最新的预测结果
        predictions.sort((a, b) => new Date(a.prediction_date) - new Date(b.prediction_date));
        const latestPrediction = predictions[predictions.length - 1];
        
        // 查询目标日期的真实价格
        const realPriceItem = futurePriceData?.find(item => item.date === targetDate);
        
        if (realPriceItem) {
          // 查找前一天的价格
          const previousDate = new Date(targetDate);
          previousDate.setDate(previousDate.getDate() - 1);
          const formattedPreviousDate = previousDate.toISOString().split('T')[0];
          
          const previousPriceItem = allPriceData.find(item => item.date === formattedPreviousDate);
          
          if (previousPriceItem) {
            // 计算真实价格变动百分比
            const currentPrice = realPriceItem.price;
            const previousPrice = previousPriceItem.price;
            const changePercentage = Math.abs((currentPrice - previousPrice) / previousPrice);
            
            // 根据阈值确定是否变动
            const actualChange = changePercentage > changeThreshold;
            
            // 根据概率阈值确定预测的变动标签
            const predictedChange = latestPrediction.prediction_probability > probabilityThreshold;
            
            // 判断预测是否正确
            const isCorrect = predictedChange === actualChange;
            
            comparisonData.push({
              date: targetDate,
              predicted: predictedChange,
              actual: actualChange,
              isCorrect,
              predictionProbability: latestPrediction.prediction_probability,
              actualChangePercentage: changePercentage
            });
          }
        }
      }
    }
    
    return comparisonData;
  },

  /**
   * 组织每日预测数据
   * @param {Array} predictionData - 预测数据
   * @param {Array} dateRange - 日期范围
   * @returns {Array} 每日预测数据
   */
  organizeDailyPredictions(predictionData, dateRange) {
    const dailyPredictions = [];
    
    // 按目标日期组织预测数据
    const predictionsByDate = {};
    dateRange.forEach(d => {
      predictionsByDate[d] = [];
    });
    
    // 将预测结果按目标日期分组
    predictionData.forEach(prediction => {
      if (dateRange.includes(prediction.target_date)) {
        predictionsByDate[prediction.target_date].push(prediction);
      }
    });
    
    // 遍历日期范围
    for (const targetDate of dateRange) {
      const predictions = predictionsByDate[targetDate] || [];
      
      if (predictions.length > 0) {
        // 按预测日期排序
        predictions.sort((a, b) => new Date(a.prediction_date) - new Date(b.prediction_date));
        
        // 获取最新的预测结果
        const latestPrediction = predictions[predictions.length - 1];
        
        dailyPredictions.push({
          date: targetDate,
          predictions: predictions,
          latestPrediction: latestPrediction
        });
      }
    }
    
    return dailyPredictions;
  },

  /**
   * 计算准确率统计信息
   * @param {Array} comparisonData - 对比数据
   * @returns {Object} 准确率统计信息
   */
  calculateAccuracyStats(comparisonData) {
    if (!comparisonData || comparisonData.length === 0) {
      console.warn('calculateAccuracyStats: 没有对比数据');
      return {
        overall: 0,
        correct: 0,
        total: 0
      };
    }

    console.log('=== calculateAccuracyStats 开始计算 ===');
    console.log('对比数据:', comparisonData);

    // 过滤出有效的对比数据（排除无法验证的数据）
    const validData = comparisonData.filter(item => item.isCorrect !== null && item.isCorrect !== undefined);
    
    console.log('有效数据:', validData);

    if (validData.length === 0) {
      console.warn('没有有效的对比数据');
      return {
        overall: 0,
        correct: 0,
        total: 0
      };
    }

    // 计算整体准确率
    const correctPredictions = validData.filter(item => item.isCorrect === true);
    const overallAccuracy = correctPredictions.length / validData.length;

    console.log('准确率计算结果:', {
      正确预测数: correctPredictions.length,
      总预测数: validData.length,
      准确率: overallAccuracy
    });

    const stats = {
      overall: overallAccuracy,
      correct: correctPredictions.length,
      total: validData.length
    };

    return stats;
  },

  /**
   * 按时间序列组织价格数据
   * @param {Object} historicalData - 历史数据对象 {recentData, lastYearData}
   * @param {Array} futurePriceData - 未来价格数据
   * @param {string} startDate - 开始日期
   * @param {number} predictionStep - 预测步长
   * @returns {Object} 组织后的价格数据
   */
  organizePriceDataByTimeframe(historicalData, futurePriceData, startDate, predictionStep) {
    const result = {
      recentData: [],
      lastYearData: [],
      futureData: [],
      combinedData: []
    };

    const startDateObj = new Date(startDate);
    
    // 计算时间范围
    const recent90DaysStart = new Date(startDateObj);
    recent90DaysStart.setDate(recent90DaysStart.getDate() - 90);
    
    const recent90DaysEnd = new Date(startDateObj);
    recent90DaysEnd.setDate(recent90DaysEnd.getDate() - 1); // 预测开始日期的前一天
    
    // 去年同期：根据预测步长确定范围
    const lastYearStart = new Date(startDateObj);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    if (predictionStep <= 7) {
      // 短期预测：去年同期30天
      lastYearStart.setDate(lastYearStart.getDate() - 15);
    } else {
      // 中期预测：去年同期更长时间
      lastYearStart.setDate(lastYearStart.getDate() - 30);
    }
    
    const lastYearEnd = new Date(startDateObj);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    if (predictionStep <= 7) {
      lastYearEnd.setDate(lastYearEnd.getDate() + 15);
    } else {
      lastYearEnd.setDate(lastYearEnd.getDate() + 30);
    }

    // 处理近期数据（最近90天到预测开始日期前一天）
    if (historicalData.recentData && historicalData.recentData.length > 0) {
      result.recentData = historicalData.recentData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= recent90DaysStart && itemDate <= recent90DaysEnd;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // 处理去年同期数据
    if (historicalData.lastYearData && historicalData.lastYearData.length > 0) {
      result.lastYearData = historicalData.lastYearData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= lastYearStart && itemDate <= lastYearEnd;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // 处理未来数据（预测期间的真实数据）
    if (futurePriceData && futurePriceData.length > 0) {
      const futureEndDate = new Date(startDateObj);
      futureEndDate.setDate(futureEndDate.getDate() + predictionStep);
      
      result.futureData = futurePriceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDateObj && itemDate <= futureEndDate;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // 合并所有数据用于综合视图
    result.combinedData = [
      ...result.recentData,
      ...result.futureData
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    return result;
  },

  /**
   * 合并价格数据和预测标签
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {number} changeThreshold - 变动阈值
   * @returns {Array} 合并后的数据
   */
  mergePriceDataWithLabels(priceData, predictionData, probabilityThreshold, changeThreshold) {
    if (!priceData || priceData.length === 0) {
      return [];
    }

    // 按日期排序价格数据
    const sortedPriceData = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 创建预测数据的映射
    const predictionMap = {};
    predictionData.forEach(pred => {
      if (!predictionMap[pred.target_date]) {
        predictionMap[pred.target_date] = [];
      }
      predictionMap[pred.target_date].push(pred);
    });

    // 为每个价格数据点添加预测标签
    const result = sortedPriceData.map((priceItem, index) => {
      const item = { ...priceItem };
      
      // 计算价格变动标签
      if (index > 0) {
        const currentPrice = priceItem.price;
        const previousPrice = sortedPriceData[index - 1].price;
        const changePercentage = Math.abs((currentPrice - previousPrice) / previousPrice);
        item.changeLabel = changePercentage > changeThreshold;
        item.changePercentage = changePercentage;
      } else {
        item.changeLabel = false;
        item.changePercentage = 0;
      }

      // 添加预测信息
      const predictions = predictionMap[priceItem.date] || [];
      if (predictions.length > 0) {
        // 获取最新的预测
        const latestPrediction = predictions.sort((a, b) => new Date(b.prediction_date) - new Date(a.prediction_date))[0];
        item.prediction = latestPrediction;
        item.predictedChange = latestPrediction.prediction_probability > probabilityThreshold;
      }

      return item;
    });

    return result;
  },

  /**
   * 生成每日预测概率数据
   * @param {Array} predictionData - 预测数据
   * @returns {Array} 每日预测数据
   */
  generateDailyPredictionData(predictionData) {
    if (!predictionData || predictionData.length === 0) {
      console.warn('generateDailyPredictionData: 没有预测数据');
      return [];
    }

    console.log('=== generateDailyPredictionData 开始处理 ===');
    console.log('输入预测数据:', predictionData);

    // 按目标日期分组
    const predictionsByDate = {};
    predictionData.forEach(pred => {
      const targetDate = pred.target_date;
      if (!targetDate) {
        console.warn('预测数据缺少 target_date:', pred);
        return;
      }
      
      if (!predictionsByDate[targetDate]) {
        predictionsByDate[targetDate] = [];
      }
      predictionsByDate[targetDate].push(pred);
    });

    console.log('按日期分组的预测数据:', predictionsByDate);

    // 为每个日期生成预测数据
    const result = Object.keys(predictionsByDate).map(date => {
      const predictions = predictionsByDate[date];
      // 按预测日期排序，获取最新的预测
      predictions.sort((a, b) => new Date(b.prediction_date) - new Date(a.prediction_date));
      const latestPrediction = predictions[0];

      // 从 Supabase 数据中正确提取概率值
      const probability = parseFloat(latestPrediction.probability) || 
                         parseFloat(latestPrediction.prediction_probability) || 0;

      console.log(`日期 ${date} 的预测概率:`, {
        原始数据: latestPrediction,
        提取的概率: probability
      });

      return {
        date: date,
        predictions: predictions,
        latestPrediction: latestPrediction,
        probability: probability
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log('最终每日预测数据:', result);
    return result;
  },

  /**
   * 生成预测标签与真实标签对比数据
   * @param {Array} predictionData - 预测数据
   * @param {Array} futurePriceData - 未来价格数据
   * @param {Array} historicalData - 历史价格数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {number} changeThreshold - 变动阈值
   * @returns {Array} 对比数据
   */
  generateLabelComparisonData(predictionData, futurePriceData, historicalData, probabilityThreshold, changeThreshold) {
    if (!predictionData || predictionData.length === 0) {
      console.warn('generateLabelComparisonData: 没有预测数据');
      return [];
    }

    console.log('=== generateLabelComparisonData 开始处理 ===');
    console.log('预测数据:', predictionData);
    console.log('未来价格数据:', futurePriceData);
    console.log('历史价格数据:', historicalData);

    // 按目标日期分组预测数据
    const predictionsByDate = {};
    predictionData.forEach(pred => {
      const targetDate = pred.target_date;
      if (!targetDate) {
        console.warn('预测数据缺少 target_date:', pred);
        return;
      }
      
      if (!predictionsByDate[targetDate]) {
        predictionsByDate[targetDate] = [];
      }
      predictionsByDate[targetDate].push(pred);
    });

    // 合并所有价格数据（历史+未来）
    const allPriceData = [...(historicalData || []), ...(futurePriceData || [])];
    const priceMap = {};
    allPriceData.forEach(price => {
      priceMap[price.date] = parseFloat(price.price);
    });

    console.log('价格数据映射:', priceMap);

    const result = [];

    Object.keys(predictionsByDate).forEach(targetDate => {
      const predictions = predictionsByDate[targetDate];
      // 获取最新的预测
      predictions.sort((a, b) => new Date(b.prediction_date) - new Date(a.prediction_date));
      const latestPrediction = predictions[0];

      // 从 Supabase 数据中正确提取概率值
      const probability = parseFloat(latestPrediction.probability) || 
                         parseFloat(latestPrediction.prediction_probability) || 0;

      // 预测标签：根据概率阈值判断是否预测价格会变动
      const predictedLabel = probability > probabilityThreshold ? '变动' : '不变';
      
      // 查找实际价格数据
      const actualPrice = priceMap[targetDate];
      let actualLabel = null;
      let actualPriceChange = null;
      let isCorrect = null;

      if (actualPrice !== undefined) {
        // 查找前一天的价格来计算变动
        const previousDate = new Date(targetDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousDateStr = previousDate.toISOString().split('T')[0];
        
        const previousPrice = priceMap[previousDateStr];
        if (previousPrice !== undefined) {
          actualPriceChange = (actualPrice - previousPrice) / previousPrice;
          const actualChangeAbs = Math.abs(actualPriceChange);
          actualLabel = actualChangeAbs > changeThreshold ? '变动' : '不变';
          
          // 简化判断：预测变动 vs 实际是否变动
          const predictedChange = probability > probabilityThreshold;
          const actualChange = actualChangeAbs > changeThreshold;
          isCorrect = predictedChange === actualChange;
        }
      }

      console.log(`日期 ${targetDate} 的对比数据:`, {
        预测概率: probability,
        预测标签: predictedLabel,
        实际价格: actualPrice,
        实际标签: actualLabel,
        预测正确: isCorrect
      });

      result.push({
        date: targetDate,
        predictedLabel: predictedLabel,
        actualLabel: actualLabel || 'N/A',
        isCorrect: isCorrect,
        probability: probability,
        actualPrice: actualPrice || 0,
        actualPriceChange: actualPriceChange
      });
    });

    console.log('最终对比数据:', result);
    return result.sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * 前向填充价格数据
   * @param {Array} priceData - 价格数据
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Array} 填充后的数据
   */
  forwardFill(priceData, startDate, endDate) {
    if (!priceData || priceData.length === 0) {
      return [];
    }

    // 按日期排序
    const sortedData = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 生成日期范围
    const dateRange = this.generateDateRange(startDate, this.daysBetween(startDate, endDate) + 1);
    
    const result = [];
    let lastPrice = null;
    let lastItem = null;

    for (const date of dateRange) {
      const existingItem = sortedData.find(item => item.date === date);
      
      if (existingItem) {
        lastPrice = existingItem.price;
        lastItem = existingItem;
        result.push(existingItem);
      } else if (lastPrice !== null && lastItem) {
        // 前向填充
        result.push({
          ...lastItem,
          date: date,
          price: lastPrice,
          filled: true
        });
      }
    }

    return result;
  },

  /**
   * 处理预测数据的主函数
   * @param {Array} predictionData - 预测数据
   * @param {Array} historicalData - 历史数据
   * @param {Array} futurePriceData - 未来价格数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {number} changeThreshold - 变动阈值
   * @returns {Object} 处理后的数据
   */
  processData(predictionData, historicalData, futurePriceData, probabilityThreshold, changeThreshold) {
    console.log('=== processData 开始处理 ===');
    console.log('输入参数:', {
      预测数据长度: predictionData?.length || 0,
      历史数据长度: historicalData?.length || 0,
      未来价格数据长度: futurePriceData?.length || 0,
      概率阈值: probabilityThreshold,
      变动阈值: changeThreshold
    });

    // 生成日期范围
    const dateRange = [];
    if (predictionData && predictionData.length > 0) {
      const uniqueDates = [...new Set(predictionData.map(p => p.target_date))];
      dateRange.push(...uniqueDates.sort());
    }

    console.log('生成的日期范围:', dateRange);

    // 生成每日预测数据
    const dailyPredictions = this.generateDailyPredictionData(predictionData);
    console.log('每日预测数据处理完成:', dailyPredictions.length, '条');

    // 合并价格数据和预测标签
    const priceDataWithLabels = this.mergePriceDataWithLabels(
      futurePriceData || [],
      predictionData || [],
      probabilityThreshold,
      changeThreshold
    );
    console.log('价格数据与标签合并完成:', priceDataWithLabels.length, '条');

    // 生成预测标签对比数据
    const comparisonData = this.generateLabelComparisonData(
      predictionData || [],
      futurePriceData || [],
      historicalData || [],
      probabilityThreshold,
      changeThreshold
    );
    console.log('预测标签对比数据生成完成:', comparisonData.length, '条');

    // 计算准确率统计
    const accuracyStats = this.calculateAccuracyStats(comparisonData);
    console.log('准确率统计计算完成:', accuracyStats);

    const result = {
      dateRange,
      dailyPredictions,
      priceDataWithLabels,
      comparisonData,
      accuracy: accuracyStats ? (accuracyStats.overall * 100) : 0, // 转换为百分比
      accuracyStats
    };

    console.log('=== processData 处理完成 ===');
    console.log('最终结果:', result);

    return result;
  }
};

export default dataProcessor;
