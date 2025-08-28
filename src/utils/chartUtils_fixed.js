import * as echarts from 'echarts';

/**
 * 图表工具类
 * 提供创建各种图表的方法
 */
const chartUtils = {
  /**
   * 安全地获取DOM元素并初始化图表
   * @param {string} elementId - 图表容器ID
   * @returns {Object|null} 包含chartDom和myChart的对象，或null
   */
  safeInitChart(elementId) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) {
      console.warn(`Chart container with id "${elementId}" not found`);
      return null;
    }
    
    // 检查元素是否已经渲染并且有尺寸
    if (chartDom.offsetWidth === 0 || chartDom.offsetHeight === 0) {
      console.warn(`Chart container "${elementId}" has no dimensions`);
      return null;
    }
    
    try {
      const myChart = echarts.init(chartDom);
      return { chartDom, myChart };
    } catch (error) {
      console.error(`Failed to initialize chart for "${elementId}":`, error);
      return null;
    }
  },

  /**
   * 格式化日期范围显示
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {string} 格式化的日期范围
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
   * @param {string} elementId - 图表容器ID
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {Object} organizedPriceData - 组织后的价格数据
   * @returns {echarts.ECharts} 图表实例
   */
  createRecentPriceChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 找出预测日期
      const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
      
      // 计算横坐标的最大日期（预测日期的前一天）
      let maxDate = new Date();
      if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      // 计算近90天的开始日期
      const ninetyDaysAgo = new Date(maxDate);
      ninetyDaysAgo.setDate(maxDate.getDate() - 90);
      
      // 过滤近90天数据
      const recentData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= ninetyDaysAgo && itemDate <= maxDate;
      });
      
      // 准备预测点数据
      const predictionPoints = predictionData.map(item => [
        item.target_date,
        item.predicted_price,
        item.probability >= probabilityThreshold ? '高概率' : '低概率'
      ]);
      
      // 格式化标题日期范围
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
            let result = params[0].axisValueLabel + '<br/>';
            params.forEach(param => {
              if (param.seriesName === '预测点') {
                result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
                result += `概率等级: ${param.value[2]}<br/>`;
              } else {
                result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
              }
            });
            return result;
          }
        },
        legend: {
          data: ['近90天价格', '预测点'],
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
          },
          {
            name: '预测点',
            type: 'scatter',
            data: predictionPoints,
            symbolSize: 8,
            itemStyle: {
              color: function(params) {
                return params.value[2] === '高概率' ? '#52c41a' : '#faad14';
              }
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
   * @param {string} elementId - 图表容器ID
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {Object} organizedPriceData - 组织后的价格数据
   * @returns {echarts.ECharts} 图表实例
   */
  createLastYearPriceChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 找出预测日期
      const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
      
      // 计算横坐标的最大日期（预测日期的前一天）
      let maxDate = new Date();
      if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      // 计算去年同期的日期范围 - 去年同期30天
      const lastYearEnd = new Date(maxDate);
      lastYearEnd.setFullYear(maxDate.getFullYear() - 1);
      
      const lastYearStart = new Date(lastYearEnd);
      lastYearStart.setDate(lastYearEnd.getDate() - 29); // 30天包括结束日期
      
      // 过滤去年同期数据
      const lastYearData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= lastYearStart && itemDate <= lastYearEnd;
      });
      
      // 格式化标题日期范围
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
            let result = params[0].axisValueLabel + '<br/>';
            params.forEach(param => {
              result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
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
   * 创建近1年价格走势图（长期预测用）
   * @param {string} elementId - 图表容器ID
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {Object} organizedPriceData - 组织后的价格数据
   * @returns {echarts.ECharts} 图表实例
   */
  createRecentYearChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 找出预测日期
      const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
      
      // 计算横坐标的最大日期（预测日期的前一天）
      let maxDate = new Date();
      if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      // 计算近1年的开始日期
      const oneYearAgo = new Date(maxDate);
      oneYearAgo.setFullYear(maxDate.getFullYear() - 1);
      
      // 过滤近1年数据
      const recentYearData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= oneYearAgo && itemDate <= maxDate;
      });
      
      // 准备预测点数据
      const predictionPoints = predictionData.map(item => [
        item.target_date,
        item.predicted_price,
        item.probability >= probabilityThreshold ? '高概率' : '低概率'
      ]);
      
      // 格式化标题日期范围
      const dateRange = this.formatDateRange(oneYearAgo, maxDate);
      
      const option = {
        title: {
          text: `近1年价格走势 (${dateRange})`,
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
            let result = params[0].axisValueLabel + '<br/>';
            params.forEach(param => {
              if (param.seriesName === '预测点') {
                result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
                result += `概率等级: ${param.value[2]}<br/>`;
              } else {
                result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
              }
            });
            return result;
          }
        },
        legend: {
          data: ['近1年价格', '预测点'],
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
          min: oneYearAgo.getTime(),
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
        series: [
          {
            name: '近1年价格',
            type: 'line',
            data: recentYearData.map(item => [item.date, item.price]),
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
          },
          {
            name: '预测点',
            type: 'scatter',
            data: predictionPoints,
            symbolSize: 8,
            itemStyle: {
              color: function(params) {
                return params.value[2] === '高概率' ? '#52c41a' : '#faad14';
              }
            }
          }
        ]
      };
      
      myChart.setOption(option);
      return myChart;
    } catch (error) {
      console.error('Error creating recent year chart:', error);
      return null;
    }
  },

  /**
   * 创建1年前历史价格走势图（长期预测用）
   * @param {string} elementId - 图表容器ID
   * @param {Array} priceData - 价格数据
   * @param {Array} predictionData - 预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @param {Object} organizedPriceData - 组织后的价格数据
   * @returns {echarts.ECharts} 图表实例
   */
  createPreviousYearChart(elementId, priceData, predictionData, probabilityThreshold, organizedPriceData = null) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 找出预测日期
      const predictionDates = [...new Set(predictionData.map(item => item.target_date))];
      
      // 计算横坐标的最大日期（预测日期的前一天）
      let maxDate = new Date();
      if (predictionDates.length > 0) {
        const firstPredictionDate = new Date(Math.min(...predictionDates.map(d => new Date(d))));
        maxDate = new Date(firstPredictionDate);
        maxDate.setDate(maxDate.getDate() - 1);
      }
      
      // 计算1年前的日期范围
      const twoYearsAgo = new Date(maxDate);
      twoYearsAgo.setFullYear(maxDate.getFullYear() - 2);
      
      const oneYearAgo = new Date(maxDate);
      oneYearAgo.setFullYear(maxDate.getFullYear() - 1);
      
      // 过滤1年前的数据
      const previousYearData = priceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= twoYearsAgo && itemDate < oneYearAgo;
      });
      
      // 格式化标题日期范围
      const dateRange = this.formatDateRange(twoYearsAgo, oneYearAgo);
      const year = twoYearsAgo.getFullYear();
      
      const option = {
        title: {
          text: `1年前历史价格走势 (${year}年 ${dateRange})`,
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
            let result = params[0].axisValueLabel + '<br/>';
            params.forEach(param => {
              result += `${param.seriesName}: ¥${param.value[1]}<br/>`;
            });
            return result;
          }
        },
        legend: {
          data: ['1年前价格'],
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
          min: twoYearsAgo.getTime(),
          max: oneYearAgo.getTime(),
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
        series: [
          {
            name: '1年前价格',
            type: 'line',
            data: previousYearData.map(item => [item.date, item.price]),
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
      console.error('Error creating previous year chart:', error);
      return null;
    }
  },

  /**
   * 创建每日预测图表 - 时间序列线图
   * @param {string} elementId - 图表容器ID
   * @param {Array} dailyPredictions - 每日预测数据
   * @param {number} probabilityThreshold - 概率阈值
   * @returns {echarts.ECharts} 图表实例
   */
  createDailyPredictionChart(elementId, dailyPredictions, probabilityThreshold) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 准备数据 - 按日期排序
      dailyPredictions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const dates = dailyPredictions.map(item => item.date);
      const probabilities = dailyPredictions.map(item => item.latestPrediction.prediction_probability);
      
      const option = {
        title: {
          text: '预测时间段内每日预测概率',
          left: 'center',
          textStyle: {
            fontWeight: 'normal',
            fontSize: 16,
            color: '#333'
          },
          subtext: '按时间序列展示预测出的该商品每日变化概率'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985'
            }
          },
          formatter: function(params) {
            const date = params[0].name;
            const probability = params[0].value;
            const willChange = probability > probabilityThreshold;
            
            return `
              <div style="font-weight:bold;margin-bottom:5px;">${date}</div>
              <div>预测概率: ${(probability * 100).toFixed(2)}%</div>
              <div style="color:${willChange ? '#ff4d4f' : '#52c41a'}">
                预测结果: ${willChange ? '价格变动' : '价格稳定'}
              </div>
            `;
          }
        },
        legend: {
          data: ['预测概率', '阈值线'],
          bottom: 0
        },
        grid: {
          top: '15%',
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: function(value) {
              return value.substring(5);
            },
            interval: 0,
            rotate: 45
          },
          splitLine: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: '#666'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '预测概率',
          min: 0,
          max: 1,
          axisLabel: {
            formatter: function(value) {
              return (value * 100).toFixed(0) + '%';
            }
          },
          splitLine: {
            lineStyle: {
              type: 'dashed',
              color: '#ddd'
            }
          }
        },
        series: [
          {
            name: '预测概率',
            type: 'line',
            data: probabilities.map((prob, index) => {
              const willChange = prob > probabilityThreshold;
              return {
                value: prob,
                itemStyle: {
                  color: willChange ? '#ff4d4f' : '#52c41a'
                },
                label: {
                  show: true,
                  position: 'top',
                  formatter: function(params) {
                    return `${(params.value * 100).toFixed(0)}%`;
                  },
                  fontSize: 12,
                  color: willChange ? '#ff4d4f' : '#52c41a'
                }
              };
            }),
            smooth: true,
            symbolSize: 8,
            lineStyle: {
              width: 3,
              color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
                { offset: 0, color: '#52c41a' },
                { offset: probabilityThreshold, color: '#52c41a' },
                { offset: probabilityThreshold, color: '#ff4d4f' },
                { offset: 1, color: '#ff4d4f' }
              ])
            },
            areaStyle: {
              opacity: 0.2,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255,77,79,0.3)' },
                { offset: 1, color: 'rgba(82,196,26,0.1)' }
              ])
            },
            markLine: {
              silent: true,
              lineStyle: {
                color: '#faad14',
                type: 'dashed',
                width: 2
              },
              data: [
                {
                  yAxis: probabilityThreshold,
                  label: {
                    formatter: `阈值: ${(probabilityThreshold * 100).toFixed(0)}%`,
                    position: 'start'
                  }
                }
              ]
            }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            start: 0,
            end: 100
          }
        ],
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: 'none'
            },
            saveAsImage: {}
          },
          right: 20
        }
      };
      
      myChart.setOption(option);
      
      // 响应窗口大小变化
      const resizeHandler = () => {
        if (myChart && !myChart.isDisposed()) {
          myChart.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);
      
      // 添加清理函数
      myChart._resizeHandler = resizeHandler;
      
      return myChart;
    } catch (error) {
      console.error('Error creating daily prediction chart:', error);
      return null;
    }
  },

  /**
   * 创建预测标签vs真实标签对比曲线图（包含预测概率）
   * @param {string} elementId - 图表容器ID
   * @param {Array} comparisonData - 对比数据
   * @returns {echarts.ECharts} 图表实例
   */
  createPredictionLabelComparisonChart(elementId, comparisonData) {
    const chartInit = this.safeInitChart(elementId);
    if (!chartInit) return null;
    
    const { myChart } = chartInit;
    
    try {
      // 按日期排序
      comparisonData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // 准备数据
      const dates = comparisonData.map(item => item.date);
      const predictedLabels = comparisonData.map(item => item.predicted ? 1 : 0);
      const actualLabels = comparisonData.map(item => item.actual !== null ? (item.actual ? 1 : 0) : null);
      const predictionProbabilities = comparisonData.map(item => item.predictionProbability * 100);
      
      // 计算准确率
      const validComparisons = comparisonData.filter(item => item.actual !== null);
      const accuracy = validComparisons.length > 0 
        ? validComparisons.filter(item => item.isCorrect).length / validComparisons.length 
        : 0;
      
      const option = {
        title: {
          text: `预测标签 vs 真实标签对比曲线 (准确率: ${(accuracy * 100).toFixed(2)}%)`,
          left: 'center',
          textStyle: {
            fontWeight: 'normal',
            fontSize: 16,
            color: '#333'
          },
          subtext: '1=变动, 0=不变'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          formatter: function(params) {
            const date = params[0].axisValue;
            const item = comparisonData.find(d => d.date === date);
            
            if (!item) return '';
            
            return `
              <div style="font-weight:bold;margin-bottom:5px;">${date}</div>
              <div style="color:#5470c6;">预测标签: ${item.predicted ? '变动(1)' : '不变(0)'}</div>
              <div style="color:#91cc75;">真实标签: ${item.actual !== null ? (item.actual ? '变动(1)' : '不变(0)') : '暂无数据'}</div>
              <div>预测概率: ${(item.predictionProbability * 100).toFixed(2)}%</div>
              ${item.actualChangePercentage !== null ? `<div>实际变动幅度: ${(item.actualChangePercentage * 100).toFixed(2)}%</div>` : ''}
              <div style="color:${item.isCorrect ? '#52c41a' : '#ff4d4f'}">
                ${item.isCorrect !== null ? (item.isCorrect ? '✓ 预测正确' : '✗ 预测错误') : '待验证'}
              </div>
            `;
          }
        },
        legend: {
          data: ['预测标签', '真实标签'],
          bottom: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: function(value) {
              return value.substring(5);
            },
            interval: 0,
            rotate: 45
          },
          splitLine: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: '#666'
            }
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '标签值',
            min: -0.1,
            max: 1.1,
            interval: 0.5,
            axisLabel: {
              formatter: function(value) {
                if (value === 0) return '不变(0)';
                if (value === 1) return '变动(1)';
                return value.toFixed(1);
              }
            },
            splitLine: {
              lineStyle: {
                type: 'dashed',
                color: '#ddd'
              }
            }
          },
          {
            type: 'value',
            name: '预测概率(%)',
            min: 0,
            max: 100,
            position: 'right',
            axisLabel: {
              formatter: '{value}%'
            },
            splitLine: {
              show: false
            }
          }
        ],
        series: [
          {
            name: '预测标签',
            type: 'line',
            data: predictedLabels,
            smooth: false,
            step: 'middle',
            symbolSize: 8,
            itemStyle: {
              color: '#5470c6'
            },
            lineStyle: {
              width: 3,
              color: '#5470c6'
            },
            label: {
              show: true,
              position: 'top',
              formatter: function(params) {
                return params.value === 1 ? '变动' : '不变';
              },
              fontSize: 10,
              color: '#5470c6'
            }
          },
          {
            name: '真实标签',
            type: 'line',
            data: actualLabels,
            smooth: false,
            step: 'middle',
            symbolSize: 8,
            itemStyle: {
              color: '#91cc75'
            },
            lineStyle: {
              width: 3,
              color: '#91cc75'
            },
            label: {
              show: true,
              position: 'bottom',
              formatter: function(params) {
                if (params.value === null) return '无数据';
                return params.value === 1 ? '变动' : '不变';
              },
              fontSize: 10,
              color: '#91cc75'
            },
            connectNulls: false
          },
          {
            name: '预测概率',
            type: 'line',
            yAxisIndex: 1,
            data: predictionProbabilities,
            smooth: true,
            symbolSize: 6,
            itemStyle: {
              color: '#faad14'
            },
            lineStyle: {
              width: 2,
              color: '#faad14',
              type: 'dashed'
            },
            label: {
              show: false
            }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            start: 0,
            end: 100
          }
        ],
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: 'none'
            },
            saveAsImage: {}
          },
          right: 20
        }
      };
      
      myChart.setOption(option);
      
      // 响应窗口大小变化
      const resizeHandler = () => {
        if (myChart && !myChart.isDisposed()) {
          myChart.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);
      
      // 添加清理函数
      myChart._resizeHandler = resizeHandler;
      
      return myChart;
    } catch (error) {
      console.error('Error creating prediction label comparison chart:', error);
      return null;
    }
  },

  /**
   * 安全地销毁图表实例
   * @param {echarts.ECharts} chart - 图表实例
   */
  disposeChart(chart) {
    if (chart && !chart.isDisposed()) {
      // 移除resize事件监听器
      if (chart._resizeHandler) {
        window.removeEventListener('resize', chart._resizeHandler);
      }
      chart.dispose();
    }
  },

  /**
   * 批量销毁图表实例
   * @param {Array} charts - 图表实例数组
   */
  disposeCharts(charts) {
    charts.forEach(chart => {
      this.disposeChart(chart);
    });
  },

  /**
   * 创建准确率图表
   * @param {HTMLElement} container - 图表容器
   * @param {Array} data - 准确率数据
   * @returns {Object} ECharts实例
   */
  createAccuracyChart(container, data) {
    if (!container) {
      console.warn('Chart container not found');
      return null;
    }
    
    // 检查元素是否已经渲染并且有尺寸
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Chart container has no dimensions');
      return null;
    }
    
    try {
      const chart = echarts.init(container);
      
      const option = {
        title: {
          text: '各商品预测准确率',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            const param = params[0];
            return `${param.name}: ${param.value !== null ? (param.value * 100).toFixed(2) + '%' : '无数据'}`;
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.map(item => item.skuId),
          axisLabel: {
            rotate: 45,
            fontSize: 12
          },
          name: '商品ID',
          nameLocation: 'middle',
          nameGap: 50
        },
        yAxis: {
          type: 'value',
          name: '准确率',
          min: 0,
          max: 1,
          axisLabel: {
            formatter: function(value) {
              return (value * 100).toFixed(0) + '%';
            }
          }
        },
        series: [
          {
            name: '准确率',
            type: 'bar',
            data: data.map(item => item.accuracy),
            itemStyle: {
              color: function(params) {
                // 根据准确率设置颜色
                const value = params.value;
                if (value === null || value === undefined) return '#d9d9d9';
                if (value >= 0.8) return '#52c41a';
                if (value >= 0.6) return '#faad14';
                return '#ff4d4f';
              }
            },
            label: {
              show: true,
              position: 'top',
              formatter: function(params) {
                if (params.value === null || params.value === undefined) {
                  return '无数据';
                }
                return (params.value * 100).toFixed(1) + '%';
              },
              fontSize: 10
            },
            barWidth: '60%'
          }
        ]
      };
      
      chart.setOption(option);
      
      // 响应窗口大小变化
      const resizeHandler = () => {
        if (chart && !chart.isDisposed()) {
          chart.resize();
        }
      };
      window.addEventListener('resize', resizeHandler);
      
      // 添加清理函数
      chart._resizeHandler = resizeHandler;
      
      return chart;
    } catch (error) {
      console.error('Error creating accuracy chart:', error);
      return null;
    }
  }
};

export default chartUtils;