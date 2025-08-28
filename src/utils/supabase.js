import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = 'https://fhqfmtdcxarbnowkgnqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZocWZtdGRjeGFyYm5vd2tnbnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTcwNDYsImV4cCI6MjA3MTQzMzA0Nn0.inuDMNeP6RQBfZ_-3Xji_GiNbcJe-ePYBu3Lc8apEnw';

// 创建Supabase客户端实例
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase工具类
 */
const supabaseUtils = {
  
  /**
   * 查询商品在指定日期的预测结果
   * @param {string} skuId - 商品ID
   * @param {string} date - 预测日期
   * @param {number} predictionStep - 预测步长
   * @returns {Promise<Object>} - 预测结果
   */
  async fetchPredictionResults(skuId, date, predictionStep) {
    try {
      // 计算开始日期和结束日期
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + predictionStep);
      
      // 格式化日期
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // 查询预测结果
      const { data, error } = await supabaseClient
        .from('result')
        .select('*')
        .eq('sku_id', skuId)
        .gte('prediction_date', formattedStartDate)
        .lte('target_date', formattedEndDate)
        .eq('prediction_step', predictionStep);
      
      if (error) {
        throw error;
      }
      
      return { data };
    } catch (error) {
      console.error('查询预测结果失败:', error);
      return { error };
    }
  },
  
  /**
   * 查询商品在指定日期范围内的所有预测结果
   * @param {string} skuId - 商品ID
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Promise<Object>} - 预测结果
   */
  async fetchPredictionResultsForDateRange(skuId, startDate, endDate) {
    try {
      // 查询预测结果
      const { data, error } = await supabaseClient
        .from('result')
        .select('*')
        .eq('sku_id', skuId)
        .gte('target_date', startDate)
        .lte('target_date', endDate);
      
      if (error) {
        throw error;
      }
      
      return { data };
    } catch (error) {
      console.error('查询预测结果失败:', error);
      return { error };
    }
  },
  
  /**
   * 查询商品的历史价格数据
   * @param {string} skuId - 商品ID
   * @param {string} date - 日期
   * @returns {Promise<Object>} - 历史价格数据
   */
  async fetchHistoricalPrices(skuId, date) {
    try {
      // 计算90天前的日期
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - 90);
      
      // 计算去年同期的日期范围
      const lastYearStartDate = new Date(date);
      lastYearStartDate.setFullYear(lastYearStartDate.getFullYear() - 1);
      lastYearStartDate.setDate(lastYearStartDate.getDate() - 30);
      
      const lastYearEndDate = new Date(date);
      lastYearEndDate.setFullYear(lastYearEndDate.getFullYear() - 1);
      
      // 格式化日期
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedLastYearStartDate = lastYearStartDate.toISOString().split('T')[0];
      const formattedLastYearEndDate = lastYearEndDate.toISOString().split('T')[0];
      
      // 查询近90天的数据
      // 查询近90天的数据
      const { data: recentData, error: recentError } = await supabaseClient
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .gte('date', formattedStartDate)
        .lte('date', date)
        .order('date', { ascending: true });
      
      if (recentError) {
        throw recentError;
      }
      
      // 查询去年同期的数据
      const { data: lastYearData, error: lastYearError } = await supabaseClient
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .gte('date', formattedLastYearStartDate)
        .lte('date', formattedLastYearEndDate)
        .order('date', { ascending: true });
      
      if (lastYearError) {
        throw lastYearError;
      }
      
      return { recentData, lastYearData };
    } catch (error) {
      console.error('查询历史价格数据失败:', error);
      return { error };
    }
  },
  
  /**
   * 查询商品在指定日期范围内的价格数据
   * @param {string} skuId - 商品ID
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Promise<Object>} - 价格数据
   */
  async fetchPricesForDateRange(skuId, startDate, endDate) {
    try {
      // 查询价格数据
      // 查询价格数据
      const { data, error } = await supabaseClient
        .from('real')
        .select('*')
        .eq('sku_id', skuId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return { data };
    } catch (error) {
      console.error('查询价格数据失败:', error);
      return { error };
    }
  },
  
  /**
   * 批量查询多个商品的预测结果
   * @param {Array} skuIds - 商品ID数组
   * @param {string} date - 预测日期
   * @param {number} predictionStep - 预测步长
   * @returns {Promise<Object>} - 预测结果
   */
  async batchFetchPredictionResults(skuIds, date, predictionStep) {
    try {
      const results = {};
      
      for (const skuId of skuIds) {
        const result = await supabaseUtils.fetchPredictionResults(skuId, date, predictionStep);
        results[skuId] = result;
      }
      
      return results;
    } catch (error) {
      console.error('批量查询预测结果失败:', error);
      return { error };
    }
  },
  
  /**
   * 生成预测结果
   * @param {string} skuId - 商品ID
   * @param {string} date - 预测日期
   * @param {number} predictionStep - 预测步长
   * @returns {Promise<Object>} - 预测结果
   */
  async generatePredictionResults(skuId, date, predictionStep) {
    // 这里是第二阶段开发的内容，暂时返回空结果
    return { data: [] };
  }
};

// 导出Supabase客户端实例和工具函数
export default supabaseClient;
export { supabaseUtils };
