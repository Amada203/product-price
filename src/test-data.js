import { supabase } from './lib/supabase';

// 测试数据连接和查询
export const testDataConnection = async () => {
  try {
    console.log('=== 测试 Supabase 数据连接 ===');
    
    // 1. 测试历史数据查询
    console.log('1. 查询历史数据...');
    const histResult = await supabase
      .from('real')
      .select('*')
      .eq('sku_id', 'DEMO_SKU_001')
      .order('date', { ascending: false })
      .limit(5);
    
    if (histResult.error) {
      console.error('历史数据查询失败:', histResult.error);
    } else {
      console.log('历史数据查询成功，最新5条记录:');
      histResult.data.forEach(item => {
        console.log(`  日期: ${item.date}, 价格: ${item.price}`);
      });
    }
    
    // 2. 测试预测数据查询
    console.log('2. 查询预测数据...');
    const predResult = await supabase
      .from('result')
      .select('*')
      .eq('sku_id', 'DEMO_SKU_001')
      .order('prediction_date', { ascending: false })
      .limit(5);
    
    if (predResult.error) {
      console.error('预测数据查询失败:', predResult.error);
    } else {
      console.log('预测数据查询成功，最新5条记录:');
      predResult.data.forEach(item => {
        console.log(`  预测日期: ${item.prediction_date}, 目标日期: ${item.target_date}, 步长: ${item.prediction_step}`);
      });
    }
    
    // 3. 查询可用的预测日期
    console.log('3. 查询可用的预测日期...');
    const datesResult = await supabase
      .from('result')
      .select('prediction_date')
      .eq('sku_id', 'DEMO_SKU_001')
      .order('prediction_date', { ascending: false });
    
    if (datesResult.error) {
      console.error('预测日期查询失败:', datesResult.error);
    } else {
      const uniqueDates = [...new Set(datesResult.data.map(item => item.prediction_date))];
      console.log('可用的预测日期:', uniqueDates.slice(0, 10));
    }
    
    return {
      historyCount: histResult.data?.length || 0,
      predictionCount: predResult.data?.length || 0,
      availableDates: datesResult.data ? [...new Set(datesResult.data.map(item => item.prediction_date))] : []
    };
    
  } catch (error) {
    console.error('数据连接测试失败:', error);
    return { error: error.message };
  }
};