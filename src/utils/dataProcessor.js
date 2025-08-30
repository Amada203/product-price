/**
 * 数据处理工具类
 * 处理预测数据、价格数据和生成图表所需的数据格式
 */
class DataProcessor {
  /**
   * 生成日期范围
   * @param {string} startDate - 开始日期
   * @param {number} days - 天数
   * @returns {Array} 日期数组
   */
  generateDateRange(startDate, days) {
    const result = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      result.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }

  /**
   * 计算两个日期之间的天数
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {number} 天数差
   */
  daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 生成每日预测概率数据
   * @param {Array} predictionData - 预测数据
   * @param {string} startDate - 开始日期
   * @param {number} days - 预测天数
   * @returns {Array} 处理后的数据
   */
  generateDailyPredictionData(predictionData, startDate, days) {
    console.log('生成每日预测概率数据:', { predictionData, startDate, days });
    
    if (!predictionData || predictionData.length === 0) {
      console.log('预测数据为空，生成示例数据');
      return this.generateExamplePredictionData('DEMO_SKU_001', this.generateDateRange(startDate, days));
    }

    // 直接使用预测数据，按 target_date 分组
    const result = predictionData.map(item => {
      const date = item.target_date; // 使用 target_date 作为预测日期
      const probability = parseFloat(item.prediction_probability || item.probability || 0);
      console.log(`处理预测数据: ${date} -> ${probability}`);
      return {
        date,
        probability: probability,
        label: probability > 0.5 ? '上涨' : '下跌'
      };
    }).filter(item => item.date); // 过滤掉没有日期的数据

    console.log('生成的每日预测数据:', result);
    return result;
  }

  /**
   * 生成示例预测数据
   * @param {string} skuId - SKU ID
   * @param {Array} dateRange - 日期范围
   * @returns {Array} 示例数据
   */
  generateExamplePredictionData(skuId, dateRange) {
    const result = [];
    
    dateRange.forEach((date, index) => {
      const probability = 0.3 + Math.random() * 0.4; // 0.3 到 0.7 之间
      result.push({
        date,
        probability,
        label: probability > 0.5 ? '上涨' : '下跌'
      });
    });
    
    return result;
  }

  /**
   * 生成示例价格数据
   * @param {string} skuId - SKU ID
   * @param {string} startDate - 开始日期
   * @param {number} days - 天数
   * @returns {Array} 示例价格数据
   */
  generateExamplePriceData(skuId, startDate, days) {
    const result = [];
    const basePrice = Math.floor(Math.random() * 500) + 100; // 100 到 600 之间的基础价格
    const dateRange = this.generateDateRange(startDate, days);
    
    dateRange.forEach((date, index) => {
      const priceChange = (Math.random() - 0.5) * 20; // -10 到 +10 的价格变动
      const price = Math.max(50, basePrice + priceChange * (index + 1) * 0.1);
      
      result.push({
        date,
        price: Math.round(price * 100) / 100,
        sku_id: skuId
      });
    });
    
    return result;
  }

  /**
   * 生成示例未来价格数据
   * @param {string} skuId - SKU ID
   * @param {Array} dateRange - 日期范围
   * @returns {Array} 示例未来价格数据
   */
  generateExampleFuturePriceData(skuId, dateRange) {
    const result = [];
    const basePrice = Math.floor(Math.random() * 500) + 100; // 100 到 600 之间的基础价格

    dateRange.forEach((date, index) => {
      const priceChange = (Math.random() - 0.5) * 30; // -15 到 +15 的价格变动
      const price = Math.max(50, basePrice + priceChange);
      
      result.push({
        date,
        price: Math.round(price * 100) / 100,
        sku_id: skuId
      });
    });
    
    return result;
  }

  /**
   * 生成标签对比数据
   * @param {Array} predictionData - 预测数据
   * @param {Array} futurePriceData - 未来价格数据
   * @param {Array} historicalPriceData - 历史价格数据
   * @param {number} changeThreshold - 变动阈值，默认0.05 (5%)
   * @returns {Array} 标签对比数据
   */
  generateLabelComparisonData(predictionData, futurePriceData, historicalPriceData, changeThreshold = 0.05) {
    console.log('生成标签对比数据:', { 
      predictionData: predictionData?.length, 
      futurePriceData: futurePriceData?.length,
      historicalPriceData: historicalPriceData?.length 
    });

    if (!Array.isArray(predictionData) || predictionData.length === 0) {
      console.log('预测数据为空，返回空数组');
      return [];
    }

    // 创建价格映射
    const priceMap = {};
    
    // 添加历史价格数据
    if (Array.isArray(historicalPriceData) && historicalPriceData.length > 0) {
      historicalPriceData.forEach(item => {
        if (item && item.date && item.price !== undefined) {
          priceMap[item.date] = parseFloat(item.price);
        }
      });
    }
    
    // 添加未来价格数据
    if (Array.isArray(futurePriceData) && futurePriceData.length > 0) {
      futurePriceData.forEach(item => {
        if (item && item.date && item.price !== undefined) {
          priceMap[item.date] = parseFloat(item.price);
        }
      });
    }

    console.log('价格映射:', priceMap);

    const result = [];
    
    predictionData.forEach(prediction => {
      if (!prediction) return;
      
      const targetDate = prediction.target_date; // 使用正确的字段名
      const probability = parseFloat(prediction.prediction_probability || 0); // 使用正确的字段名
      
      if (!targetDate) {
        console.log('跳过无日期的预测数据:', prediction);
        return;
      }

      // 获取预测标签
      const predictedLabel = probability > 0.5 ? 1 : 0; // 1表示上涨，0表示下跌
      
      // 获取实际价格
      const actualPrice = priceMap[targetDate];
      
      // 计算实际标签（需要前一天的价格来比较）
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const prevPrice = priceMap[prevDateStr];
      
      let actualLabel = null;
      let actualPriceChange = 0;
      
      if (actualPrice !== undefined && prevPrice !== undefined && !isNaN(actualPrice) && !isNaN(prevPrice)) {
        actualPriceChange = ((actualPrice - prevPrice) / prevPrice);
        // 使用变动阈值判断：如果价格变动的绝对值超过阈值，则标记为"变动"(1)，否则为"不变动"(0)
        actualLabel = Math.abs(actualPriceChange) > changeThreshold ? 1 : 0;
      }
      
      const isCorrect = actualLabel !== null ? (predictedLabel === actualLabel) : null;

      console.log(`日期 ${targetDate} 的对比数据:`, {
        '预测概率': probability,
        '预测标签': predictedLabel,
        '实际价格': actualPrice,
        '实际标签': actualLabel,
        '预测正确': isCorrect,
        '价格映射中的值': priceMap[targetDate],
        '所有可用日期': Object.keys(priceMap)
      });

      result.push({
        date: targetDate,
        predictedLabel: predictedLabel,
        actualLabel: actualLabel !== null ? actualLabel : 'N/A',
        isCorrect: isCorrect, // 保持null值，不强制转换为false
        probability: probability,
        actualPrice: actualPrice !== undefined ? actualPrice : null,
        actualPriceChange: actualPriceChange
      });
    });

    console.log('生成的标签对比数据:', result);
    return result;
  }

  /**
   * 计算准确率统计
   * @param {Array} labelComparisonData - 标签对比数据
   * @returns {Object} 准确率统计
   */
  calculateAccuracyStats(labelComparisonData) {
    if (!labelComparisonData || labelComparisonData.length === 0) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        upPredictions: 0,
        downPredictions: 0,
        upAccuracy: 0,
        downAccuracy: 0
      };
    }

    const validPredictions = labelComparisonData.filter(item => 
      item.isCorrect !== null && item.actualLabel !== 'N/A'
    );

    const totalPredictions = validPredictions.length;
    const correctPredictions = validPredictions.filter(item => item.isCorrect).length;
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

    const upPredictions = validPredictions.filter(item => item.predictedLabel === 1);
    const downPredictions = validPredictions.filter(item => item.predictedLabel === 0);

    const upCorrect = upPredictions.filter(item => item.isCorrect).length;
    const downCorrect = downPredictions.filter(item => item.isCorrect).length;

    const upAccuracy = upPredictions.length > 0 ? (upCorrect / upPredictions.length) * 100 : 0;
    const downAccuracy = downPredictions.length > 0 ? (downCorrect / downPredictions.length) * 100 : 0;

    return {
      totalPredictions,
      correctPredictions,
      accuracy: Math.round(accuracy * 100) / 100,
      upPredictions: upPredictions.length,
      downPredictions: downPredictions.length,
      upAccuracy: Math.round(upAccuracy * 100) / 100,
      downAccuracy: Math.round(downAccuracy * 100) / 100
    };
  }

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
    
    const filledData = [];
    let lastPrice = null;
    let lastItem = null;

    dateRange.forEach(date => {
      const existingItem = sortedData.find(item => item.date === date);
      
      if (existingItem) {
        filledData.push(existingItem);
        lastPrice = existingItem.price;
        lastItem = existingItem;
      } else if (lastPrice !== null) {
        // 前向填充
        filledData.push({
          ...lastItem,
          date: date,
          price: lastPrice
        });
      }
    });

    return filledData;
  }

  /**
   * 处理数据的主函数
   * @param {Array} predictions - 预测数据
   * @param {Array} historical - 历史价格数据
   * @param {Array} future - 未来价格数据
   * @param {number} changeThreshold - 变动阈值，默认0.05 (5%)
   * @returns {Object} 处理后的所有数据
   */
  processData(predictions, historical, future, changeThreshold = 0.05) {
    console.log('开始处理数据:', { 
      predictions: predictions?.length, 
      historical: historical?.length, 
      future: future?.length 
    });

    // 确定日期范围 - 从预测数据中动态获取
    let startDate = null;
    let days = 0;
    
    if (predictions && predictions.length > 0) {
      const dates = predictions.map(p => p.target_date).filter(Boolean);
      if (dates.length > 0) {
        const sortedDates = dates.sort();
        startDate = sortedDates[0];
        days = sortedDates.length;
      }
    }
    
    // 如果没有预测数据，使用默认值
    if (!startDate) {
      startDate = new Date().toISOString().split('T')[0];
      days = 1;
    }

    // 生成每日预测数据
    const dailyPredictionData = this.generateDailyPredictionData(predictions, startDate, days);
    
    // 生成标签对比数据
    const labelComparisonData = this.generateLabelComparisonData(predictions, future, historical, changeThreshold);
    
    // 计算准确率统计
    const accuracyStats = this.calculateAccuracyStats(labelComparisonData);

    const result = {
      dailyPredictionData,
      labelComparisonData,
      accuracyStats,
      metadata: {
        startDate,
        days,
        totalPredictions: predictions?.length || 0,
        totalHistorical: historical?.length || 0,
        totalFuture: future?.length || 0
      }
    };

    console.log('数据处理完成:', result);
    return result;
  }
}

// 创建单例实例
const dataProcessor = new DataProcessor();

export default dataProcessor;