import * as echarts from 'echarts';

/**
 * 图表工具类
 * 提供创建各种图表的方法
 */
const chartUtils = {
  /**
   * 安全地获取DOM元素并初始化图表
   */
  safeInitChart(elementId) {
    try {
      const chartDom = document.getElementById(elementId);
      if (!chartDom) {
        console.warn(`Chart container with id "${elementId}" not found`);
        return null;
      }
      
      if (!document.body.contains(chartDom)) {
        console.warn(`Chart container "${elementId}" is not in the DOM`);
        return null;
      }
      
      if (chartDom.offsetWidth === 0 || chartDom.offsetHeight === 0) {
        console.warn(`Chart container "${elementId}" has no dimensions`);
        return null;
      }
      
      // 安全检查 getBoundingClientRect 方法
      let rect = null;
      try {
        if (typeof chartDom.getBoundingClientRect === 'function') {
          rect = chartDom.getBoundingClientRect();
        }
      } catch (rectError) {
        console.warn(`getBoundingClientRect failed for "${elementId}":`, rectError);
        // 继续执行，不阻止图表创建
      }
      
      if (rect && (rect.width === 0 || rect.height === 0)) {
        console.warn(`Chart container "${elementId}" has invalid bounding rect`);
        return null;
      }
      
      echarts.dispose(chartDom);
      const myChart = echarts.init(chartDom);
      return { chartDom, myChart };
    } catch (error) {
      console.error(`Failed to initialize chart for "${elementId}":`, error);
      return null;
    }
  },

  /**
   * 格式化日期范围显示
   */
  formatDateRange(startDate, endDate) {
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    };
    return `${formatDate(startDate)} 至 ${formatDate(endDate)}`;
  },

  /**
   * 创建近90天价格走势图
   */
  createRecentPriceChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
      
      let maxDate = new Date();
      if (predictionData && predictionData.length > 0) {
        const predictionDate = new Date(predictionData[0].prediction_date);
        maxDate = new Date(predictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      } else if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      const ninetyDaysAgo = new Date(maxDate);
      ninetyDaysAgo.setDate(maxDate.getDate() - 90);
      
      const recentData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= ninetyDaysAgo && itemDate <= maxDate;
      });
      
      const dateRange = this.formatDateRange(ninetyDaysAgo, maxDate);
      
      const option = {
        title: {
          text: `近90天价格走势 (${dateRange})`,
          left: 'center',
          textStyle: {
            fontSize: 14,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function(params) {
            const date = new Date(params[0].axisValue);
            const formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
            let result = formattedDate + '<br/>';
            params.forEach(param => {
              result += `价格: ¥${param.value[1]}<br/>`;
            });
            return result;
          }
        },
        legend: {
          data: ['近90天价格'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          min: ninetyDaysAgo.getTime(),
          max: maxDate.getTime(),
          axisLabel: {
            formatter: function(value) {
              return echarts.format.formatTime('MM-dd', value);
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '价格 (¥)',
          nameTextStyle: {
            color: '#666'
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: 0,
            end: 100,
            bottom: '10%'
          },
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: '近90天价格',
            type: 'line',
            data: recentData.map(item => [item.date, item.price]),
            smooth: true,
            showSymbol: false,
            lineStyle: {
              width: 2,
              color: '#1890ff'
            },
            areaStyle: {
              opacity: 0.2,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(24,144,255,0.3)' },
                { offset: 1, color: 'rgba(24,144,255,0.1)' }
              ])
            }
          }
        ]
      };
      
      myChart.setOption(option);
      return myChart;
    } catch (error) {
      console.error('Error creating recent price chart:', error);
      return null;
    }
  },

  /**
   * 创建去年同期30天价格走势图
   */
  createLastYearPriceChart(elementId, priceData, predictionData = [], probabilityThreshold = 0.5, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 安全处理预测数据
      if (!Array.isArray(priceData) || priceData.length === 0) {
        console.warn('Price data is empty or invalid');
        return null;
      }

      const predictionDates = predictionData && Array.isArray(predictionData) 
        ? [...new Set(predictionData.map(item => item.target_date).filter(Boolean))]
        : [];
      
      let maxDate = new Date();
      if (predictionData && predictionData.length > 0) {
        const predictionDate = new Date(predictionData[0].prediction_date);
        maxDate = new Date(predictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      } else if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      const lastYearEnd = new Date(maxDate);
      lastYearEnd.setFullYear(maxDate.getFullYear() - 1);
      
      const lastYearStart = new Date(lastYearEnd);
      lastYearStart.setDate(lastYearEnd.getDate() - 29);
      
      const lastYearData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= lastYearStart && itemDate <= lastYearEnd;
      });
      
      const dateRange = this.formatDateRange(lastYearStart, lastYearEnd);
      const year = lastYearStart.getFullYear();
      
      const option = {
        title: {
          text: `去年同期30天价格走势 (${year}年 ${dateRange})`,
          left: 'center',
          textStyle: {
            fontSize: 14,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function(params) {
            const date = new Date(params[0].axisValue);
            const formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
            let result = formattedDate + '<br/>';
            params.forEach(param => {
              result += `价格: ¥${param.value[1]}<br/>`;
            });
            return result;
          }
        },
        legend: {
          data: ['去年同期价格'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          min: lastYearStart.getTime(),
          max: lastYearEnd.getTime(),
          axisLabel: {
            formatter: function(value) {
              return echarts.format.formatTime('MM-dd', value);
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '价格 (¥)',
          nameTextStyle: {
            color: '#666'
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: 0,
            end: 100,
            bottom: '10%'
          },
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: '去年同期价格',
            type: 'line',
            data: lastYearData.map(item => [item.date, item.price]),
            smooth: true,
            showSymbol: false,
            lineStyle: {
              width: 2,
              color: '#722ed1',
              type: 'dashed'
            },
            areaStyle: {
              opacity: 0.2,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(114,46,209,0.3)' },
                { offset: 1, color: 'rgba(114,46,209,0.1)' }
              ])
            }
          }
        ]
      };
      
      myChart.setOption(option);
      return myChart;
    } catch (error) {
      console.error('Error creating last year price chart:', error);
      return null;
    }
  },

  /**
   * 创建每日预测概率图表（带概率曲线）
   */
  createDailyPredictionChart(elementId, predictionData, probabilityThreshold = 0.5) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 确保 predictionData 存在且有数据
      if (!Array.isArray(predictionData) || predictionData.length === 0) {
        console.warn('No prediction data available for daily chart');
        return null;
      }

      console.log('=== 每日预测概率图表数据处理 ===');
      console.log('输入数据:', predictionData);

      // 处理每日预测数据，确保数据格式正确
      const dailyData = predictionData.map(item => {
        const date = item.date || item.target_date;
        const probability = parseFloat(item.probability) || 0;
        console.log('处理单条数据:', { 
          原始: item, 
          日期: date, 
          概率: probability 
        });
        return [date, probability];
      }).filter(item => item[0] && !isNaN(item[1]) && item[1] >= 0);

      console.log('处理后的数据:', dailyData);

      if (dailyData.length === 0) {
        console.error('❌ 没有有效的每日预测数据');
        return null;
      } else {
        console.log('✅ 每日预测数据处理成功，共', dailyData.length, '条');
      }
      
      const option = {
        title: {
          text: '每日预测概率',
          left: 'center',
          textStyle: {
            fontSize: 14,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function(params) {
            const date = new Date(params[0].axisValue);
            const formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
            let result = formattedDate + '<br/>';
            params.forEach(param => {
              result += `预测概率: ${(param.value[1] * 100).toFixed(1)}%<br/>`;
            });
            return result;
          }
        },
        legend: {
          data: ['预测概率'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLabel: {
            formatter: function(value) {
              return echarts.format.formatTime('MM-dd', value);
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '概率',
          min: 0,
          max: 1,
          axisLabel: {
            formatter: function(value) {
              return (value * 100).toFixed(0) + '%';
            }
          },
          nameTextStyle: {
            color: '#666'
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: 0,
            end: 100,
            bottom: '10%'
          },
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: '预测概率',
            type: 'line',
            data: dailyData,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            lineStyle: {
              width: 3,
              color: '#52c41a'
            },
            itemStyle: {
              color: '#52c41a'
            },
            areaStyle: {
              opacity: 0.3,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(82,196,26,0.4)' },
                { offset: 1, color: 'rgba(82,196,26,0.1)' }
              ])
            },
            markLine: {
              data: [
                {
                  yAxis: probabilityThreshold || 0.5,
                  name: '概率阈值',
                  lineStyle: {
                    color: '#ff4d4f',
                    type: 'dashed',
                    width: 2
                  },
                  label: {
                    show: true,
                    position: 'insideEndTop',
                    formatter: `阈值: ${((probabilityThreshold || 0.5) * 100).toFixed(0)}%`,
                    backgroundColor: 'rgba(255, 77, 79, 0.9)',
                    color: '#fff',
                    padding: [2, 6],
                    borderRadius: 3,
                    fontSize: 12
                  }
                }
              ]
            }
          }
        ]
      };
      
      myChart.setOption(option);
      return myChart;
    } catch (error) {
      console.error('Error creating daily prediction chart:', error);
      return null;
    }
  },

  /**
   * 创建预测标签对比图表（带连接线、准确率和缩放功能）
   */
  createLabelComparisonChart(elementId, comparisonData, accuracy = 0) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 安全处理对比数据
      if (!Array.isArray(comparisonData) || comparisonData.length === 0) {
        console.warn('No comparison data available for label chart');
        return null;
      }

      const predictionLabels = comparisonData.map((item, index) => [
        index,
        (item.predictedLabel === '变动' || item.predictedLabel === 1) ? 1 : 0,
        item.predictedLabel === 1 ? '变动' : (item.predictedLabel === 0 ? '不变动' : item.predictedLabel)
      ]);
      
      const actualLabels = comparisonData.map((item, index) => [
        index,
        (item.actualLabel === '变动' || item.actualLabel === 1) ? 1 : 0,
        item.actualLabel === 1 ? '变动' : (item.actualLabel === 0 ? '不变动' : (item.actualLabel || 'N/A'))
      ]);
      
      const option = {
        title: {
          text: `预测标签对比 (准确率: ${accuracy.toFixed(1)}%)`,
          left: 'center',
          textStyle: {
            fontSize: 14,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function(params) {
            const index = params[0].dataIndex;
            const item = comparisonData[index];
            const date = new Date(item.date);
            const formattedDate = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
            let result = formattedDate + '<br/>';
            params.forEach(param => {
              result += `${param.seriesName}: ${param.value[2]}<br/>`;
            });
            result += `预测结果: ${item.isCorrect ? '正确' : '错误'}<br/>`;
            return result;
          }
        },
        legend: {
          data: ['预测标签', '实际标签'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: comparisonData.map((item, index) => `第${index + 1}天`),
          axisLabel: {
            interval: 0,
            rotate: 45
          }
        },
        yAxis: {
          type: 'value',
          min: -0.1,
          max: 1.1,
          axisLabel: {
            show: true,
            formatter: function(value) {
              if (value === 0) return '不变';
              if (value === 1) return '变';
              return '';
            },
            margin: 16,
            fontSize: 12,
            color: '#666'
          },
          axisTick: {
            show: true,
            alignWithLabel: true
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#f0f0f0',
              type: 'dashed'
            }
          },
          data: [0, 1],
          axisTick: {
            show: true
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#e0e0e0'
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#f0f0f0',
              type: 'dashed'
            }
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: 0,
            end: 100,
            bottom: '5%'
          },
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: '预测标签',
            type: 'line',
            data: predictionLabels,
            step: 'middle',
            lineStyle: {
              width: 3,
              color: '#1890ff'
            },
            itemStyle: {
              color: '#1890ff',
              borderWidth: 2,
              borderColor: '#fff'
            },
            symbolSize: 8,
            showSymbol: true
          },
          {
            name: '实际标签',
            type: 'line',
            data: actualLabels,
            step: 'middle',
            lineStyle: {
              width: 3,
              color: '#52c41a'
            },
            itemStyle: {
              color: '#52c41a',
              borderWidth: 2,
              borderColor: '#fff'
            },
            symbolSize: 8,
            showSymbol: true
          }
        ]
      };
      
      myChart.setOption(option);
      return myChart;
    } catch (error) {
      console.error('Error creating label comparison chart:', error);
      return null;
    }
  }
};

export default chartUtils;